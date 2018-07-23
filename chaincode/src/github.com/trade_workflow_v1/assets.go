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

type TradeAgreement struct {
	Amount			int		`json:"amount"`
	DescriptionOfGoods	string		`json:"descriptionOfGoods"`
	Status			string		`json:"status"`
	Payment			int		`json:"payment"`
}

type LetterOfCredit struct {
	Id			string		`json:"id"`
	ExpirationDate		string		`json:"expirationDate"`
	Beneficiary		string		`json:"beneficiary"`
	Amount			int		`json:"amount"`
	Documents		[]string	`json:"documents"`
	Status			string		`json:"status"`
}

type ExportLicense struct {
	Id			string		`json:"id"`
	ExpirationDate		string		`json:"expirationDate"`
	Exporter		string		`json:"exporter"`
	Carrier			string		`json:"carrier"`
	DescriptionOfGoods	string		`json:"descriptionOfGoods"`
	Approver		string		`json:"approver"`
	Status			string		`json:"status"`
}

type BillOfLading struct {
	Id			string		`json:"id"`
	ExpirationDate		string		`json:"expirationDate"`
	Exporter		string		`json:"exporter"`
	Carrier			string		`json:"carrier"`
	DescriptionOfGoods	string		`json:"descriptionOfGoods"`
	Amount			int		`json:"amount"`
	Beneficiary		string		`json:"beneficiary"`
	SourcePort		string		`json:"sourcePort"`
	DestinationPort		string		`json:"destinationPort"`
}
