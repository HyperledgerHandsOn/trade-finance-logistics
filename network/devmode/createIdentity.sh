#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0
set -e

ORG_NAME="importer"

fabric-ca-client enroll -u http://admin:adminpw@ca:7054 --mspdir admin

fabric-ca-client register --id.name ${ORG_NAME} --id.secret pwd1 --id.type user \
    --id.attrs "tradelimit=1000:ecert" -u http://ca:7054

fabric-ca-client enroll -u http://${ORG_NAME}:pwd1@ca:7054 \
    --enrollment.attrs "tradelimit,email:opt" --mspdir ${ORG_NAME}

mkdir ~/.fabric-ca-client/${ORG_NAME}/admincerts
cp -p ~/.fabric-ca-client/${ORG_NAME}/signcerts/*  ~/.fabric-ca-client/${ORG_NAME}/admincerts
