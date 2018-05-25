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

var path = require('path');
var fs = require('fs');

var Constants = require('./constants.js');
var Client = require('fabric-client');
var ClientUtils = require('./clientUtils.js');

//
// Send chaincode query request to the peer
//
function queryChaincode(userOrg, version, funcName, argList, userName, constants) {
	if (constants) {
		Constants = constants;
	}
	ClientUtils.init(Constants);

	var ORGS = JSON.parse(fs.readFileSync(path.join(__dirname, Constants.networkConfig)))[Constants.networkId];

	Client.setConfigSetting('request-timeout', 60000);
	var channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', Constants.CHANNEL_NAME);

	// this is a transaction, will just use org's identity to
	// submit the request. intentionally we are using a different org
	// than the one that submitted the "move" transaction, although either org
	// should work properly
	var client = new Client();
	var channel = client.newChannel(channel_name);

	var orgName = ORGS[userOrg].name;
	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: ClientUtils.storePathForOrg(orgName)}));
	client.setCryptoSuite(cryptoSuite);

	var targets = [];
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
				});
			channel.addPeer(peer);
		}
	}

	return Client.newDefaultKeyValueStore({
		path: ClientUtils.storePathForOrg(orgName)
	}).then((store) => {

		client.setStateStore(store);
		return ClientUtils.getSubmitter(client, false, userOrg, userName);

	}).then((user) => {
		if (userName) {
			console.log('Successfully enrolled user', userName);
		} else {
			console.log('Successfully enrolled user \'admin\'');
		}

		// send query
		var request = {
			chaincodeId : Constants.CHAINCODE_ID,
			fcn: funcName,
			args: argList
		};

		return channel.queryByChaincode(request);
	},
	(err) => {
		var errMesg = 'Failed to get submitter ';
		if (userName) {
			errMesg = errMesg + userName + '. Error: ' + err;
		} else {
			errMesg = errMesg + 'admin. Error: ' + err;
		}
		console.log(errMesg);
		throw new Error(errMesg);
	}).then((response_payloads) => {
		if (response_payloads) {
			var value = '';
			for(let i = 0; i < response_payloads.length; i++) {
				if(value === '') {
					value = response_payloads[i].toString('utf8');
				} else if(value !== response_payloads[i].toString('utf8')) {
					throw new Error('Responses from peers don\'t match');
				}
			}
			return value;
		} else {
			console.log('response_payloads is null');
			throw new Error('Failed to get response on query');
		}
	},
	(err) => {
		console.log('Failed to send query due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed, got error on query');
	});
};

module.exports.queryChaincode = queryChaincode;
