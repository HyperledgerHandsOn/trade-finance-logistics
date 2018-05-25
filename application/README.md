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
- __/login__: Login an existing user or register a new one
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `content-type: application/x-www-form-urlencoded` (FORM DATA)
  * _Body_: `username=<string>&orgName=<string>[&password=<string>]`
    * `orgName` can be one of the following: {`exporterorg`, `importerorg`, `carrierorg`, `regulatororg`} in the initial version of the application
    * After you add a new organization to the channel, you can also use `exportingentityorg`
    * The `password` MUST be specified if and only if the `username` is `admin`.
    * In our back-end, the `admin` password is hardcoded to `adminpw`, so this feature is only for demonstration (and not production) purposes.
    * The purpose of exercising this API is to obtain a JWT token for subsequent session authentication for other operations.
    * Certain API functions are restricted to `admin` users, so you will need to login as an `admin` and use the returned JWT token.
  * _Access Control_: None
  * _Return Value_: 200 status code upon success or miscellaneous error
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>,
        "secret": <intermediate registration password>,
        "token": <JSON Web Token for Session Authentication>
    }
    ```
    * The `secret` and `token` will be present only if `success` is `true`.
    * The `secret` is just for your information. It's for temporary use during registration to get the enrollment certificate. It will also be present in the above JSON ony if this is a registration and not a login of an existing user.

- __/channel/create__: Create a channel named `tradechannel` on the peer network of 4 organizations
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Body_: None
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/channel/join__: Join the peers of the 4 organizations to `tradechannel`
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Body_: None
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/channel/addorg__: Add `exportingentityorg` organization and its peer to `tradechannel`
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Body_: None
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/chaincode/install__: Install the chaincode on the peers joined to `tradechannel`
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Header_: `content-type: application/json` (JSON)
  * _Body_:
    ```
    {
        "ccpath": <relative path of chaincode folder>,
        "ccversion": <string>
    }
    ```
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/chaincode/instantiate__: Instantiate the chaincode on `tradechannel`
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Header_: `content-type: application/json` (JSON)
  * _Body_:
    ```
    {
        "ccpath": <relative path of chaincode folder>,
        "ccversion": <string>,
        "args": <array-of-strings>
    }
    ```
    * `args` refers to the arguments list expected by the chaincode's `Init` function
    * A chaincode function name is not needed here as the `init` vale us hardcoded in the middleware, and is anyway irrelevant to the chaincode
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/chaincode/upgrade__: Install and upgrade the chaincode to a new version on `tradechannel`
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Header_: `content-type: application/json` (JSON)
  * _Body_:
    ```
    {
        "ccpath": <relative path of chaincode folder>,
        "ccversion": <string>,
        "args": <array-of-strings>
    }
    ```
    * `args` refers to the arguments list expected by the chaincode's `Init` function
    * A chaincode function name is not needed here as the `init` vale us hardcoded in the middleware, and is anyway irrelevant to the chaincode
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or 403 upon authentication failure
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/chaincode/<function>__: Invoke `<function>` on the chaincode
  * _Method_: POST
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Header_: `content-type: application/json` (JSON)
  * _Body_:
    ```
    {
        "ccversion": <string>,
        "args": <array-of-strings>
    }
    ```
    * `args` refers to the arguments list expected by the chaincode's `<function>` function
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or miscellaneous error
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```

- __/chaincode/<function>__: Query `<function>` on the chaincode
  * _Method_: GET
  * _URL Parameters_: None
  * _Header_: `authorization: Bearer <JSON Web Token>`
  * _Header_: `content-type: application/json` (JSON)
  * _Body_:
    ```
    {
        "ccversion": <string>,
        "args": <array-of-strings>
    }
    ```
    * `args` refers to the arguments list expected by the chaincode's `<function>` function
  * _Access Control_: Only `admin` user
  * _Return Value_: 200 status code upon success or miscellaneous error
    * If 200: return value is a JSON:
    ```
    {
        "success": <boolean>,
        "message": <string>
    }
    ```
    * If the query is successful, `message` will contain the result


