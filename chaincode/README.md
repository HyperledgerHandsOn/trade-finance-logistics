# Prerequisites
- Make sure you have `docker` and `docker-compose` tools installed on your system.
- Make sure your system has `make` installed.   
  For Windows system, install make from: http://gnuwin32.sourceforge.net/packages/make.htm


# Build Chaincode
From root directory of project, run `make chaincode`


# Unit Test Chaincode
From root directory of project, run `make chaincode_test`


# Run Chaincode in Net Mode
In this mode, your chaincode will be installed and invoked as part of a larger distributed application.   

## Prerequisites
- Make sure that access control is **enabled** within the chaincode by setting the value of `TradeWorkflowChaincode.testMode` to `false`.
  * In both [trade_workflow/tradeWorkflow.go](./src/github.com/trade_workflow/tradeWorkflow.go) and [trade_workflow_v1/tradeWorkflow.go](./src/github.com/trade_workflow_v1/tradeWorkflow.go), this is set in the `main` function as follows:
    ```
	func main() {
		twc := new(TradeWorkflowChaincode)
		twc.testMode = false
		err := shim.Start(twc)
		if err != nil {
			fmt.Printf("Error starting Trade Workflow chaincode: %s", err)
		}
	}
    ```

## Launch the Network and Application
- Follow instructions in [network](../network/), [middleware](../middleware/), and [application](../application) in sequence.


# Run Chaincode in Dev Mode
In this mode, you will manually install and invoke the chaincode using CLI (Command-Line Interface) commands.   

## Prerequisites
- Make sure that access control is **disabled** within the chaincode by setting the value of `TradeWorkflowChaincode.testMode` to `true`.
  * In both [trade_workflow/tradeWorkflow.go](./src/github.com/trade_workflow/tradeWorkflow.go) and [trade_workflow_v1/tradeWorkflow.go](./src/github.com/trade_workflow_v1/tradeWorkflow.go), this is set in the `main` function as follows:
    ```
	func main() {
		twc := new(TradeWorkflowChaincode)
		twc.testMode = true
		err := shim.Start(twc)
		if err != nil {
			fmt.Printf("Error starting Trade Workflow chaincode: %s", err)
		}
	}
    ```

## Start the Blockchain Network
- Navigate to the [network](../network/) folder and run `./trade.sh up -d true`.
- This will first create cryptographic material for the network participants and channel artifacts
- It will then start a network of 5 docker containers:
  * An orderer
  * A peer running in dev-mode.
  * A Fabric-CA instance to create identities and credentials.
  * A container to build and launch the chaincode
  * A container to run CLI commands
    - To create a blockchain channel named `tradechannel`
    - To install, instantiate, and invoke the chaincode on this channel

## Build and Run Chaincode
- Compile the chaincode by running the following commands in sequence:
  * `docker exec -it chaincode bash` (Log into the chaincode container)
  * `cd trade_workflow_v1`
  * `go build` (Compile chaincode to generate an executable)
- Launch the chaincode by running the following command in the container:
  * `CORE_PEER_ADDRESS=peer:7052 CORE_CHAINCODE_ID_NAME=tw:0 ./trade_workflow_v1`

## Install and Instantiate Chaincode
- Connect to the CLI container and install the chaincode with the name `tw` and version `0`:
  * `docker exec -it cli bash` (Log into the CLI container)
  * `peer chaincode install -p chaincodedev/chaincode/trade_workflow_v1 -n tw -v 0`
- Instantiate this chaincode
  * `peer chaincode instantiate -n tw -v 0 -c '{"Args":["init","LumberInc","LumberBank","100000","WoodenToys","ToyBank","200000","UniversalFreight","ForestryDepartment"]}' -C tradechannel`

## Invoke Chaincode
- Make sure you are still logged into the CLI container (or log back in if you exited it)
- To test the chaincode, try to record a trade agreement request with ID `trade-12` on the ledger:
  * `peer chaincode invoke -n tw -c '{"Args":["requestTrade", "trade-12", "50000", "Wood for Toys"]}' -C tradechannel`
  * Watch the console logs for information and errors (if any)
- If the above invocation succeeded, query the chaincode for the status of the trade agreement request:
  * `peer chaincode invoke -n tw -c '{"Args":["getTradeStatus", "trade-12"]}' -C tradechannel`
  * The chaincode should return the status `REQUESTED`, which you should see in the console logs.
- You can run other chaincode invocations and queries as per the API.
