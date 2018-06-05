/*
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
var os = require('os');
var path = require('path');

var tempdir = "../network/client-certs";
//path.join(os.tmpdir(), 'hfc');

// Frame the endorsement policy
var FOUR_ORG_MEMBERS_AND_ADMIN = [{
	role: {
		name: 'member',
		mspId: 'ExporterOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'ImporterOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'CarrierOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'RegulatorOrgMSP'
	}
}, {
	role: {
		name: 'admin',
		mspId: 'TradeOrdererMSP'
	}
}];

var FIVE_ORG_MEMBERS_AND_ADMIN = [{
	role: {
		name: 'member',
		mspId: 'ExporterOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'ExportingEntityOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'ImporterOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'CarrierOrgMSP'
	}
}, {
	role: {
		name: 'member',
		mspId: 'RegulatorOrgMSP'
	}
}, {
	role: {
		name: 'admin',
		mspId: 'TradeOrdererMSP'
	}
}];

var ONE_OF_FOUR_ORG_MEMBER = {
	identities: FOUR_ORG_MEMBERS_AND_ADMIN,
	policy: {
		'1-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }, { 'signed-by': 2 }, { 'signed-by': 3 }]
	}
};

var ALL_FOUR_ORG_MEMBERS = {
	identities: FOUR_ORG_MEMBERS_AND_ADMIN,
	policy: {
		'4-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }, { 'signed-by': 2 }, { 'signed-by': 3 }]
	}
};

var ALL_FIVE_ORG_MEMBERS = {
	identities: FIVE_ORG_MEMBERS_AND_ADMIN,
	policy: {
		'5-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }, { 'signed-by': 2 }, { 'signed-by': 3 }, { 'signed-by': 4 }]
	}
};

var ALL_ORGS_EXCEPT_REGULATOR = {
	identities: FOUR_ORG_MEMBERS_AND_ADMIN,
	policy: {
		'3-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }, { 'signed-by': 2 }]
	}
};

var ACCEPT_ALL = {
	identities: [],
	policy: {
		'0-of': []
	}
};

var chaincodeLocation = '../chaincode';

var networkId = 'trade-network';

var networkConfig = './config.json';

var networkLocation = '../network';

var channelConfig = 'channel-artifacts/channel.tx';

var IMPORTER_ORG = 'importerorg';
var EXPORTER_ORG = 'exporterorg';
var EXPORTING_ENTITY_ORG = 'exportingentityorg';
var CARRIER_ORG = 'carrierorg';
var REGULATOR_ORG = 'regulatororg';

var CHANNEL_NAME = 'tradechannel';
var CHAINCODE_PATH = 'github.com/trade_workflow';
var CHAINCODE_ID = 'tradecc';
var CHAINCODE_VERSION = 'v0';
var CHAINCODE_UPGRADE_PATH = 'github.com/trade_workflow_v1';
var CHAINCODE_UPGRADE_VERSION = 'v1';

var TRANSACTION_ENDORSEMENT_POLICY = ALL_FOUR_ORG_MEMBERS;

module.exports = {
	tempdir: tempdir,
	chaincodeLocation: chaincodeLocation,
	networkId: networkId,
	networkConfig: networkConfig,
	networkLocation: networkLocation,
	channelConfig: channelConfig,
	IMPORTER_ORG: IMPORTER_ORG,
	EXPORTER_ORG: EXPORTER_ORG,
	EXPORTING_ENTITY_ORG: EXPORTING_ENTITY_ORG,
	CARRIER_ORG: CARRIER_ORG,
	REGULATOR_ORG: REGULATOR_ORG,
	CHANNEL_NAME: CHANNEL_NAME,
	CHAINCODE_PATH: CHAINCODE_PATH,
	CHAINCODE_ID: CHAINCODE_ID,
	CHAINCODE_VERSION: CHAINCODE_VERSION,
	CHAINCODE_UPGRADE_PATH: CHAINCODE_UPGRADE_PATH,
	CHAINCODE_UPGRADE_VERSION: CHAINCODE_UPGRADE_VERSION,
	ALL_FOUR_ORG_MEMBERS: ALL_FOUR_ORG_MEMBERS,
	ALL_FIVE_ORG_MEMBERS: ALL_FIVE_ORG_MEMBERS,
	TRANSACTION_ENDORSEMENT_POLICY: TRANSACTION_ENDORSEMENT_POLICY
};
