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

var Constants = require('./constants.js');
var ClientUtils = require('./clientUtils.js');
var createChannel = require('./create-channel.js');
var joinChannel = require('./join-channel.js');
var installCC = require('./install-chaincode.js');
var instantiateCC = require('./instantiate-chaincode.js');
var invokeCC = require('./invoke-chaincode.js');
var queryCC = require('./query-chaincode.js');

var tradeID = 'h87hi94';

Constants.networkConfig = './config_upgrade.json';	// Use the augmented configuration
Constants.TRANSACTION_ENDORSEMENT_POLICY = Constants.ALL_FIVE_ORG_MEMBERS;	// Use the updated endorsement policy

/////////////////////////////////
// INVOKE AND QUERY OPERATIONS //
/////////////////////////////////

// INVOKE: requestTrade (Importer)
invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestTrade', [tradeID, '50000','Wood for Toys'], 'Importer', Constants)
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('requestTrade SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getTradeStatus (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getTradeStatus', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('requestTrade FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getTradeStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: acceptTrade (Exporter)
	return invokeCC.invokeChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'acceptTrade', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getTradeStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('acceptTrade SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getTradeStatus (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getTradeStatus', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('acceptTrade FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getTradeStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: requestLC (Importer)
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestLC', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getTradeStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('requestLC SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getLCStatus (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('requestLC FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getLCStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: issueLC (Importer's Bank)
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'issueLC', [tradeID, 'lc8349', '12/31/2018', 'E/L', 'B/L'], 'ImportersBank', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getLCStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('issueLC SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getLCStatus (Importer's Bank)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'ImportersBank', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('issueLC FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getLCStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: acceptLC (Exporter's Bank)
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'acceptLC', [tradeID], 'ExportersBank', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getLCStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('acceptLC SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getLCStatus (Exporter's Bank)
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'ExportersBank', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('acceptLC FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getLCStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: requestEL (Exporter)
	return invokeCC.invokeChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'requestEL', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getLCStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('requestEL SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getELStatus (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getELStatus', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('requestEL FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getELStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: issueEL (Regulator)
	return invokeCC.invokeChaincode(Constants.REGULATOR_ORG, Constants.CHAINCODE_VERSION, 'issueEL', [tradeID, 'el979', '4/30/2019'], 'Regulator', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getELStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('issueEL SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getELStatus (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getELStatus', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('issueEL FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getELStatus VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: prepareShipment (Exporter)
	return invokeCC.invokeChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'prepareShipment', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getELStatus FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('prepareShipment SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getShipmentLocation (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getShipmentLocation', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('prepareShipment FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getShipmentLocation VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: acceptShipmentAndIssueBL (Carrier)
	return invokeCC.invokeChaincode(Constants.CARRIER_ORG, Constants.CHAINCODE_VERSION, 'acceptShipmentAndIssueBL', [tradeID, 'bl06678', '8/31/2018', 'Woodlands Port', 'Market Port'], 'Carrier', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getShipmentLocation FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('acceptShipmentAndIssueBL SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getBillOfLading (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getBillOfLading', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('acceptShipmentAndIssueBL FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getBillOfLading VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: requestPayment (Exporter)
	return invokeCC.invokeChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'requestPayment', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getBillOfLading FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('requestPayment SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// INVOKE: makePayment (Importer)
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'makePayment', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('requestPayment FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('makePayment SUCCEEDED');
	console.log('-------------------------');
	console.log('\n');

	// QUERY: getAccountBalance (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'exporter'], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('makePayment FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('getAccountBalance VALUE:', result);
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getAccountBalance (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'importer'], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('getAccountBalance FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getAccountBalance VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: updateShipmentLocation (Carrier)
	return invokeCC.invokeChaincode(Constants.CARRIER_ORG, Constants.CHAINCODE_VERSION, 'updateShipmentLocation', [tradeID, 'DESTINATION'], 'Carrier', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getAccountBalance FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('updateShipmentLocation SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getShipmentLocation (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getShipmentLocation', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('updateShipmentLocation FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getShipmentLocation VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	// INVOKE: requestPayment (Exporter)
	return invokeCC.invokeChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'requestPayment', [tradeID], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getShipmentLocation FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('requestPayment SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// INVOKE: makePayment (Importer)
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'makePayment', [tradeID], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('requestPayment FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then(() => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('makePayment SUCCEEDED');
	console.log('-------------------------');
	console.log('\n');

	// QUERY: getAccountBalance (Exporter)
	return queryCC.queryChaincode(Constants.EXPORTING_ENTITY_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'exporter'], 'ExportingEntity', Constants);
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('makePayment FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('getAccountBalance VALUE:', result);
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getAccountBalance (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'importer'], 'Importer', Constants);
}, (err) => {
	console.log('\n');
	console.log('-----------------------------');
	console.log('CHAINCODE INVOCATION FAILED:', err);
	console.log('getAccountBalance FAILED');
	console.log('-----------------------------');
	console.log('\n');
	process.exit(1);
})
.then((result) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHAINCODE QUERY COMPLETE');
	console.log('getAccountBalance VALUE:', result);
	console.log('-------------------------');
	console.log('\n');

	ClientUtils.txEventsCleanup();
}, (err) => {
	console.log('\n');
	console.log('------------------------');
	console.log('CHAINCODE QUERY FAILED:', err);
	console.log('getAccountBalance FAILED');
	console.log('------------------------');
	console.log('\n');
	process.exit(1);
});

process.on('uncaughtException', err => {
	console.error(err);
	joinChannel.joinEventsCleanup();
});

process.on('unhandledRejection', err => {
	console.error(err);
	joinChannel.joinEventsCleanup();
});

process.on('exit', () => {
	joinChannel.joinEventsCleanup();
});
