/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

'use strict';

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('E2E instantiate-chaincode');

var util = require('util');
var path = require('path');
var fs = require('fs');

var Constants = require('./constants.js');
var Client = require('fabric-client');
var ClientUtils = require('./clientUtils.js');

//
// Send chaincode invocation request to the orderer
//
// If 'userName' is not specified, we will default to 'admin' for the org 'userOrg'
function invokeChaincode(userOrg, version, funcName, argList, userName, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	var ORGS = JSON.parse(fs.readFileSync(path.join(__dirname, Constants.networkConfig)))[Constants.networkId];

	logger.debug('invokeChaincode begin');
	Client.setConfigSetting('request-timeout', 60000);
	var channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', Constants.CHANNEL_NAME);

	var targets = [];

	var client = new Client();
	var channel = client.newChannel(channel_name);
	var tx_id = null;

	var orgName = ORGS[userOrg].name;
	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: ClientUtils.storePathForOrg(orgName)}));
	client.setCryptoSuite(cryptoSuite);

	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, caRootsPath));
	let caroots = Buffer.from(data).toString();

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
		if (store) {
			client.setStateStore(store);
		}
		return ClientUtils.getSubmitter(client, false, userOrg, userName);
	}).then((user) => {

		if (userName) {
			console.log('Successfully enrolled user', userName);
		} else {
			console.log('Successfully enrolled user \'admin\'');
		}

		// set up the channel to use each org's 'peer1' for
		// both requests and events
		for (let key in ORGS) {
			if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
				let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
				let peer = client.newPeer(
					ORGS[key].peer1.requests,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': ORGS[key].peer1['server-hostname']
					}
				);
				channel.addPeer(peer);
				targets.push(peer);	// Just for logging purposes
			}
		}

		// an event listener can only register with a peer in its own org
		let data = fs.readFileSync(path.join(__dirname, ORGS[userOrg].peer1['tls_cacerts']));
		let eh = client.newEventHub();
		eh.setPeerAddr(
			ORGS[userOrg].peer1.events,
			{
				pem: Buffer.from(data).toString(),
				'ssl-target-name-override': ORGS[userOrg].peer1['server-hostname'],
				'grpc.http2.keepalive_time' : 15
			}
		);
		eh.connect();
		ClientUtils.eventhubs.push(eh);

		return channel.initialize();

	}).then((nothing) => {
		logger.debug(' orglist:: ', channel.getOrganizations());

		tx_id = client.newTransactionID();
		utils.setConfigSetting('E2E_TX_ID', tx_id.getTransactionID());
		logger.debug('setConfigSetting("E2E_TX_ID") = %s', tx_id.getTransactionID());

		// send proposal to endorser
		var request = {
			chaincodeId : Constants.CHAINCODE_ID,
			fcn: funcName,
			args: argList,
			txId: tx_id,
		};
		return channel.sendTransactionProposal(request);

	}, (err) => {
		var errMesg = 'Failed to get submitter ';
		if (userName) {
			errMesg = errMesg + userName + '. Error: ' + err;
		} else {
			errMesg = errMesg + 'admin. Error: ' + err;
		}
		console.log(errMesg);
		throw new Error(errMesg);
	}).then((results) =>{
		var proposalResponses = results[0];
		console.log('Received', proposalResponses.length, 'responses for proposed transaction');

		var proposal = results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if( proposal_response.response && proposal_response.response.status === 200) {
				console.log('transaction proposal has response status of good from peer', targets[i].getUrl());
				one_good = channel.verifyProposalResponse(proposal_response);
				if(one_good) {
					console.log(' transaction proposal signature and endorser are valid from peer', targets[i].getUrl());
				}
			} else {
				console.log('transaction proposal was bad from peer', targets[i].getUrl());
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			// check all the read/write sets to see if the same, verify that each peer
			// got the same results on the proposal
			all_good = channel.compareProposalResponseResults(proposalResponses);
			console.log('compareProposalResponseResults exection did not throw an error');
			if(all_good){
				console.log(' All proposals have matching read/writes sets');
			}
			else {
				console.log(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			console.log('Successfully sent Proposal and received ProposalResponse');
			logger.debug(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};

			// set the transaction listener and set a timeout of 30sec
			// if the transaction did not get committed within the timeout period, fail
			var deployId = tx_id.getTransactionID();

			var eventPromises = [];
			ClientUtils.eventhubs.forEach((eh) => {
				let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(reject, 300000);

					eh.registerTxEvent(deployId.toString(),
						(tx, code) => {
							clearTimeout(handle);
							eh.unregisterTxEvent(deployId);

							if (code !== 'VALID') {
								console.log('The transaction was invalid, code = ' + code);
								reject();
							} else {
								console.log('The transaction has been committed on peer '+ eh.getPeerAddr());
								resolve();
							}
						},
						(err) => {
							clearTimeout(handle);
							console.log('Successfully received notification of the event call back being cancelled for '+ deployId);
							resolve();
						}
					);
				});

				eventPromises.push(txPromise);
			});

			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises))
			.then((results) => {

				logger.debug(' transaction and event promises all complete');
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

			}).catch((err) => {

				console.log('Failed to send transaction and get notifications within the timeout period.');
				throw new Error('Failed to send transaction and get notifications within the timeout period.');

			});

		} else {
			console.log('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	}, (err) => {

		console.log('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);

	}).then((response) => {

		if (response.status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
			logger.debug('invokeChaincode end');
			return true;
		} else {
			console.log('Failed to order the transaction. Error code: ' + response.status);
			throw new Error('Failed to order the transaction. Error code: ' + response.status);
		}
		// all done, shutdown connections on all
		let peers = channel.getPeers();
		for(let i in peers) {
			let peer = peers[i];
			peer.close();
		}
		let orderers = channel.getOrderers();
		for(let i in orderers) {
			let orderer = orderers[i];
			orderer.close();
		}
	}, (err) => {

		console.log('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);

	});
};

module.exports.invokeChaincode = invokeChaincode;
