/**
 * Copyright 2017 IBM All Rights Reserved.
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
var log4js = require('log4js');
var logger = log4js.getLogger('TradeApp');
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
var path = require('path');

var Constants = require('../middleware/constants.js');
var ClientUtils = require('../middleware/clientUtils.js');
var createChannel = require('../middleware/create-channel.js');
var joinChannel = require('../middleware/join-channel.js');
var installCC = require('../middleware/install-chaincode.js');
var instantiateCC = require('../middleware/instantiate-chaincode.js');
var invokeCC = require('../middleware/invoke-chaincode.js');
var queryCC = require('../middleware/query-chaincode.js');
var upgradeChannel = require('../middleware/upgrade-channel.js');

var host = process.env.HOST || 'localhost';
var port = process.env.PORT || 4000;
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/login']
}));
app.use(bearerToken());
app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (req.originalUrl.indexOf('/login') >= 0) {
		return next();
	}

	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /login call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user
app.post('/login', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
	var password = req.body.password;
	logger.debug('User name for login/registration : ' + username);
	logger.debug('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	// Hardcode single 'admin' user per org for now
	if (username === 'admin' && !password) {
		res.json(getErrorMessage('\'password\''));
		return;
	}
	var token = jwt.sign({
		// Make the token expire 60 seconds from now
		exp: Math.floor(Date.now() / 1000) + (69 * 60),	
		username: username,
		orgName: orgName
	}, app.get('secret'));

	ClientUtils.init();
	ClientUtils.getClientUser(orgName, username, password)
	.then((response) => {
		logger.debug('-- returned from registering (logging in) the username %s for organization %s',username,orgName);
		if (response && typeof response !== 'string') {
			var resp = {};
			resp.token = token;
			resp.success = true;
			if (response._enrollmentSecret && response._enrollmentSecret.length > 0) {
				logger.debug('Successfully registered the username %s for organization %s',username,orgName);
				resp.secret = response._enrollmentSecret;
				resp.message = 'Registration successful';
			} else {
				logger.debug('Successfully enrolled the username %s for organization %s',username,orgName);
				resp.message = 'Login successful';
			}
			res.json(resp);
		} else {
			logger.debug('Failed to register the username %s for organization %s with::%s',username,orgName,response);
			var message = 'Registration/login failed';
			if (response) {
				message = JSON.stringify(response);
			}
			res.json({success: false, message: message});
		}
	})
	.catch((err) => {
		console.error(err);
		logger.debug('Failed to register username %s for organization %s with::%s',username,orgName,err.message);
		res.json({success: false, message: err.message});
	});

});

// Create Channel
app.post('/channel/create', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	createChannel.createChannel(Constants.CHANNEL_NAME).then(() => {
		res.json({success: true, message: 'Channel created'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
});

// Join Channel
app.post('/channel/join', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	joinChannel.processJoinChannel().then(() => {
		res.json({success: true, message: 'Channel joined'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
});

// Add an Organization and Peer to the Channel
app.post('/channel/addorg', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< A D D  O R G  A N D  P E E R  T O  C H A N N E L >>>>>>>>>>>>>>>>>');
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	// Update the channel configuration, and then join the new org's peer to the channel
	upgradeChannel.upgradeChannel(Constants.CHANNEL_NAME).then(() => {
		// Update the configuration settings
		Constants.networkConfig = '../middleware/config_upgrade.json';
		var Client = require('fabric-client');
		Client.addConfigFile(path.join(__dirname, Constants.networkConfig));
		var ORGS = Client.getConfigSetting(Constants.networkId);
		return joinChannel.joinChannel('exportingentityorg', ORGS, Constants);
	}, (err) => {
		res.json({success: false, message: err.message});
	}).then(() => {
		res.json({success: true, message: 'New Organization and Peer Added to Channel'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
});

// Install chaincode on target peers
app.post('/chaincode/install', async function(req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	var ccpath = req.body.ccpath;
	if (!ccpath) {
		res.json(getErrorMessage('\'ccpath\''));
		return;
	}
	var ccversion = req.body.ccversion;
	if (!ccversion) {
		res.json(getErrorMessage('\'ccversion\''));
		return;
	}
	installCC.installChaincode(ccpath, ccversion).then(() => {
		res.json({success: true, message: 'Chaincode installed'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
});

// Instantiate chaincode on channel
app.post('/chaincode/instantiate', async function(req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	var ccpath = req.body.ccpath;
	if (!ccpath) {
		res.json(getErrorMessage('\'ccpath\''));
		return;
	}
	var ccversion = req.body.ccversion;
	if (!ccversion) {
		res.json(getErrorMessage('\'ccversion\''));
		return;
	}
	var args = req.body.args;
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	logger.debug('args  : ' + args);

	instantiateCC.instantiateOrUpgradeChaincode(req.orgname, ccpath, ccversion, 'init', args, false)
	.then(() => {
		res.json({success: true, message: 'Chaincode instantiated'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
	ClientUtils.txEventsCleanup();
});

// Install new chaincode version on network peers and upgrade it on the channel
app.post('/chaincode/upgrade', async function(req, res) {
	logger.debug('==================== UPGRADE CHAINCODE ==================');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);
	if (req.username !== 'admin') {
		res.statusCode = 403;
		res.send('Not an admin user: ' + req.username);
		return;
	}

	var ccpath = req.body.ccpath;
	if (!ccpath) {
		res.json(getErrorMessage('\'ccpath\''));
		return;
	}
	var ccversion = req.body.ccversion;
	if (!ccversion) {
		res.json(getErrorMessage('\'ccversion\''));
		return;
	}
	var args = req.body.args;
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	logger.debug('args  : ' + args);

	// Update the configuration settings
	Constants.networkConfig = '../middleware/config_upgrade.json';
	Constants.TRANSACTION_ENDORSEMENT_POLICY = Constants.ALL_FIVE_ORG_MEMBERS;

	// Install and then upgrade the chaincode
	installCC.installChaincode(ccpath, ccversion, Constants).then(() => {
		return instantiateCC.instantiateOrUpgradeChaincode(req.orgname, ccpath, ccversion, 'init', args, true, Constants);
	}, (err) => {
		res.json({success: false, message: err.message});
	}).then(() => {
		res.json({success: true, message: 'New version of Chaincode installed and upgraded'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
	ClientUtils.txEventsCleanup();
});

// Invoke transaction on chaincode on network peers
app.post('/chaincode/:fcn', async function(req, res) {
	logger.debug('==================== INVOKE ON CHAINCODE ==================');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	var ccversion = req.body.ccversion;
	if (!ccversion) {
		res.json(getErrorMessage('\'ccversion\''));
		return;
	}

	var fcn = req.params.fcn;
	var args = req.body.args;
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	logger.debug('args  : ' + args);

	invokeCC.invokeChaincode(req.orgname, ccversion, fcn, args, req.username).then(() => {
		res.json({success: true, message: 'Chaincode invoked'});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
	ClientUtils.txEventsCleanup();
});

// Query on chaincode on network peers
app.get('/chaincode/:fcn', async function(req, res) {
	logger.debug('==================== QUERY BY CHAINCODE ==================');
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	var ccversion = req.body.ccversion;
	if (!ccversion) {
		res.json(getErrorMessage('\'ccversion\''));
		return;
	}

	var fcn = req.params.fcn;
	var args = req.body.args;
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	logger.debug('args  : ' + args);

	queryCC.queryChaincode(req.orgname, ccversion, fcn, args).then((result) => {
		res.json({success: true, message: result});
	}, (err) => {
		res.json({success: false, message: err.message});
	});
	ClientUtils.txEventsCleanup();
});
