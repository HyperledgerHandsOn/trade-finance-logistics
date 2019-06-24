package trade_workflow_v2

import (
	"fmt"
	"testing"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

func checkInit(t *testing.T, stub *shim.MockStub, args [][]byte) {
	res := stub.MockInit("1", args)
	if res.status != shim.OK {
		fmt.Println("Init failed.", string(res.Message))
		t.FailNow()
	}
}

func getInitArguments() [][]byte {
	return [][]byte{[]byte("init"),
		[]byte("LumberInc"),
		[]byte("LumberBank"),
		[]byte("100000"),
		[]byte("WoodenToys"),
		[]byte("ToyBank"),
		[]byte("200000"),
		[]byte("UniversalFreight"),
		[]byte("ForestryDepartment")}
}

func TestTradeWorkflow(t *testing.T) {
	scc = &TradeWorkflowChaincode{true}
	stub := shim.NewMockStub("Trade Workflow", scc)

	checkInit(t, stub, getInitArguments)
}
