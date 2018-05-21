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
var logger = utils.getLogger('E2E testing');

var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);

var path = require('path');
var fs = require('fs');
var util = require('util');

var Client = require('fabric-client');
var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');

var ORGS;

var grpc = require('grpc');

var tx_id = null;
var the_user = null;
var eventhubs = [];

function init() {
	if (!ORGS) {
		Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
		ORGS = Client.getConfigSetting(Constants.networkId);
	}
}

module.exports.init = init;

function getClientUser(userOrg, username, password) {
	ORGS = Client.getConfigSetting(Constants.networkId);
	if (ORGS[userOrg] === null || ORGS[userOrg] === undefined) {
		return new Promise((resolve, reject) => {
			return reject('Unknown org: ' + userOrg);
		});
	}
	var orgName = ORGS[userOrg].name;
	var client = new Client();

	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: ClientUtils.storePathForOrg(orgName)}));
	client.setCryptoSuite(cryptoSuite);

	return Client.newDefaultKeyValueStore({
		path: ClientUtils.storePathForOrg(orgName)
	}).then((store) => {
		if (store) {
			client.setStateStore(store);
		}
		// Hack/shortcut to enroll an admin user
		if (username === 'admin') {
			if (password !== 'adminpw') {
				throw new Error('Invalid admin password');
			}
			return ClientUtils.getSubmitter(client, false, userOrg);
		} else {
			return ClientUtils.getSubmitter(client, false, userOrg, username);
		}
	});
}

module.exports.getClientUser = getClientUser;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.sleep = sleep;

function cleanup() {
	for(var key in eventhubs) {
		var eventhub = eventhubs[key];
		if (eventhub && eventhub.isconnected()) {
			logger.debug('Disconnecting the event hub');
			eventhub.disconnect();
		}
	}
}

module.exports.eventhubs = eventhubs;
module.exports.txEventsCleanup = cleanup;

process.on('exit', () => {
	cleanup();
})
