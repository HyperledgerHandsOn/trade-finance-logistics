# Testing attribute-based access-control  
  
The following set of instructions are meant to be an extension of the **Access Control** section of **Chapter 4: Designing a Data and Transaction Model with Golang**.  The section on access control in the book covers the concept of `attribute based access control` or ABAC for short.  This git page is meant to provide a complementary practical exercise.  
  
If you have followed the instructions within the chapter, you should currently have a running network in development mode.  Furthermore, you should have a running chaincode container and have succesfully invoked the `requestTrade` function using the `peer chaincode invoke .....` command.

A quick `docker ps` should return a list of 5 docker containers:  
 * cli
 * chaincode
 * peer
 * ca
 * orderer

If this is the case then you are ready to proceed further. Should you not have those containers running we suggest that you go back to the **Starting the chaincode development** section of Chapter 4.

## Creating additional identities

The first thing we will do is create additional identities to test the new attribute.  As you may remember, the network's pre-built identities were created using `cryptogen`.  While this tool is really useful to create identities for a test network, you need to use the `fabric-ca` in order to generate certificates with custom attributes.

In order to create the new identity we provide a custom script.  Let's first run it and we will then look at what it did:
1. Open a session in the `cli` container: `docker exec -ti cli bash`
2. From the opened session run the following command: `/opt/trade/createIdentity.sh`

The result should look something like:  
  
```
root@404ed65b3edc:/opt/gopath/src/chaincodedev# /opt/trade/createIdentity.sh 
2018/07/15 20:35:48 [INFO] Created a default configuration file at /root/.fabric-ca-client/fabric-ca-client-config.yaml
2018/07/15 20:35:48 [INFO] generating key: &{A:ecdsa S:256}
2018/07/15 20:35:48 [INFO] encoded CSR
2018/07/15 20:35:48 [INFO] Stored client certificate at /root/.fabric-ca-client/admin/signcerts/cert.pem
2018/07/15 20:35:48 [INFO] Stored root CA certificate at /root/.fabric-ca-client/admin/cacerts/ca-7054.pem
2018/07/15 20:35:48 [INFO] Stored intermediate CA certificates at /root/.fabric-ca-client/admin/intermediatecerts/ca-7054.pem
2018/07/15 20:35:48 [INFO] Configuration file location: /root/.fabric-ca-client/fabric-ca-client-config.yaml
Password: pwd1
2018/07/15 20:35:48 [INFO] generating key: &{A:ecdsa S:256}
2018/07/15 20:35:48 [INFO] encoded CSR
2018/07/15 20:35:48 [INFO] Stored client certificate at /root/.fabric-ca-client/importer/signcerts/cert.pem
2018/07/15 20:35:48 [INFO] Stored root CA certificate at /root/.fabric-ca-client/importer/cacerts/ca-7054.pem
2018/07/15 20:35:48 [INFO] Stored intermediate CA certificates at /root/.fabric-ca-client/importer/intermediatecerts/ca-7054.pem
```
  
Now, let's take a look at an extract of `network/devmode/createIdentity.sh`:  
  
```
fabric-ca-client enroll -u http://admin:adminpw@ca:7054 --mspdir admin

fabric-ca-client register --id.name ${ORG_NAME} --id.secret pwd1 --id.type user \
    --id.attrs "tradelimit=10000:ecert" -u http://ca:7054

fabric-ca-client enroll -u http://${ORG_NAME}:pwd1@ca:7054 \
    --enrollment.attrs "tradelimit,email:opt" --mspdir ${ORG_NAME}

mkdir ~/.fabric-ca-client/${ORG_NAME}/admincerts
cp -p ~/.fabric-ca-client/${ORG_NAME}/signcerts/*  ~/.fabric-ca-client/${ORG_NAME}/admincerts
```  
  
The first command enrolls the administrator.  The `admin`/`adminpw` combo has been defined by the `cryptogen` process.  Note the parameter `--mspdir` that is used to store the resulting certificates under the `/root/.fabric-ca-client/admin` folder.

With the admin enrolled, we can now register the new identity for the organization (`importer` by default).  The main parameter to pay attention to is ` --enrollment.attrs "tradelimit,email:opt"`.  This is where the administrator can set the custom attributes (`tradelimit`) in our case.

