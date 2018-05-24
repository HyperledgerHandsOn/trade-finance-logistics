/**
 * Copyright 2016 IBM All Rights Reserved.
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
var logger = utils.getLogger('E2E upgrade-chaincode');
var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);
var util = require('util');
var path = require('path');
var fs = require('fs');
var sdkHelper = require('./sdkHelper.js');
var Constants = require('./constants.js');
var installCC = require('./install-chaincode.js');
var instantiateCC = require('./instantiate-chaincode.js');

// Install a chaincode, and upon success, attempt to upgrade it on the channel
installCC.installChaincode(Constants.CHAINCODE_UPGRADE_PATH, Constants.CHAINCODE_UPGRADE_VERSION).then(() => {
	console.log('\n');
	console.log('--------------------------------');
	console.log('NEW CHAINCODE INSTALL COMPLETE');
	console.log('--------------------------------');
	console.log('\n');

	instantiateCC.instantiateOrUpgradeChaincode(
		Constants.IMPORTER_ORG,
		Constants.CHAINCODE_UPGRADE_PATH,
		Constants.CHAINCODE_UPGRADE_VERSION,
		'init',
		[],
		true
	).then(() => {
		console.log('\n');
		console.log('----------------------------');
		console.log('CHAINCODE UPGRADE COMPLETE');
		console.log('----------------------------');
		console.log('\n');
		sdkHelper.txEventsCleanup();
	}, (err) => {
		console.log('\n');
		console.log('------------------------------');
		console.log('CHAINCODE UPGRADE FAILED:', err);
		console.log('-----------------------------');
		console.log('\n');
		process.exit(1);
	})
}, (err) => {
	console.log('\n');
	console.log('-----------------------------------');
	console.log('NEW CHAINCODE INSTALL FAILED:', err);
	console.log('-----------------------------------');
	console.log('\n');
	process.exit(1);
});

process.on('unhandledRejection', err => {
	console.error(err);
})
