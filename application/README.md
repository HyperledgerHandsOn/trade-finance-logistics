# Web Application with User Interaction 
The [smart contract](../chaincode/) code is sensitive and is therefore wrapped and guarded by the [middleware](../middleware).   
The middleware also exposes some sensitive operations involving channel configuration and chaincode installation.   
Therefore, the safe and proper way to expose application capabilities to the end user is through a web application.   

The code in this folder is for starting a NodeJS web server and exposing a REST API to the user.   
_Note_: In a production scenario, you should run different applications (servers) for different organizations and user roles (trading parties, banks, carrier, regulator)

# Pre-requisites to Run and Interact with the Web Server
- Install `node` and `npm` on your system if you don't have them.
  * This code was developed and run with `node` version `9.8.0` and `npm` version `5.7.1` respectively.
  * _Note_: Older and newer versions may also work, but they are not guaranteed to do so.
- Run `npm install` to install the dependencies.

# Start the web server
In a terminal window:
- Run `node app.js`
- The web server will listen for incoming HTTP requests on port 4000.
- _Note_: In a production scenario, you should run the server only in HTTPS mode.

# REST API
- */login*: Login an existing user or register a new one
  * _Method_: POST
  * _URL Parameters_: None
  * _Headers_: `content-type: application/x-www-form-urlencoded`
  * _Body Parameters_: `username=<string>&orgName=<string>[&password=<string>]`
    * The `password` MUST be specified if and only if the `username` is `admin`.
    * In our back-end, the `admin` password is hardcoded to `adminpw`, so this feature is only for demonstration (and not production) purposes.
    * The purpose of exercising this API is to obtain a JWT token for subsequent session authentication for other operations.
    * Certain API functions are restricted to `admin` users, so you will need to login as an `admin` and use the returned JWT token.
  * _Access Control_: None

# Sample Instructions (Script)
Pre-requisites:
- Make sure you have `curl` installed in your system.

In a terminal window:
- Register or log in an `admin` user to the `importerorg` organization (IMPORTER organization)
  * `curl -s -X POST http://localhost:4000/users -H "content-type: application/x-www-form-urlencoded" -d 'username=admin&orgName=importerorg&password=adminpw'
  * `orgName` can be one of the following: {`exporterorg`, `importerorg`, `carrierorg`, `regulatororg`} in the initial version of the application
  * After you add a new organization to the channel, you can also use `exportingentityorg`
_Further code and instructions to come._