Once the identity is registered, normally the enrollment credentials would be sent to the owner and the last command would be issued to enroll the user.  Note that the user must specify the attributes that he wants to include in the certificate.  As this is just an exercise, the enrollment immediately follows the `register` command.  Also note that the certificates will now be stored in a folder `/root/.fabric-ca-client/importer`.

Finally, we move the signing certificates into a directory called `admincerts`.  This essentially tells the `peer` command to treat this identity as an admin.  However, it does not confer administrative privilege at the network level.

With the additional identities created we can now modify the chaincode to make use of them.
  
 ## Modifying the chaincode to validate the new attribute

In order to validate the tradelimit that we've set on our new identity we will have to modify two files:  
* `accessControlUtils.go`: Add a new function to retrieve the custom attributes
* `tradeWorkflow.go`: Add logic to check the trade creation against the limit authorized for the user.

In `accessControlsUtils.go`:
```
func getCustomAttribute(stub shim.ChaincodeStubInterface, attr string) (string, bool, error) {
	var value string
	var found bool
	var err error

	value, found, err = cid.GetAttributeValue(stub, attr)
	if err != nil {
		fmt.Printf("Error getting MSP identity: %s\n", err.Error())
		return "", found, err
	}

	return value, found, nil
}
```

In the `requestTrade` function in `tradeWorkflow.go`, locate the marker `// ADD TRADELIMIT RETRIEVAL HERE` and add this code:
  
````
	var tradelimit int
	var attribute = "tradelimit"
	var value string
	var found bool
	value, found, err = getCustomAttribute(stub, attribute)
	if found {
		fmt.Printf("Custom attribute %s was found with value %s\n", attribute, value)

		tradelimit, err = strconv.Atoi(string(value))
		if err != nil {
			return shim.Error(err.Error())
		}
	} else {
		fmt.Printf("Custom attribute %s was not found\n", attribute)
		tradelimit=1000000
	}
````
This code leverages the function defined in `accessControlUtils.go` to retrieve the trade limit.  If the trade limit is not found then the code sets a default value of 1,000,000.00.  (*Note*: This is done to make sure that the remainder of the code in subsequent chapters will not be impacted by this attribute.)

Them find the marker `// ADD TRADE LIMIT CHECK HERE` and add this code:

````
	if (amount > tradelimit) {
		err = errors.New(fmt.Sprintf("Caller trade limit authorization is set at %d. Access denied.", tradelimit))
		return shim.Error(err.Error())
	}
````
This is now just a simple integer check to make sure that the amount in the request is lower to the limit.  If not it returns an error.

Save both files and move to the next section.
  
## Restarting the chaincode
You should still have a session opened from the `chaincode` container.  In that session we now need to:
1. Hit `CTRL-C` to stop the running chaincode
2. Run `go build` to rebuild the chaincode with our new logic
3. Restart the chaincode using `CORE_PEER_ADDRESS=peer:7052 CORE_CHAINCODE_ID_NAME=tw:0 ./trade_workflow_v1`

This is the power of the dev mode.  No need to reinstall the chaincode or re-instantiate.  The ledger remains in the same state as it was before the restart (unless you explicitly delete ledger files or bring down the docker containers.) The system is ready to test our new code.  Note that in a multi-org system, the discrepancies between chaincode versions would automatically be picked up since not all organization would be running the same code... dev mode is only useful and functional for a single organization that is testing smart contract upgrades.  In a multi-org production application, you should follow a distributed installation and instantiation procedure of the kind implemented in [middleware](../middleware/).   

## Testing our modification

We are now ready to test our changes.  For the first invocation, we will test using the admin identity which does not have any limit set and so will be subject to the default of 1,000,000:
`peer chaincode invoke -n tw -c '{"Args":["requestTrade", "trade-12", "50000000", "Wood for Toys"]}' -C tradechannel`

