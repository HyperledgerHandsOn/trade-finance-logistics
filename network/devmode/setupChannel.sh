#!/bin/bash
# Copyright London Stock Exchange Group All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -e
cd /opt/trade/channel-artifacts

# This script expedites the chaincode development process by automating the
# requisite channel create/join commands

# We use a pre-generated orderer.block and channel transaction artifact (tradechannel.tx),
# both of which are created using the configtxgen tool

# first we create the channel against the specified configuration in tradechannel.tx
# this call returns a channel configuration block - myc.block - to the CLI container
peer channel create -c tradechannel -f ./channel.tx -o orderer:7050

# now we will join the channel and start the chain with tradechannel.block serving as the
# channel's first block (i.e. the genesis block)
peer channel join -b ./tradechannel.block

# Now the user can proceed to build and start chaincode in one terminal
# And leverage the CLI container to issue install instantiate invoke query commands in another

#we should have bailed if above commands failed.
#we are here, so they worked
sleep 600000
exit 0