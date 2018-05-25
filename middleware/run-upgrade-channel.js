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
var upgradeChannel = require('./upgrade-channel.js');

upgradeChannel.upgradeChannel(Constants.CHANNEL_NAME).then(() => {
	console.log('\n');
	console.log('--------------------------');
	console.log('CHANNEL UPGRADE COMPLETE');
	console.log('--------------------------');
	console.log('\n');
}, (err) => {
	console.log('\n');
	console.log('-------------------------');
	console.log('CHANNEL UPGRADE FAILED:', err);
	console.log('-------------------------');
	console.log('\n');
	process.exit(1);
});

module.exports.upgradeChannel = upgradeChannel;