The result should be an error and look something like:
```
2018-07-15 20:03:42.881 UTC [msp/identity] Sign -> DEBU 062 Sign: plaintext: 0AC0080A6808031A0C089ED1AEDA0510...300A0D576F6F6420666F7220546F7973 
2018-07-15 20:03:42.881 UTC [msp/identity] Sign -> DEBU 063 Sign: digest: 5E9B1390E96E6111BAEC88BC53010B983F90CB21B611DDD2CF36F077EA6B6EF5 
Error: Error endorsing invoke: rpc error: code = Unknown desc = chaincode error (status: 500, message: Caller trade limit authorization is set at 1000. Access denied.) - <nil>
Usage:
  peer chaincode invoke [flags]
[...]
```

We will now run the same transaction but under the `importer` identity:
1. Run `export CORE_PEER_MSPCONFIGPATH=/root/.fabric-ca-client/importer`
2. Run `peer chaincode invoke -n tw -c '{"Args":["requestTrade", "trade-13", "500", "Wood for Toys"]}' -C tradechannel`

The result should look something like:
```
2018-07-15 20:03:54.208 UTC [msp/identity] Sign -> DEBU 064 Sign: plaintext: 0ABF080A6708031A0B08AAD1AEDA0510...7DF54C80AF890BB8F277A934365AEE37 
2018-07-15 20:03:54.208 UTC [msp/identity] Sign -> DEBU 065 Sign: digest: D72C490C887BAEC033C9D9A5D73AAE1DF2963E461B64BD2A1230DA629BC976ED 
2018-07-15 20:03:54.213 UTC [chaincodeCmd] chaincodeInvokeOrQuery -> DEBU 066 ESCC invoke result: version:1 response:<status:200 message:"OK" > payload:"\n \371\310\221\013\236P0d|\\\363r\300P\366-T\346\r2\261\241\260F\240\016;\352\243;\2173\022\227\001\n\206\001\022\022\n\004lscc\022\n\n\010\n\002tw\022\002\010\001\022p\n\002tw\022j\032h\n\020\000Trade\000trade-13\000\032T{\"amount\":500,\"descriptionOfGoods\":\"Wood for Toys\",\"status\":\"REQUESTED\",\"payment\":0}\032\003\010\310\001\"\007\022\002tw\032\0010" endorsement:<endorser:"\n\tDevOrgMSP\022\226\006-----BEGIN CERTIFICATE-----\nMIICGTCCAcCgAwIBAgIRAKJWFN7NPV/vMm9QFi+dm1kwCgYIKoZIzj0EAwIwczEL\nMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBG\ncmFuY2lzY28xGTAXBgNVBAoTEGRldm9yZy50cmFkZS5jb20xHDAaBgNVBAMTE2Nh\nLmRldm9yZy50cmFkZS5jb20wHhcNMTgwNzE1MTk0OTU4WhcNMjgwNzEyMTk0OTU4\nWjBbMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMN\nU2FuIEZyYW5jaXNjbzEfMB0GA1UEAxMWcGVlcjAuZGV2b3JnLnRyYWRlLmNvbTBZ\nMBMGByqGSM49AgEGCCqGSM49AwEHA0IABNpW7Hw1gUgGzv1QcjGxHVMNUbtevpvF\n6ypbJT6ZmC9yGjb9ofKq5k8rCyUCrWrJq3bvjhRuR/5rVuDo3M02qC+jTTBLMA4G\nA1UdDwEB/wQEAwIHgDAMBgNVHRMBAf8EAjAAMCsGA1UdIwQkMCKAIM7xGZMiaHOL\nJDBec9ngJFYGzvyhziaWMDN2vyA4PrJhMAoGCCqGSM49BAMCA0cAMEQCICzGj+JS\n7ItRviH1cJC2qkS/CxlFuBNKhBY5T+jkF6/bAiBlD9krfybnffZn6JQXXqtAheoX\nKUPt5K8cfwkLvKdoTw==\n-----END CERTIFICATE-----\n" signature:"0D\002 !><u\204\362\325\216j!\243\317\200\231d\325hnf\352^+~i\207\007gv\304!\257\017\002 \036\300h\323\274\207\324\211XRA\336\204,\361d}\365L\200\257\211\013\270\362w\25146Z\3567" > 
2018-07-15 20:03:54.214 UTC [chaincodeCmd] chaincodeInvokeOrQuery -> INFO 067 Chaincode invoke successful. result: status:200 
2018-07-15 20:03:54.214 UTC [main] main -> INFO 068 Exiting.....
```
