/*
 * Copyright 2018 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"github.com/hyperledger/fabric/core/chaincode/shim"
)

func getTradeKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	tradeKey, err := stub.CreateCompositeKey("Trade", []string{tradeID})
	if err != nil {
		return "", err
	} else {
		return tradeKey, nil
	}
}

func getLCKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	lcKey, err := stub.CreateCompositeKey("LetterOfCredit", []string{tradeID})
	if err != nil {
		return "", err
	} else {
		return lcKey, nil
	}
}

func getELKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	elKey, err := stub.CreateCompositeKey("ExportLicense", []string{tradeID})
	if err != nil {
		return "", err
	} else {
		return elKey, nil
	}
}

func getShipmentLocationKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	shipmentLocationKey, err := stub.CreateCompositeKey("Shipment", []string{"Location", tradeID})
	if err != nil {
		return "", err
	} else {
		return shipmentLocationKey, nil
	}
}

func getBLKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	blKey, err := stub.CreateCompositeKey("BillOfLading", []string{tradeID})
	if err != nil {
		return "", err
	} else {
		return blKey, nil
	}
}

func getPaymentKey(stub shim.ChaincodeStubInterface, tradeID string) (string, error) {
	paymentKey, err := stub.CreateCompositeKey("Payment", []string{tradeID})
	if err != nil {
		return "", err
	} else {
		return paymentKey, nil
	}
}
