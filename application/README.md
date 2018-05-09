# Web application to expose smart contract capabilities to the end user
This starts a web server and exposes the middleware operations through a REST API.

# Setup instructions
Run `npm install`

# Run instructions
In one terminal window:
- Run `node app.js` to start the web server and listen to requests on port 4000.
In another terminal window:
- Run `curl` commands to send requests to the web server
- To sign up or log in a user to a given org, run `curl -s -X POST http://localhost:4000/users -H "content-type: application/x-www-form-urlencoded" -d 'username=<user-id>&orgName=<org-name>'
  (`<org-name>` can be one of the following: {`exporterorg`, `importerorg`, `carrierorg`, `regulatororg`}
_Further code and instructions to come._