# Sample Instructions (Script)
Pre-requisites:
- Make sure you have `curl` installed in your system.
- Make sure you have the initial 4-org [network](../ntwork/) up and running.

In a terminal window:
- __Register or log in an `admin` user to `importerorg` (IMPORTER organization)__
  ```
  curl -s -X POST http://localhost:4000/users -H "content-type: application/x-www-form-urlencoded" -d 'username=admin&orgName=importerorg&password=adminpw'
  ```
  * If the user is already registered, you should see something like the following:
  ```
  {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM","success":true,"message":"Login successful"}
  ```
  * Otherwise, you should see something like the following:
  ```
  `{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM","success":true,"secret":"JXjhiYyMomkS","message":"Registration successful"}`
  ```
  * Let's assume the latter was the result. Save the `token` value for use in the commands below.


- __Create the trade channel__
  ```
  curl -s -X POST http://localhost:4000/channel/create -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM"
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"Channel created"}
  ```


- __Join peers of the first 4 organizations to the trade channel__
  ```
  curl -s -X POST http://localhost:4000/channel/join -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM"
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"Channel joined"}
  ```


- __Install the initial version of the trade chaincode on the peers__
  ```
  curl -s -X POST http://localhost:4000/chaincode/install -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM" -d '{ "ccpath": "github.com/trade_workflow", "ccversion": "v0" }'
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"Chaincode installed"}
  ```


- __Instantiate the initial version of the trade chaincode on the trade channel__
  ```
  curl -s -X POST http://localhost:4000/chaincode/instantiate -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM" -d '{ "ccpath": "github.com/trade_workflow", "ccversion": "v0", "args": ["LumberInc", "LumberBank", "100000", "WoodenToys", "ToyBank", "200000", "UniversalFrieght", "ForestryDepartment"] }'
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"Chaincode instantiated"}
  ```

- __Log in an existing user `Jim` to `importerorg` (IMPORTER organization)__
  ```
  curl -s -X POST http://localhost:4000/login -H "content-type: application/x-www-form-urlencoded" -d 'username=Jim&orgName=importerorg'
  ```
  * If this is successful, you should see something like:
  ```
  {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzUzODQsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImltcG9ydGVyb3JnIiwiaWF0IjoxNTI3MjMxMjQ0fQ.CfV7BCr-bKzP-hqpdvSjHnXqnms6f36lXhyUsTK8yTQ","success":true,"message":"Login successful"}
  ```
  * Just for testing, you can register a new user `Bob` to `importerorg`:
  ```
  curl -s -X POST http://localhost:4000/login -H "content-type: application/x-www-form-urlencoded" -d 'username=Bob&orgName=importerorg'
  ```
  * If this is successful, you should see something like:
  ```
  {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzU0NTEsInVzZXJuYW1lIjoiQm9iIiwib3JnTmFtZSI6ImltcG9ydGVyb3JnIiwiaWF0IjoxNTI3MjMxMzExfQ.7cEzCSdldiEuYjueLIfHb9PhJHm75MP-qpdQ77e_9Ts","success":true,"secret":"WaUGtKDwGfgC","message":"Registration successful"}
  ```
  * We will use user `Jim`'s handle to run chaincode transactions below


- __Invoke a trade request by an importer__
  ```
  curl -s -X POST http://localhost:4000/chaincode/requestTrade -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzUzODQsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImltcG9ydGVyb3JnIiwiaWF0IjoxNTI3MjMxMjQ0fQ.CfV7BCr-bKzP-hqpdvSjHnXqnms6f36lXhyUsTK8yTQ" -d '{ "ccversion": "v0", "args": ["2ks89j9", "50000","Wood for Toys"] }'
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"Chaincode invoked"}
  ```


- __Query the status of the trade request by an importer__
  ```
  curl -s -X GET http://localhost:4000/chaincode/getTradeStatus -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzUzODQsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImltcG9ydGVyb3JnIiwiaWF0IjoxNTI3MjMxMjQ0fQ.CfV7BCr-bKzP-hqpdvSjHnXqnms6f36lXhyUsTK8yTQ" -d '{ "ccversion": "v0", "args": ["2ks89j9"] }'
  ```
  * If this is successful, you should see something like:
  ```
  {"success":true,"message":"{\"Status\":\"REQUESTED\"}"}
  ```


- __Add a new organization (exporting entity) and its peer to the channel__
  * Make sure you have the network peer and MSP for the new organization up and running.

  * __Update the channel configuration and join a new peer to the network__
    * Perform this operation as the `admin` user of `importerorg`, whose JWT token we already possess.
    ```
    curl -s -X POST http://localhost:4000/channel/addorg -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM"
    ```
    * If this is successful, you should see something like:
    ```
    {"success":true,"message":"New Organization and Peer Added to Channel"}
    ```


  * __Upgrade chaincode to accommodate the new organization__
    * Perform this operation as the `admin` user of `importerorg`, whose JWT token we already possess.
    ```
    curl -s -X POST http://localhost:4000/chaincode/upgrade -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzQzMTgsInVzZXJuYW1lIjoiYWRtaW4iLCJvcmdOYW1lIjoiaW1wb3J0ZXJvcmciLCJpYXQiOjE1MjcyMzAxNzh9.nHTxkdFb1NlGaAunECtak25yn9hXxiuX686KoF9A8AM" -d '{ "ccpath": "github.com/trade_workflow_v1", "ccversion": "v1", "args": [] }'
    ```
    * If this is successful, you should see something like:
    ```
    {"success":true,"message":"New version of Chaincode installed and upgraded"}
    ```


  * __Invoke a trade request acceptance by an exporting entity__
    * Register user `Tom` in `exportingentityorg` (EXPORTING ENTITY organization)
    ```
    curl -s -X POST http://localhost:4000/login -H "content-type: application/x-www-form-urlencoded" -d 'username=Tom&orgName=exportingentityorg'
    ```
    * If this is successful, you should see something like:
    ```
    {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyNTE3MzMsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImV4cG9ydGluZ2VudGl0eW9yZyIsImlhdCI6MTUyNzI0NzU5M30.HxuL744Mw77MxIlBIwfmgia4_y1YiqDNtIMJQhJFY84","success":true,"secret":"BQNqVfPYVfzu","message":"Registration successful"}
    ```
    * Run the invocation
    ```
    curl -s -X POST http://localhost:4000/chaincode/acceptTrade -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyNTE3MzMsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImV4cG9ydGluZ2VudGl0eW9yZyIsImlhdCI6MTUyNzI0NzU5M30.HxuL744Mw77MxIlBIwfmgia4_y1YiqDNtIMJQhJFY84" -d '{ "ccversion": "v1", "args": ["2ks89j9"] }'
    ```
    * If this is successful, you should see something like:
    ```
    {"success":true,"message":"Chaincode invoked"}
    ```


  * __Query the status of the trade request by an importer__
    * We will query as user `Jim` in `importerorg` (whose JWT token we already possess)
    ```
    curl -s -X GET http://localhost:4000/chaincode/getTradeStatus -H "content-type: application/json" -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjcyMzUzODQsInVzZXJuYW1lIjoiSmltIiwib3JnTmFtZSI6ImltcG9ydGVyb3JnIiwiaWF0IjoxNTI3MjMxMjQ0fQ.CfV7BCr-bKzP-hqpdvSjHnXqnms6f36lXhyUsTK8yTQ" -d '{ "ccversion": "v0", "args": ["2ks89j9"] }'
    ```
    * If this is successful, you should see something like:
    ```
    {"success":true,"message":"{\"Status\":\"ACCEPTED\"}"}
    ```
