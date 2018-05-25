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

// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('install-chaincode');

var util = require('util');
var path = require('path');
var fs = require('fs');

var Client = require('fabric-client');
var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');

var ORGS, PEER_ORGS;

//
// Install chaincode on peers of this org
//
function installChaincodeInOrgPeers(org, chaincode_path, chaincode_version) {
	Client.setConfigSetting('request-timeout', 60000);
	var channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', Constants.CHANNEL_NAME);

	// Instantiate client and channel
	var client = new Client();
	var channel = client.newChannel(channel_name);

	// Set client store for ledger state and credentials
	var orgName = ORGS[org].name;
	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: ClientUtils.storePathForOrg(orgName)}));
	client.setCryptoSuite(cryptoSuite);

	// Configure channel orderer
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

	// Select peers in this org (specified in network config) to install chaincode in (to be endorsers)
	var targets = [];
	for (let key in ORGS[org]) {
		if (ORGS[org].hasOwnProperty(key)) {
			if (key.indexOf('peer') === 0) {
				let data = fs.readFileSync(path.join(__dirname, ORGS[org][key]['tls_cacerts']));
				let peer = client.newPeer(
					ORGS[org][key].requests,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': ORGS[org][key]['server-hostname']
					}
				);

				targets.push(peer);    // a peer can be the target this way
				channel.addPeer(peer); // or a peer can be the target this way
				                       // you do not have to do both, just one, when there are
				                       // 'targets' in the request, those will be used and not
				                       // the peers added to the channel
			}
		}
	}

	// Create and submit the installation request
	return Client.newDefaultKeyValueStore({			// Set the key-value store location
		path: ClientUtils.storePathForOrg(orgName)
	}).then((store) => {
		client.setStateStore(store);			// Set application state location on the file system

		// get the peer org's admin required to send install chaincode requests
		return ClientUtils.getSubmitter(client, true, org);
	}).then((admin) => {
		console.log('Successfully enrolled user \'admin\'');

		// send installation proposal to our target endorsers in this org
		var request = {
			targets: targets,
			chaincodePath: chaincode_path,
			chaincodeId: Constants.CHAINCODE_ID,
			chaincodeVersion: chaincode_version
		};

		return client.installChaincode(request);
	},
	(err) => {
		console.log('Failed to enroll user \'admin\'. ' + err);
		throw new Error('Failed to enroll user \'admin\'. ' + err);
	}).then((results) => {
		var proposalResponses = results[0];

		var proposal = results[1];

		// Ensure that all responses (one from each peer) indicate success
		var all_good = true;
		var errors = [];
		for(var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				one_good = true;
				logger.info('install proposal was good from peer %s in org %s', targets[i].url, org);
			} else {
				logger.error('install proposal was bad from peer %s in org %s', targets[i].url, org);
				errors.push(proposalResponses[i]);
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			console.log(util.format('Successfully sent install Proposal and received ProposalResponses to peers of org', org));
		} else {
			throw new Error(util.format('Failed to send install Proposal or receive valid response from org %s: %s', org, errors));
		}
	},
	(err) => {
		console.log('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
	});
}

//
// Install chaincode on peers of all orgs
//
function installChaincode(chaincode_path, chaincode_version, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	// temporarily set $GOPATH to the chaincode folder
	process.env.GOPATH = path.join(__dirname, Constants.chaincodeLocation);

	ORGS = JSON.parse(fs.readFileSync(path.join(__dirname, Constants.networkConfig)))[Constants.networkId];
	PEER_ORGS = [];
	Object.keys(ORGS).forEach((org) => {
		if(org !== 'orderer') {
			PEER_ORGS.push(org);
		}
	})

	var installPromises = [];
	PEER_ORGS.forEach((org) => {
		// Install chaincode from a particular location with a particular version ID on to the peers of this org
		// This will just result in the copy of the source code to the target peers
		// Building and initialization of the chaincode must be explicitly triggered following this step
		installPromises.push(installChaincodeInOrgPeers);
	});
	return installPromises.reduce(
		(promiseChain, currentFunction, currentIndex) =>
			promiseChain.then(() => {
				return currentFunction(PEER_ORGS[currentIndex], chaincode_path, chaincode_version)
					.then(() => {
						console.log(util.format('Successfully installed chaincode in peers of organization "%s"', PEER_ORGS[currentIndex]));
					}, (err) => {
						console.log(util.format('Failed to install chaincode in peers of organization "%s". %s', PEER_ORGS[currentIndex], err.stack ? err.stack : err));
						logger.error(util.format('Failed to install chaincode in peers of organization "%s". ', PEER_ORGS[currentIndex]));
						throw err;
					})
			}), Promise.resolve()
	).then(() => {
		console.log('Installations succeeded');
	})
	.catch(function(err) {
		console.log('Installations failed:' + err.stack ? err.stack : err);
		throw err;
	});
}

module.exports.installChaincode = installChaincode;
