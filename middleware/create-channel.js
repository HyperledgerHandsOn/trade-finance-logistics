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
var logger = utils.getLogger('create-channel');

var Client = require('fabric-client');
var fs = require('fs');
var path = require('path');
var grpc = require('grpc');

var _commonProto = grpc.load(path.join(__dirname, 'node_modules/fabric-client/lib/protos/common/common.proto')).common;
var _configtxProto = grpc.load(path.join(__dirname, 'node_modules/fabric-client/lib/protos/common/configtx.proto')).common;

var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');

var ORGS, PEER_ORGS;

// Enroll 'admin' user of an org and sign the channel configuration as that user (signing identity)
function enrollOrgAdminAndSignConfig(org, client, config, signatures) {
	client._userContext = null;

	return ClientUtils.getSubmitter(client, true /*get the org admin*/, org)
	.then((admin) => {
		console.log('Successfully enrolled user \'admin\' for', org);

		// sign the config
		var signature = client.signChannelConfig(config);
		console.log('Successfully signed config as admin of', org);

		// collect signature from org admin
		signatures.push(signature);
	});
}

//
// Send a channel creation request to the orderer
//
function createChannel(channel_name, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);
	Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
	ORGS = Client.getConfigSetting(Constants.networkId);
	PEER_ORGS = [];
	Object.keys(ORGS).forEach((org) => {
		if(org !== 'orderer') {
			PEER_ORGS.push(org);
		}
	})

	//
	// Create and configure the channel
	//
	var client = new Client();

	// Read the TLS certificates to establish a secure connection to the orderer
	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, caRootsPath));
	let caroots = Buffer.from(data).toString();

	var orderer = client.newOrderer(
		ORGS.orderer.url,
		{
			'pem': caroots,
			'ssl-target-name-override': ORGS.orderer['server-hostname']
		}
	);

	var config = null;		// Network channel configuration
	var signatures = [];		// Collect signatures to submit to orderer for channel creation

	// Attempt to create the channel as a client of Constants.IMPORTER_ORG
	var org = ORGS[Constants.IMPORTER_ORG].name;

	// Use a file-based key-value store for this network instance
	utils.setConfigSetting('key-value-store', 'fabric-client/lib/impl/FileKeyValueStore.js');

	return Client.newDefaultKeyValueStore({		// Set the key-value store location
		path: ClientUtils.storePathForOrg(org)
	}).then((store) => {
		client.setStateStore(store);		// Set application state location on the file system
		var cryptoSuite = Client.newCryptoSuite();
		cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: ClientUtils.storePathForOrg(org)}));
		client.setCryptoSuite(cryptoSuite);	// Set storage location for cryptographic material

		// Load the channel configuration: for creation of update of a channel
		let envelope_bytes = fs.readFileSync(path.join(__dirname, Constants.networkLocation, Constants.channelConfig));
		config = client.extractChannelConfig(envelope_bytes);
		console.log('Successfully extracted the config update from the configtx envelope');

		var enrollmentAndSignPromises = [];
		PEER_ORGS.forEach((org) => {
			enrollmentAndSignPromises.push(enrollOrgAdminAndSignConfig);
		})
		// Enroll 'admin' user for each org and get their signatures on the channel config in sequence
		return enrollmentAndSignPromises.reduce(
			(promiseChain, currentFunction, currentIndex) =>
				promiseChain.then(() => {
					return currentFunction(PEER_ORGS[currentIndex], client, config, signatures);
				}), Promise.resolve()
		);
	}).then(() => {
		console.log('Successfully enrolled user \'admin\' for every org and obtained channel config signatures');
		// (OPTIONAL) Enroll orderer admin
		client._userContext = null;
		return ClientUtils.getOrderAdminSubmitter(client);
	}).then((admin) => {
		console.log('Successfully enrolled user \'admin\' for orderer');

		// Check if the channel already exists by querying for the genesis block
		var channel = client.newChannel(channel_name);
		channel.addOrderer(
			client.newOrderer(
				ORGS.orderer.url,
				{
					'pem': caroots,
					'ssl-target-name-override': ORGS.orderer['server-hostname']
				}
			)
		);
		return channel.getGenesisBlock();
	}).then((genesis_block) => {
		console.log('Got genesis block. Channel', channel_name, 'already exists');
		return { status: 'SUCCESS' };
	}, (err) => {
		console.log('Channel', channel_name, 'does not exist yet');

		// (OPTIONAL) sign the config as the orderer admin
		var signature = client.signChannelConfig(config);
		console.log('Successfully signed config update as orderer admin');

		// collect signature from orderer org admin
		signatures.push(signature);

		// build up the create request
		let tx_id = client.newTransactionID();
		var request = {
			config: config,
			signatures : signatures,
			name : channel_name,
			orderer : orderer,
			txId  : tx_id
		};

		// Send create request to orderer
		// At this point, the orderer admin is the client's signing identity
		// But we could have used any of the peer org admins for this purpose too
		return client.createChannel(request);
	})
	.then((result) => {
		logger.debug('Channel creation complete; response ::%j',result);
		if(result.status && result.status === 'SUCCESS') {
			console.log('Successfully created the channel.');
			return ClientUtils.sleep(5000);
		} else {
			throw new Error('Failed to create the channel. ');
		}
	}, (err) => {
		throw new Error('Failed to create the channel: ' + err.stack ? err.stack : err);
	})
	.then((nothing) => {
		console.log('Successfully waited to make sure new channel was created.');
	}, (err) => {
		throw new Error('Failed to sleep due to error: ' + err.stack ? err.stack : err);
	});
}

module.exports.createChannel = createChannel;
