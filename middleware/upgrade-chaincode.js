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

var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');
var installCC = require('./install-chaincode.js');
var instantiateCC = require('./instantiate-chaincode.js');

Constants.networkConfig = './config_upgrade.json';	// Use the augmented configuration
Constants.TRANSACTION_ENDORSEMENT_POLICY = Constants.ALL_FIVE_ORG_MEMBERS;	// Use the updated endorsement policy

// Install a chaincode, and upon success, attempt to upgrade it on the channel
installCC.installChaincode(Constants.CHAINCODE_UPGRADE_PATH, Constants.CHAINCODE_UPGRADE_VERSION, Constants).then(() => {
	console.log('\n');
	console.log('--------------------------------');
	console.log('NEW CHAINCODE INSTALL COMPLETE');
	console.log('--------------------------------');
	console.log('\n');

	return instantiateCC.instantiateOrUpgradeChaincode(
		Constants.IMPORTER_ORG,
		Constants.CHAINCODE_UPGRADE_PATH,
		Constants.CHAINCODE_UPGRADE_VERSION,
		'init',
		[],
		true,
		Constants
	);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------------');
	console.log('NEW CHAINCODE INSTALL FAILED:', err);
	console.log('-----------------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('----------------------------');
	console.log('CHAINCODE UPGRADE COMPLETE');
	console.log('----------------------------');
	console.log('\n');
	ClientUtils.txEventsCleanup();
}, (err) => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE UPGRADE FAILED:', err);
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
});

process.on('unhandledRejection', err => {
	console.error(err);
})
