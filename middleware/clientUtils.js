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

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('ClientUtils');

var path = require('path');
var fs = require('fs-extra');
var util = require('util');

var Client = require('fabric-client');
var copService = require('fabric-ca-client/lib/FabricCAClientImpl.js');
var User = require('fabric-client/lib/User.js');
var Constants = require('./constants.js');

// all temporary files and directories are created under here
var tempdir = Constants.tempdir;

logger.info(util.format(
	'\n\n*******************************************************************************' +
	'\n*******************************************************************************' +
	'\n*                                          ' +
	'\n* Using temp dir: %s' +
	'\n*                                          ' +
	'\n*******************************************************************************' +
	'\n*******************************************************************************\n', tempdir));

module.exports.getTempDir = function() {
	fs.ensureDirSync(tempdir);
	return tempdir;
};

// directory for file based KeyValueStore
module.exports.KVS = path.join(tempdir, 'hfc-test-kvs');
module.exports.storePathForOrg = function(org) {
	return module.exports.KVS + '_' + org;
};

module.exports.cleanupDir = function(keyValStorePath) {
	var absPath = path.join(process.cwd(), keyValStorePath);
	var exists = module.exports.existsSync(absPath);
	if (exists) {
		fs.removeSync(absPath);
	}
};

module.exports.getUniqueVersion = function(prefix) {
	if (!prefix) prefix = 'v';
	return prefix + Date.now();
};

// utility function to check if directory or file exists
// uses entire / absolute path from root
module.exports.existsSync = function(absolutePath /*string*/) {
	try  {
		var stat = fs.statSync(absolutePath);
		if (stat.isDirectory() || stat.isFile()) {
			return true;
		} else
			return false;
	}
	catch (e) {
		return false;
	}
};

module.exports.readFile = readFile;

var ORGS = {};

module.exports.init = function(constants) {
	if (constants) {
		Constants = constants;
	}
	Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
	ORGS = Client.getConfigSetting(Constants.networkId);
};


var	tlsOptions = {
	trustedRoots: [],
	verify: false
};

function getMember(username, password, client, userOrg) {
	var caUrl = ORGS[userOrg].ca.url;

	return client.getUserContext(username, true)
	.then((user) => {
		return new Promise((resolve, reject) => {
			if (user && user.isEnrolled()) {
				console.log('Successfully loaded member from persistence');
				return resolve(user);
			}

			var member = new User(username);
			var cryptoSuite = client.getCryptoSuite();
			if (!cryptoSuite) {
				cryptoSuite = Client.newCryptoSuite();
				if (userOrg) {
					cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(ORGS[userOrg].name)}));
					client.setCryptoSuite(cryptoSuite);
				}
			}
			member.setCryptoSuite(cryptoSuite);

			// need to enroll it with CA server
			var cop = new copService(caUrl, tlsOptions, ORGS[userOrg].ca.name, cryptoSuite);

			return cop.enroll({
				enrollmentID: username,
				enrollmentSecret: password
			}).then((enrollment) => {
				console.log('Successfully enrolled user \'' + username + '\'');

				return member.setEnrollment(enrollment.key, enrollment.certificate, ORGS[userOrg].mspid);
			}).then(() => {
				var skipPersistence = false;
				if (!client.getStateStore()) {
					skipPersistence = true;
				}
				return client.setUserContext(member, skipPersistence);
			}).then(() => {
				return resolve(member);
			}).catch((err) => {
				throw new Error('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
			});
		});
	})
	.catch((err) => {
		throw new Error("Unable to get user context for", username);
	});
}

function registerAndEnrollUser(client, cop, admin, username, userOrg) {
	return new Promise((resolve, reject) => {
	console.log('Registering and enrolling user', username);
	var enrollUser = new User(username);

	// register 'username' CA server
	return cop.register({
		enrollmentID: username,
		role: 'client',
		affiliation: 'org1.department1'
	}, admin).catch((err) => {
		throw err;
	}).then((userSecret) => {
		console.log('Successfully registered user \'' + username + '\'');
		userPassword = userSecret;

		// Now that 'username' is registered, try to enroll (login)
		return cop.enroll({
			enrollmentID: username,
			enrollmentSecret: userSecret
		});
	}).catch((err) => {
		console.log('Failed to register user. Error: ' + err.stack ? err.stack : err);
		throw err;
	}).then((enrollment) => {
		console.log('Successfully enrolled user \'' + username + '\'');

		return enrollUser.setEnrollment(enrollment.key, enrollment.certificate, ORGS[userOrg].mspid);
	}).catch((err) => {
		throw err;
	}).then(() => {
		console.log('Saving enrollment record for user \'' + username + '\'');
		return client.setUserContext(enrollUser, false);
	}).catch((err) => {
		throw err;
	}).then(() => {
		return client.saveUserToStateStore();
	}).then(() => {
		console.log('Saved enrollment record for user \'' + username + '\'');
		enrollUser._enrollmentSecret = userPassword;
		return resolve(enrollUser);
	}).catch((err) => {
		console.log('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
		reject(err);
	});
	});
}

function getUserMember(adminUser, adminPassword, client, userOrg, username) {
	var caUrl = ORGS[userOrg].ca.url;
	var userPassword = '';

	return client.getUserContext(username, true)
	.then((user) => {
		return new Promise((resolve, reject) => {
			if (user && user.isEnrolled()) {
				console.log('Successfully loaded user', username, 'from persistence');
				return resolve(user);
			}

			return client.getUserContext(adminUser, true)
			.then((admin) => {
					var cryptoSuite = client.getCryptoSuite();
					if (!cryptoSuite) {
						cryptoSuite = Client.newCryptoSuite();
						if (userOrg) {
							cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(ORGS[userOrg].name)}));
							client.setCryptoSuite(cryptoSuite);
						}
					}
					var cop = new copService(caUrl, tlsOptions, ORGS[userOrg].ca.name, cryptoSuite);

					if (admin && admin.isEnrolled()) {
						console.log('Successfully loaded admin member from persistence');
						return registerAndEnrollUser(client, cop, admin, username, userOrg)
						.then((enrollUser) => {
							return resolve(enrollUser);
						}, (err) => {
							reject(err);
						});
					}

					var member = new User(adminUser);
					member.setCryptoSuite(cryptoSuite);

					// need to enroll admin user with CA server

					return cop.enroll({
						enrollmentID: adminUser,
						enrollmentSecret: adminPassword
					}).then((enrollment) => {
						console.log('Successfully enrolled admin user');

						return member.setEnrollment(enrollment.key, enrollment.certificate, ORGS[userOrg].mspid);
					}).then(() => {
						var skipPersistence = false;
						if (!client.getStateStore()) {
							skipPersistence = true;
						}
						return client.setUserContext(member, skipPersistence);
					}).then(() => {
						return registerAndEnrollUser(client, cop, member, username, userOrg)
						.then((enrollUser) => {
							return resolve(enrollUser);
						}, (err) => {
							reject(err);
						});
					}).catch((err) => {
						console.log('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
						throw err;
					});
			})
			.catch((err) => {
				console.log("Unable to get user context for", username);
				reject(err);
			});
		});
	}).catch((err) => {
		console.log('Error loading user context');
		throw err;
	});
}

