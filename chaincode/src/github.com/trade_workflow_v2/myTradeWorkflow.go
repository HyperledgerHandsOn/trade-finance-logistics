package trade_workflow_v2

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// TradeWorkflowChaincode ...
type TradeWorkflowChaincode struct {
	testMode bool
}

// Init ...
func (t *TradeWorkflowChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Initializing Trade Workflow")
	_, args := stub.GetFunctionAndParameters()
	var err error

	if len(args) == 0 {
		return shim.Success(nil)
	}

	if len(args) != 8 {
		err = errors.New(fmt.Sprintf("Incorrect number of arguments. Expecting 8: {"+
			"Exporter, "+
			"Exporter's Bank, "+
			"Exporter's Account Balance, "+
			"Importer, "+
			"Importer's Bank, "+
			"Importer's Account Balance, "+
			"Carrier, "+
			"Regulatory Authority"+
			"}. Found %d", len(args)))

		return shim.Error(err.Error())
	}

	_, err = strconv.Atoi(string(args[2]))
	if err != nil {
		fmt.Printf("Exporter's account balance must be an integer. Found %s\n", args[2])
		return shim.Error(err.Error())
	}

	_, err = strconv.Atoi(string(args[5]))
	if err != nil {
		fmt.Printf("Importer's account balance must be an integer. Found %s\n", args[5])
		return shim.Error(err.Error())
	}

	fmt.Printf("Exporter: %s\n", args[0])
	fmt.Printf("Exporter's Bank: %s\n", args[1])
	fmt.Printf("Exporter's Account Balance: %s\n", args[2])
	fmt.Printf("Importer: %s\n", args[3])
	fmt.Printf("Importer's Bank: %s\n", args[4])
	fmt.Printf("Importer's Account Balance: %s\n", args[5])
	fmt.Printf("Carrier: %s\n", args[6])
	fmt.Printf("Regulatory Authority: %s\n", args[7])

	roleKeys := []string{expKey, ebKey, expBalKey, impKey, ibKey, impBalKey, carKey, raKey}
	for i, rolekey := range roleKeys {
		err = stub.PutState(rolekey, []byte(args[i]))
		if err != nil {
			_ = fmt.Errorf("error recording key %s: %s", rolekey, err.Error())
			return shim.Error(err.Error())
		}
	}
	return shim.Success(nil)
}

// Invoke ...
func (t *TradeWorkflowChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Tradeworkflow Invoke")
	function, args := stub.GetFunctionAndParameters()
	switch function {
	case "requestTrade":
		return t.requestTrade(stub, creatorOrg, creatorCertIssuer, args)
	case "acceptTrade":
		return t.acceptTrade(stub, creatorOrg, creatorCertIssuer, args)
	case "acceptTrade":
		return t.acceptTrade(stub, creatorOrg, creatorCertIssuer, args)
	}
	return shim.Success(nil)
}

func (t *TradeWorkflowChaincode) requestTrade(stub shim.ChaincodeStub, creatorOrg string, issuer string, args []string) pb.Response {
	var tradekey string
	var tradeAgreement *TradeAgreement
	var tradeAgreementBytes []byte
	var amount int
	var err error

	if !test.Mode && !authenticateImporterOrg(creatorOrg, issuer) {
		return shim.Error("caller not a member of Importer org. Access denied")
	}

	if len(args) != 3 {
		err = fmt.Errorf("incorrect number of arguments. Expecting 3 {ID, Amount, Description of Goods}, Found %d", len(args))
		return shim.Error(err.Error())
	}

	amount, err = strconv.Atoi(string(args[1]))
	if err != nil {
		return shim.Error(err.Error())
	}

	tradeAgreement = &TradeAgreement{amount, args[2], REQUESTED, 0}
	tradeAgreementBytes, err = json.Marshal(tradeAgreement)
	if err != nil {
		return shim.Error("error marshalling trade agreement structure")
	}

	tradekey, err = getTradeKey(stub, args[0])
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(tradekey, tradeAgreementBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Printf("Trade %s request recorded", args[0])

	return shim.Success(nil)
}

func (t *TradeWorkflowChaincode) acceptTrade(stub shim.ChaincodeStubInterface, creatorOrg string, creatorCertIssuer string, args []string) pb.Response {
	var tradeKey string
	var tradeAgreement *TradeAgreement
	var tradeAgreementBytes []byte
	var err error

	if !testMode && !authenticateExportingEntityOrg(creatorOrg, creatorCertIssuer) {
		return shim.Error("Caller not a member of Exporting entity org. Access Denied.")
	}

	if len(args) != 1 {
		err = errors.New(fmt.Sprintf("Incorrect number of arguments. Expecting 1: {ID}. Found %d", len(args)))
		return shim.Error(err.Error())
	}

	tradeKey, err = GetTradeKey(stub, args[0])
	if err != nil {
		return shim.Error(err.Error())
	}

	tradeAgreementBytes, err = stub.GetState(tradeKey)
	if err != nil {
		return shim.Error(err.Error())
	}

	if len(tradeAgreementBytes) == 0 {
		err = errors.New(fmt.Sprintf("No record found for trade ID %s", args[0]))
		return shim.Error(err.Error())
	}

	err = json.Unmarshal(tradeAgreementBytes, &TradeAgreement)
	if err != nil {
		return shim.Error(err.Error())
	}

	if tradeAgreement.Status == ACCEPTED {
		fmt.Printf("Nothing to do. Trade Agreement already accepted.")
	} else {
		tradeAgreement.status = ACCEPTED
		tradeAgreementBytes, err = json.Marshal(tradeAgreement)
		if err != nil {
			return shim.Error("error marshalling trade agreement structure.")
		}

		err = stub.PutState(tradeKey, tradeAgreementBytes)
		if err != nil {
			return shim.Error(err.Error())
		}
	}
	fmt.Printf("Trade %s acceptance recordedn", args[0])

	return shim.Success(nil)
}

func main() {
	twc = TradeWorkflowChaincode{testMode: false}
	err := shim.Start(twc)

	if err != nil {
		fmt.Printf("error starting chaincode %s", err)
	}
}
