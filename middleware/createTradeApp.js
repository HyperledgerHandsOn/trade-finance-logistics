/*
 * Copyright 2018 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

// Centralized cleanup function
function cleanupResources() {
    try {
        ClientUtils.txEventsCleanup();
    } catch (cleanupErr) {
        console.warn('Warning during ClientUtils cleanup:', cleanupErr.message);
    }
    
    try {
        joinChannel.joinEventsCleanup();
    } catch (cleanupErr) {
        console.warn('Warning during joinChannel cleanup:', cleanupErr.message);
    }
}

// Enhanced error handling wrapper
async function runFabricOperations() {
    let currentStep = 'START';
    
    try {
        currentStep = 'CREATE_CHANNEL';
        await createChannel.createChannel(Constants.CHANNEL_NAME);
        console.log('\n');
        console.log('--------------------------');
        console.log('CHANNEL CREATION COMPLETE');
        console.log('--------------------------');
        console.log('\n');

        currentStep = 'JOIN_CHANNEL';
        await joinChannel.processJoinChannel();
        console.log('\n');
        console.log('----------------------');
        console.log('CHANNEL JOIN COMPLETE');
        console.log('----------------------');
        console.log('\n');

        currentStep = 'INSTALL_CHAINCODE';
        await installCC.installChaincode(Constants.CHAINCODE_PATH, Constants.CHAINCODE_VERSION);
        console.log('\n');
        console.log('---------------------------');
        console.log('CHAINCODE INSTALL COMPLETE');
        console.log('---------------------------');
        console.log('\n');

        currentStep = 'INSTANTIATE_CHAINCODE';
        await instantiateCC.instantiateOrUpgradeChaincode(
            Constants.IMPORTER_ORG,
            Constants.CHAINCODE_PATH,
            Constants.CHAINCODE_VERSION,
            'init',
            ['LumberInc', 'LumberBank', '100000', 'WoodenToys', 'ToyBank', '200000', 'UniversalFrieght', 'ForestryDepartment'],
            false
        );
        console.log('\n');
        console.log('-------------------------------');
        console.log('CHAINCODE INSTANTIATE COMPLETE');
        console.log('-------------------------------');
        console.log('\n');

        currentStep = 'INVOKE_CHAINCODE';
        await invokeCC.invokeChaincode(Constants.IMPORTER_ORG, Constants.CHAINCODE_VERSION, 'requestTrade', ['2ks89j9', '50000','Wood for Toys'], 'Importer');
        console.log('\n');
        console.log('------------------------------');
        console.log('CHAINCODE INVOCATION COMPLETE');
        console.log('------------------------------');
        console.log('\n');

        currentStep = 'QUERY_CHAINCODE';
        var result = await queryCC.queryChaincode(Constants.EXPORTER_ORG, Constants.CHAINCODE_VERSION, 'getTradeStatus', ['2ks89j9'], 'Exporter');
        console.log('\n');
        console.log('-------------------------');
        console.log('CHAINCODE QUERY COMPLETE');
        console.log('VALUE:', result);
        console.log('-------------------------');
        console.log('\n');

    } catch (err) {
        console.log('\n');
        console.log('----------------------------------------');
        console.log(`❌ OPERATION FAILED AT STEP: ${currentStep}`);
        console.log('----------------------------------------');
        console.log('Error details:', err);
        console.log('\n');
        
        // Clean up all resources regardless of where failure occurred
        cleanupResources();
        
        process.exit(1);
    } finally {
        cleanupResources();
    }
}

// Run the enhanced orchestration
runFabricOperations();

// Enhanced process event handlers with consolidated cleanup
process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION:', err);
    cleanupResources();
    process.exit(1);
});

process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION:', err);
    cleanupResources();
    process.exit(1);
});

process.on('exit', cleanupResources);
