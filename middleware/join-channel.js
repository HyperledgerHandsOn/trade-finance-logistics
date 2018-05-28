/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('join-channel');

var util = require('util');
var path = require('path');
var fs = require('fs');

var Client = require('fabric-client');

var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');

var tx_id = null;

var allEventhubs = [];

//
// Send join requests for all peers in our network to the orderer
//
function processJoinChannel(constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
	var ORGS = Client.getConfigSetting(Constants.networkId);
	var PEER_ORGS = [];
	Object.keys(ORGS).forEach((org) => {
		if(org !== 'orderer') {
			PEER_ORGS.push(org);
		}
	})

	var joinPromises = [];
	PEER_ORGS.forEach((org) => {
		joinPromises.push(joinChannel);
	})
	// Join peers of each org to the channel in sequence
	return joinPromises.reduce(
		(promiseChain, currentFunction, currentIndex) =>
			promiseChain.then(() => {
				return currentFunction(PEER_ORGS[currentIndex], ORGS);
			}), Promise.resolve()
	).then(() => {
		cleanup();
	}, (err) => {
		console.log('Failed join attempt:', err);
		throw err;
	});
}

function joinChannel(org, ORGS, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	var channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', Constants.CHANNEL_NAME);
	console.log('Joining channel', channel_name);

	//
	// Create and configure the channel
	//
	var client = new Client();
	var channel = client.newChannel(channel_name);

	var orgName = ORGS[org].name;

	var targets = [];
	var eventhubs = [];

	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, caRootsPath));
	let caroots = Buffer.from(data).toString();
	var genesis_block = null;

	channel.addOrderer(
		client.newOrderer(
			ORGS.orderer.url,
			{
				'pem': caroots,
				'ssl-target-name-override': ORGS.orderer['server-hostname']
			}
		)
	);

	return Client.newDefaultKeyValueStore({
		path: ClientUtils.storePathForOrg(orgName)
	}).then((store) => {
		client.setStateStore(store);

		// get the peer org's admin required to send join channel requests
		client._userContext = null;

		return ClientUtils.getSubmitter(client, true /* get peer org admin */, org);
	}).then((admin) => {
		console.log('Successfully enrolled \'admin\' user for org', org);
		tx_id = client.newTransactionID();
		let request = {
			txId : 	tx_id
		};

		return channel.getGenesisBlock(request);
	}).then((block) =>{
		console.log('Successfully got the genesis block');
		genesis_block = block;

		for (let key in ORGS[org]) {
			if (ORGS[org].hasOwnProperty(key)) {
				if (key.indexOf('peer') === 0) {
					data = fs.readFileSync(path.join(__dirname, ORGS[org][key]['tls_cacerts']));
					targets.push(
						client.newPeer(
							ORGS[org][key].requests,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': ORGS[org][key]['server-hostname']
							}
						)
					);

					let eh = client.newEventHub();
					eh.setPeerAddr(
						ORGS[org][key].events,
						{
							pem: Buffer.from(data).toString(),
							'ssl-target-name-override': ORGS[org][key]['server-hostname']
						}
					);
					eh.connect();
					eventhubs.push(eh);
					allEventhubs.push(eh);
				}
			}
		}

		var eventPromises = [];
		eventhubs.forEach((eh) => {
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(reject, 40000);

				eh.registerBlockEvent((block) => {
					clearTimeout(handle);

					// in real-world situations, a peer may have more than one channel so
					// we must check that this block came from the channel we asked the peer to join
					if(block.data.data.length === 1) {
						// Config block must only contain one transaction
						var channel_header = block.data.data[0].payload.header.channel_header;
						if (channel_header.channel_id === channel_name) {
							console.log('The new channel has been successfully joined on peer '+ eh.getPeerAddr());
							resolve();
						}
						else {
							console.log('The new channel has not been succesfully joined');
							reject();
						}
					}
				});
			});

			eventPromises.push(txPromise);
		});
		tx_id = client.newTransactionID();
		let request = {
			targets : targets,
			block : genesis_block,
			txId : 	tx_id
		};
		let sendPromise = channel.joinChannel(request, 40000); 		// join channel takes longer then average
		return Promise.all([sendPromise].concat(eventPromises));	// return only after the block join event has been received (asynchronously)
	}, (err) => {
		console.log('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
	})
	.then((results) => {
		logger.debug(util.format('Join Channel R E S P O N S E : %j', results));

		if(results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
			console.log(util.format('Successfully joined peers in organization %s to join the channel', orgName));
		} else {
			console.log(' Failed to join channel');
			throw new Error('Failed to join channel');
		}
	}, (err) => {
		console.log('Failed to join channel due to error: ' + err.stack ? err.stack : err);
	});
}

// Cleanup opearations: for now, just unsubscribe the eventHub instances
function cleanup() {
	// Disconnect the event hub
	for(var key in allEventhubs) {
		var eventhub = allEventhubs[key];
		if (eventhub && eventhub.isconnected()) {
			logger.debug('Disconnecting the event hub');
			eventhub.disconnect();
		}
	}
}

module.exports.processJoinChannel = processJoinChannel;
module.exports.joinChannel = joinChannel;
module.exports.joinEventsCleanup = cleanup;