function getAdmin(client, userOrg) {
	var keyPath = path.join(__dirname, util.format(Constants.networkLocation + '/crypto-config/peerOrganizations/%s.trade.com/users/Admin@%s.trade.com/msp/keystore', userOrg, userOrg));
	var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
	var certPath = path.join(__dirname, util.format(Constants.networkLocation + '/crypto-config/peerOrganizations/%s.trade.com/users/Admin@%s.trade.com/msp/signcerts', userOrg, userOrg));
	var certPEM = readAllFiles(certPath)[0];

	var cryptoSuite = Client.newCryptoSuite();
	if (userOrg) {
		cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(ORGS[userOrg].name)}));
		client.setCryptoSuite(cryptoSuite);
	}

	return Promise.resolve(client.createUser({
		username: 'peer'+userOrg+'Admin',
		mspid: ORGS[userOrg].mspid,
		cryptoContent: {
			privateKeyPEM: keyPEM.toString(),
			signedCertPEM: certPEM.toString()
		}
	}));
}

function getOrdererMSPId() {
	Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
	return ORGS['orderer'].mspid;
}

function getOrdererAdmin(client) {
	var keyPath = path.join(__dirname, Constants.networkLocation + '/crypto-config/ordererOrganizations/trade.com/users/Admin@trade.com/msp/keystore');
	var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
	var certPath = path.join(__dirname, Constants.networkLocation + '/crypto-config/ordererOrganizations/trade.com/users/Admin@trade.com/msp/signcerts');
	var certPEM = readAllFiles(certPath)[0];

	return Promise.resolve(client.createUser({
		username: 'ordererAdmin',
		mspid: getOrdererMSPId(),
		cryptoContent: {
			privateKeyPEM: keyPEM.toString(),
			signedCertPEM: certPEM.toString()
		}
	}));
}

function readFile(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => {
			if (!!err)
				reject(new Error('Failed to read file ' + path + ' due to error: ' + err));
			else
				resolve(data);
		});
	});
}

function readAllFiles(dir) {
	var files = fs.readdirSync(dir);
	var certs = [];
	files.forEach((file_name) => {
		let file_path = path.join(dir,file_name);
		logger.debug(' looking at file ::'+file_path);
		let data = fs.readFileSync(file_path);
		certs.push(data);
	});
	return certs;
}

module.exports.getOrderAdminSubmitter = function(client, test) {
	return getOrdererAdmin(client, test);
};

module.exports.getSubmitter = function(client, peerOrgAdmin, org, username) {
	if (arguments.length < 1) throw new Error('"client" is a required parameter');

	var peerAdmin, userOrg;
	if (typeof peerOrgAdmin === 'boolean') {
		peerAdmin = peerOrgAdmin;
	} else {
		peerAdmin = false;
	}

	// if the 3rd argument was skipped
	if (typeof peerOrgAdmin === 'string') {
		userOrg = peerOrgAdmin;
	} else {
		if (typeof org === 'string') {
			userOrg = org;
		} else {
			userOrg = Constants.IMPORTER_ORG;
		}
	}

	if (peerAdmin) {
		return getAdmin(client, userOrg);
	} else if (username) {
		return getUserMember('admin', 'adminpw', client, userOrg, username);
	} else {
		return getMember('admin', 'adminpw', client, userOrg);
	}
};

var eventhubs = [];
module.exports.eventhubs = eventhubs;

function getClientUser(userOrg, username, password) {
	if (ORGS[userOrg] === null || ORGS[userOrg] === undefined) {
		return new Promise((resolve, reject) => {
			return reject('Unknown org: ' + userOrg);
		});
	}
	var orgName = ORGS[userOrg].name;
	var client = new Client();

	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(orgName)}));
	client.setCryptoSuite(cryptoSuite);

	return Client.newDefaultKeyValueStore({
		path: module.exports.storePathForOrg(orgName)
	}).then((store) => {
		if (store) {
			client.setStateStore(store);
		}
		// Hack/shortcut to enroll an admin user
		if (username === 'admin') {
			if (password !== 'adminpw') {
				throw new Error('Invalid admin password');
			}
			return module.exports.getSubmitter(client, false, userOrg);
		} else {
			return module.exports.getSubmitter(client, false, userOrg, username);
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

module.exports.txEventsCleanup = cleanup;
