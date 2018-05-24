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

var tradeID = '2ks89j9';

/////////////////////////////////
// INVOKE AND QUERY OPERATIONS //
/////////////////////////////////

// INVOKE: acceptTrade (Exporter)
invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'acceptTrade', [tradeID], 'Exporter')
.then(() => {
	console.log('\n');
	console.log('------------------------------');
	console.log('CHAINCODE INVOCATION COMPLETE');
	console.log('acceptTrade SUCCEEDED');
	console.log('------------------------------');
	console.log('\n');

	// QUERY: getTradeStatus (Importer)
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getTradeStatus', [tradeID], 'Importer');
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
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestLC', [tradeID], 'Importer');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'Importer');
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
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'issueLC', [tradeID, 'lc8349', '12/31/2018', 'E/L', 'B/L'], 'ImportersBank');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'ImportersBank');
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
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'acceptLC', [tradeID], 'ExportersBank');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getLCStatus', [tradeID], 'ExportersBank');
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
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestEL', [tradeID], 'Exporter');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getELStatus', [tradeID], 'Exporter');
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
	return invokeCC.invokeChaincode(Constants.REGULATOR_ORG, Constants.CHAINCODE_VERSION, 'issueEL', [tradeID, 'el979', '4/30/2019'], 'Regulator');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getELStatus', [tradeID], 'Exporter');
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
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'prepareShipment', [tradeID], 'Exporter');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getShipmentLocation', [tradeID], 'Importer');
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
	return invokeCC.invokeChaincode(Constants.CARRIER_ORG, Constants.CHAINCODE_VERSION, 'acceptShipmentAndIssueBL', [tradeID, 'bl06678', '8/31/2018', 'Woodlands Port', 'Market Port'], 'Carrier');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getBillOfLading', [tradeID], 'Exporter');
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
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestPayment', [tradeID], 'Exporter');
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
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'makePayment', [tradeID], 'Importer');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'exporter'], 'Exporter');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'importer'], 'Importer');
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
	return invokeCC.invokeChaincode(Constants.CARRIER_ORG, Constants.CHAINCODE_VERSION, 'updateShipmentLocation', [tradeID, 'DESTINATION'], 'Carrier');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getShipmentLocation', [tradeID], 'Importer');
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
	return invokeCC.invokeChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestPayment', [tradeID], 'Exporter');
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
	return invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'makePayment', [tradeID], 'Importer');
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
	return queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'exporter'], 'Exporter');
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
	return queryCC.queryChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'getAccountBalance', [tradeID, 'importer'], 'Importer');
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
