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
var logger = utils.getLogger('instantiate-chaincode');

var util = require('util');
var path = require('path');
var fs = require('fs');

var Client = require('fabric-client');
var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');

//
// Construct instantiation or upgrade proposal
//
function buildChaincodeProposal(client, user_handle, chaincode_path, version, funcName, argList) {
	var tx_id = client.newTransactionID();

	// send proposal to endorser
	var request = {
		chaincodePath: chaincode_path,
		chaincodeId: Constants.CHAINCODE_ID,
		chaincodeVersion: version,
		fcn: funcName,
		args: argList,
		txId: tx_id,
		'endorsement-policy': Constants.TRANSACTION_ENDORSEMENT_POLICY
	};

	return request;
}

//
// Send request for chaincode instantiation on the channel to the orderer
//
function instantiateOrUpgradeChaincode(userOrg, chaincode_path, version, funcName, argList, upgrade, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	var ORGS = JSON.parse(fs.readFileSync(path.join(__dirname, Constants.networkConfig)))[Constants.networkId];

	var channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', Constants.CHANNEL_NAME);

	var targets = [];
	var type = 'instantiate';
	if(upgrade) type = 'upgrade';

	var client = new Client();
	var channel = client.newChannel(channel_name);
	var user_handle = null;
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

		client.setStateStore(store);
		return ClientUtils.getSubmitter(client, true /* use peer org admin*/, userOrg);

	}).then((admin) => {

		console.log('Successfully enrolled user \'admin\'');
		user_handle = admin;

		for(let org in ORGS) {
			if (ORGS[org].hasOwnProperty('peer1')) {
				let key = 'peer1';
				let data = fs.readFileSync(path.join(__dirname, ORGS[org][key]['tls_cacerts']));
				logger.debug(' create new peer %s', ORGS[org][key].requests);
				let peer = client.newPeer(
					ORGS[org][key].requests,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': ORGS[org][key]['server-hostname']
					}
				);

				targets.push(peer);
				channel.addPeer(peer);
			}
		}

		// an event listener can only register with a peer in its own org
		logger.debug(' create new eventhub %s', ORGS[userOrg]['peer1'].events);
		let data = fs.readFileSync(path.join(__dirname, ORGS[userOrg]['peer1']['tls_cacerts']));
		let eh = client.newEventHub();
		eh.setPeerAddr(
			ORGS[userOrg]['peer1'].events,
			{
				pem: Buffer.from(data).toString(),
				'ssl-target-name-override': ORGS[userOrg]['peer1']['server-hostname']
			}
		);
		eh.connect();
		ClientUtils.eventhubs.push(eh);

		// read the config block from the orderer for the channel
		// and initialize the verify MSPs based on the participating
		// organizations
		return channel.initialize();
	}, (err) => {

		console.log('Failed to enroll user \'admin\'. ' + err);
		throw new Error('Failed to enroll user \'admin\'. ' + err);

	}).then(() => {
		logger.debug(' orglist:: ', channel.getOrganizations());
		let request = buildChaincodeProposal(client, user_handle, chaincode_path, version, funcName, argList);
		tx_id = request.txId;
		if (upgrade) {
			logger.debug(util.format(
				'Upgrading chaincode "%s" at path "%s" to version "%s" by passing args "%s" to method "%s" in transaction "%s"',
				request.chaincodeId,
				request.chaincodePath,
				request.chaincodeVersion,
				request.args,
				request.fcn,
				request.txId.getTransactionID()
			));

			// This process could take a while, so we set a very long timeout
			return channel.sendUpgradeProposal(request, 300000);
		} else {
			// This process could take a while, so we set a very long timeout
			return channel.sendInstantiateProposal(request, 300000);
		}

	}, (err) => {

		console.log(util.format('Failed to initialize the channel. %s', err.stack ? err.stack : err));
		throw new Error('Failed to initialize the channel');

	}).then((results) => {

		var proposalResponses = results[0];

		var proposal = results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				one_good = true;
				logger.info(type +' proposal was good from peer %s', targets[i].getUrl());
			} else {
				logger.error(type +' proposal was bad from peer %s', targets[i].getUrl());
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			console.log('Successfully sent Proposal and received', proposalResponses.length, 'ProposalResponses');
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

					eh.registerTxEvent(deployId.toString(), (tx, code) => {
						console.log('The chaincode ' + type + ' transaction has been committed on peer '+ eh.getPeerAddr());
						clearTimeout(handle);
						eh.unregisterTxEvent(deployId);

						if (code !== 'VALID') {
							console.log('The chaincode ' + type + ' transaction was invalid, code = ' + code);
							reject();
						} else {
							console.log('The chaincode ' + type + ' transaction was valid.');
							resolve();
						}
					});
				});
				logger.debug('register eventhub %s with tx=%s',eh.getPeerAddr(),deployId);
				eventPromises.push(txPromise);
			});

			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises))
			.then((results) => {

				logger.debug('Transaction and event promises all complete');
				return results[0]; // just first results are from orderer, the rest are from the peer events

			}).catch((err) => {

				console.log('Failed to send ' + type + ' transaction and get notifications within the timeout period.');
				throw new Error('Failed to send ' + type + ' transaction and get notifications within the timeout period.');

			});

		} else {
			console.log('Failed to send ' + type + ' Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send ' + type + ' Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	}, (err) => {

		console.log('Failed to send ' + type + ' proposal due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send ' + type + ' proposal due to error: ' + err.stack ? err.stack : err);

	}).then((response) => {
		if (!(response instanceof Error) && response.status === 'SUCCESS') {
			console.log('Successfully sent ' + type + 'transaction to the orderer.');
			if (type === 'upgrade') {
				console.log('Successfully upgraded chaincode on channel');
			} else {
				console.log('Successfully instantiated chaincode on channel');
			}
			return true;
		} else {
			console.log('Failed to order the ' + type + 'transaction. Error code: ' + response.status);
			Promise.reject(new Error('Failed to order the ' + type + 'transaction. Error code: ' + response.status));
		}
	}, (err) => {

		console.log('Failed to send ' + type + ' due to error: ' + err.stack ? err.stack : err);
		Promise.reject(new Error('Failed to send instantiate due to error: ' + err.stack ? err.stack : err));
	});
};

module.exports.instantiateOrUpgradeChaincode = instantiateOrUpgradeChaincode;
