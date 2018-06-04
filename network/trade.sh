#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This script will orchestrate a sample end-to-end execution of the Hyperledger
# Fabric network.
#
# The end-to-end verification provisions a sample Fabric network consisting of
# two organizations, each maintaining two peers, and a “solo” ordering service.
#
# This verification makes use of two fundamental tools, which are necessary to
# create a functioning transactional network with digital signature validation
# and access control:
#
# * cryptogen - generates the x509 certificates used to identify and
#   authenticate the various components in the network.
# * configtxgen - generates the requisite configuration artifacts for orderer
#   bootstrap and channel creation.
#
# Each tool consumes a configuration yaml file, within which we specify the topology
# of our network (cryptogen) and the location of our certificates for various
# configuration operations (configtxgen).  Once the tools have been successfully run,
# we are able to launch our network.  More detail on the tools and the structure of
# the network will be provided later in this document.  For now, let's get going...

# prepending $PWD/../bin to PATH to ensure we are picking up the correct binaries
# this may be commented out to resolve installed version of tools if desired
export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}

# By default we standup a full network.
DEV_MODE=false

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  trade.sh up|down|restart|generate|reset|clean|upgrade|createneworg|startneworg|stopneworg [-c <channel name>] [-f <docker-compose-file>] [-i <imagetag>] [-o <logfile>] [-dev]"
  echo "  trade.sh -h|--help (print this message)"
  echo "    <mode> - one of 'up', 'down', 'restart' or 'generate'"
  echo "      - 'up' - bring up the network with docker-compose up"
  echo "      - 'down' - clear the network with docker-compose down"
  echo "      - 'restart' - restart the network"
  echo "      - 'generate' - generate required certificates and genesis block"
  echo "      - 'reset' - delete chaincode containers while keeping network artifacts" 
  echo "      - 'clean' - delete network artifacts" 
  echo "      - 'upgrade'  - upgrade the network from v1.0.x to v1.1"
  echo "    -c <channel name> - channel name to use (defaults to \"tradechannel\")"
  echo "    -f <docker-compose-file> - specify which docker-compose file use (defaults to docker-compose-e2e.yaml)"
  echo "    -i <imagetag> - the tag to be used to launch the network (defaults to \"latest\")"
  echo "    -d - Apply command to the network in dev mode."
  echo
  echo "Typically, one would first generate the required certificates and "
  echo "genesis block, then bring up the network. e.g.:"
  echo
  echo "	trade.sh generate -c tradechannel"
  echo "	trade.sh up -c tradechannel -o logs/network.log"
  echo "        trade.sh up -c tradechannel -i 1.1.0-alpha"
  echo "	trade.sh down -c tradechannel"
  echo "        trade.sh upgrade -c tradechannel"
  echo
  echo "Taking all defaults:"
  echo "	trade.sh generate"
  echo "	trade.sh up"
  echo "	trade.sh down"
}

# Keeps pushd silent
pushd () {
    command pushd "$@" > /dev/null
}

# Keeps popd silent
popd () {
    command popd "$@" > /dev/null
}

# Ask user for confirmation to proceed
function askProceed () {
  read -p "Continue? [Y/n] " ans
  case "$ans" in
    y|Y|"" )
      echo "proceeding ..."
    ;;
    n|N )
      echo "exiting..."
      exit 1
    ;;
    * )
      echo "invalid response"
      askProceed
    ;;
  esac
}

# Obtain CONTAINER_IDS and remove them
# TODO Might want to make this optional - could clear other containers
function clearContainers () {
  CONTAINER_IDS=$(docker ps -aq)
  if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
    echo "---- No containers available for deletion ----"
  else
    docker rm -f $CONTAINER_IDS
  fi
}

# Delete any images that were generated as a part of this setup
# specifically the following images are often left behind:
# TODO list generated image naming patterns
function removeUnwantedImages() {
  DOCKER_IMAGE_IDS=$(docker images | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $3}')
  if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
    echo "---- No images available for deletion ----"
  else
    docker rmi -f $DOCKER_IMAGE_IDS
  fi
}

# Do some basic sanity checking to make sure that the appropriate versions of fabric
# binaries/images are available.  In the future, additional checking for the presence
# of go or other items could be added.
function checkPrereqs() {
  # Note, we check configtxlator externally because it does not require a config file, and peer in the
  # docker image because of FAB-8551 that makes configtxlator return 'development version' in docker
  LOCAL_VERSION=$(configtxlator version | sed -ne 's/ Version: //p')
  DOCKER_IMAGE_VERSION=$(docker run --rm hyperledger/fabric-tools:$IMAGETAG peer version | sed -ne 's/ Version: //p'|head -1)

  echo "LOCAL_VERSION=$LOCAL_VERSION"
  echo "DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"

  if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ] ; then
     echo "=================== WARNING ==================="
     echo "  Local fabric binaries and docker images are  "
     echo "  out of  sync. This may cause problems.       "
     echo "==============================================="
  fi
}

# Generate the needed certificates, the genesis block and start the network.
function networkUp () {
  checkPrereqs
  # If we are in dev mode, we move to the devmode directory
  if [ "$DEV_MODE" = true ] ; then
     pushd ./devmode
     export FABRIC_CFG_PATH=${PWD}
  fi
  # generate artifacts if they don't exist
  if [ ! -d "crypto-config" ]; then
    generateCerts
    replacePrivateKey
    generateChannelArtifacts
  fi
  # Create folder for docker network logs
  LOG_DIR=$(dirname $LOG_FILE)
  if [ ! -d $LOG_DIR ]
  then
    mkdir -p $LOG_DIR
  fi
  IMAGE_TAG=$IMAGETAG docker-compose -f $COMPOSE_FILE up >$LOG_FILE 2>&1 &

  if [ "$DEV_MODE" = true ] ; then
     popd
     export FABRIC_CFG_PATH=${PWD}
  fi

  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi
}

# Generate the needed certificates, the configuration, and start the network components for the new org.
function newOrgNetworkUp () {
  checkPrereqs
  # generate artifacts if they don't exist
  if [ ! -d "crypto-config/peerOrganizations/exportingentityorg.trade.com" ]; then
    generateCertsForNewOrg
    replacePrivateKeyForNewOrg
    generateChannelConfigForNewOrg
  fi
  # Create folder for docker network logs
  LOG_DIR=$(dirname $LOG_FILE_NEW_ORG)
  if [ ! -d $LOG_DIR ]
  then
    mkdir -p $LOG_DIR
  fi
  IMAGE_TAG=$IMAGETAG docker-compose -f $COMPOSE_FILE_NEW_ORG up >$LOG_FILE_NEW_ORG 2>&1 &
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi
}

# Upgrade the network from one version to another
# If the new image tag (now in the IMAGETAG variable) is not passed in the command line using the "-i" switch:
# 	this assumes that the new iamge has already been tagged with "latest".
# Stop the orderer and peers, backup the ledger from orderer and peers, cleanup chaincode containers and images
# and relaunch the orderer and peers with latest tag
function upgradeNetwork () {
  docker inspect  -f '{{.Config.Volumes}}' orderer.trade.com |grep -q '/var/hyperledger/production/orderer'
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! This network does not appear to be using volumes for its ledgers, did you start from fabric-samples >= v1.0.6?"
    exit 1
  fi

  LEDGERS_BACKUP=./ledgers-backup

  # create ledger-backup directory
  mkdir -p $LEDGERS_BACKUP

  export IMAGE_TAG=$IMAGETAG
  COMPOSE_FILES="-f $COMPOSE_FILE"

  echo "Upgrading orderer"
  docker-compose $COMPOSE_FILES stop orderer.trade.com
  docker cp -a orderer.trade.com:/var/hyperledger/production/orderer $LEDGERS_BACKUP/orderer.trade.com
  docker-compose $COMPOSE_FILES up --no-deps orderer.trade.com

  for PEER in peer0.exporterorg.trade.com peer0.importerorg.trade.com peer0.carrierorg.trade.com peer0.regulatororg.trade.com; do
    echo "Upgrading peer $PEER"

    # Stop the peer and backup its ledger
    docker-compose $COMPOSE_FILES stop $PEER
    docker cp -a $PEER:/var/hyperledger/production $LEDGERS_BACKUP/$PEER/

    # Remove any old containers and images for this peer
    CC_CONTAINERS=$(docker ps | grep dev-$PEER | awk '{print $1}')
    if [ -n "$CC_CONTAINERS" ] ; then
        docker rm -f $CC_CONTAINERS
    fi
    CC_IMAGES=$(docker images | grep dev-$PEER | awk '{print $1}')
    if [ -n "$CC_IMAGES" ] ; then
        docker rmi -f $CC_IMAGES
    fi

    # Start the peer again
    docker-compose $COMPOSE_FILES up --no-deps $PEER
  done
}

# Bring down running network
function networkDown () {
  # If we are in dev mode, we move to the devmode directory
  if [ "$DEV_MODE" = true ] ; then
     pushd ./devmode
  fi

  docker-compose -f $COMPOSE_FILE down --volumes

  for PEER in peer0.exporterorg.trade.com peer0.importerorg.trade.com peer0.carrierorg.trade.com peer0.regulatororg.trade.com; do
    # Remove any old containers and images for this peer
    CC_CONTAINERS=$(docker ps -a | grep dev-$PEER | awk '{print $1}')
    if [ -n "$CC_CONTAINERS" ] ; then
      docker rm -f $CC_CONTAINERS
    fi
  done

  if [ "$DEV_MODE" = true ] ; then
     popd
  fi
}

# Bring down running network components of the new org
function newOrgNetworkDown () {
  docker-compose -f $COMPOSE_FILE_NEW_ORG down --volumes

  for PEER in peer0.exportingentityorg.trade.com; do
    # Remove any old containers and images for this peer
    CC_CONTAINERS=$(docker ps -a | grep dev-$PEER | awk '{print $1}')
    if [ -n "$CC_CONTAINERS" ] ; then
      docker rm -f $CC_CONTAINERS
    fi
  done
}

# Delete network artifacts
function networkClean () {
  #Cleanup the chaincode containers
  clearContainers
  #Cleanup images
  removeUnwantedImages
  # If we are in dev mode, we move to the devmode directory
  if [ "$DEV_MODE" = true ] ; then
     pushd ./devmode
  fi
  # remove orderer block and other channel configuration transactions and certs
  rm -rf channel-artifacts crypto-config add_org/crypto-config
  # remove the docker-compose yaml file that was customized to the example
  rm -f docker-compose-e2e.yaml add_org/docker-compose-exportingEntityOrg.yaml
  # remove client certs 
  rm -rf client-certs
  if [ "$DEV_MODE" = true ] ; then
     popd
  fi
}

# Using docker-compose-e2e-template.yaml, replace constants with private key file names
# generated by the cryptogen tool and output a docker-compose.yaml specific to this
# configuration
function replacePrivateKey () {
  # Copy the template to the file that will be modified to add the private key
  cp docker-compose-e2e-template.yaml docker-compose-e2e.yaml
  
  if [ "$DEV_MODE" = true ] ; then
    CURRENT_DIR=$PWD
    cd crypto-config/peerOrganizations/devorg.trade.com/ca/
    PRIV_KEY=$(ls *_sk)
    cd "$CURRENT_DIR"
    sed -i "s/DEVORG_CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose-e2e.yaml
  else
    # The next steps will replace the template's contents with the
    # actual values of the private key file names for the two CAs.
    CURRENT_DIR=$PWD
    cd crypto-config/peerOrganizations/exporterorg.trade.com/ca/
    PRIV_KEY=$(ls *_sk)
    cd "$CURRENT_DIR"
    sed -i "s/EXPORTER_CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose-e2e.yaml
    cd crypto-config/peerOrganizations/importerorg.trade.com/ca/
    PRIV_KEY=$(ls *_sk)
    cd "$CURRENT_DIR"
    sed -i "s/IMPORTER_CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose-e2e.yaml
    cd crypto-config/peerOrganizations/carrierorg.trade.com/ca/
    PRIV_KEY=$(ls *_sk)
    cd "$CURRENT_DIR"
    sed -i "s/CARRIER_CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose-e2e.yaml
    cd crypto-config/peerOrganizations/regulatororg.trade.com/ca/
    PRIV_KEY=$(ls *_sk)
    cd "$CURRENT_DIR"
    sed -i "s/REGULATOR_CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose-e2e.yaml
  fi
}

function replacePrivateKeyForNewOrg () {
  # Copy the template to the file that will be modified to add the private key
  cp add_org/docker-compose-exportingEntityOrg-template.yaml add_org/docker-compose-exportingEntityOrg.yaml

  # The next steps will replace the template's contents with the
  # actual values of the private key file names for the two CAs.
  CURRENT_DIR=$PWD
  cd crypto-config/peerOrganizations/exportingentityorg.trade.com/ca/
  PRIV_KEY=$(ls *_sk)
  cd "$CURRENT_DIR"
  sed -i "s/EXPORTINGENTITY_CA_PRIVATE_KEY/${PRIV_KEY}/g" add_org/docker-compose-exportingEntityOrg.yaml
}

# We will use the cryptogen tool to generate the cryptographic material (x509 certs)
# for our various network entities.  The certificates are based on a standard PKI
# implementation where validation is achieved by reaching a common trust anchor.
#
# Cryptogen consumes a file - ``crypto-config.yaml`` - that contains the network
# topology and allows us to generate a library of certificates for both the
# Organizations and the components that belong to those Organizations.  Each
# Organization is provisioned a unique root certificate (``ca-cert``), that binds
# specific components (peers and orderers) to that Org.  Transactions and communications
# within Fabric are signed by an entity's private key (``keystore``), and then verified
# by means of a public key (``signcerts``).  You will notice a "count" variable within
# this file.  We use this to specify the number of peers per Organization; in our
# case it's two peers per Org.  The rest of this template is extremely
# self-explanatory.
#
# After we run the tool, the certs will be parked in a folder titled ``crypto-config``.

# Generates Org certs using cryptogen tool
function generateCerts (){
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "##########################################################"
  echo "##### Generate certificates using cryptogen tool #########"
  echo "##########################################################"
  # If we are in dev mode, we move to the devmode directory
  if [ "$DEV_MODE" = true ] ; then
      if [ $(basename $PWD) != "devmode" ] ; then
        pushd ./devmode
        export FABRIC_CFG_PATH=${PWD}
      fi
  fi

  if [ -d "crypto-config" ]; then
    rm -Rf crypto-config
  fi
  set -x
  cryptogen generate --config=./crypto-config.yaml
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

function generateCertsForNewOrg (){
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "######################################################################"
  echo "##### Generate certificates for new org using cryptogen tool #########"
  echo "######################################################################"

  if [ -d "crypto-config/peerOrganizations/exportingentityorg.trade.com" ]; then
    rm -Rf crypto-config/peerOrganizations/exportingentityorg.trade.com
  fi
  set -x
  cryptogen generate --config=./add_org/crypto-config.yaml
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

# The `configtxgen tool is used to create four artifacts: orderer **bootstrap
# block**, fabric **channel configuration transaction**, and two **anchor
# peer transactions** - one for each Peer Org.
#
# The orderer block is the genesis block for the ordering service, and the
# channel transaction file is broadcast to the orderer at channel creation
# time.  The anchor peer transactions, as the name might suggest, specify each
# Org's anchor peer on this channel.
#
# Configtxgen consumes a file - ``configtx.yaml`` - that contains the definitions
# for the sample network. There are five members - one Orderer Org (``TradeOrdererOrg``)
# and four Peer Orgs (``ExporterOrg``, ``ImporterOrg``, ``CarrierOrg`` & ``RegulatorOrg``)
# each managing and maintaining one peer node.
# This file also specifies a consortium - ``TradeConsortium`` - consisting of our
# four Peer Orgs.  Pay specific attention to the "Profiles" section at the top of
# this file.  You will notice that we have two unique headers. One for the orderer genesis
# block - ``FourOrgsTradeOrdererGenesis`` - and one for our channel - ``FourOrgsTradeChannel``.
# These headers are important, as we will pass them in as arguments when we create
# our artifacts.  This file also contains two additional specifications that are worth
# noting.  Firstly, we specify the anchor peers for each Peer Org
# (``peer0.exporterorg.trade.com`` & ``peer0.importerorg.trade.com``).  Secondly, we point to
# the location of the MSP directory for each member, in turn allowing us to store the
# root certificates for each Org in the orderer genesis block.  This is a critical
# concept. Now any network entity communicating with the ordering service can have
# its digital signature verified.
#
# This function will generate the crypto material and our four configuration
# artifacts, and subsequently output these files into the ``channel-artifacts``
# folder.
#
# If you receive the following warning, it can be safely ignored:
#
# [bccsp] GetDefault -> WARN 001 Before using BCCSP, please call InitFactories(). Falling back to bootBCCSP.
#
# You can ignore the logs regarding intermediate certs, we are not using them in
# this crypto implementation.

# Generate orderer genesis block, channel configuration transaction and
# anchor peer update transactions
function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  mkdir -p channel-artifacts

  echo "###########################################################"
  echo "#########  Generating Orderer Genesis block  ##############"
  echo "###########################################################"
  if [ "$DEV_MODE" = true ] ; then
    PROFILE=OneOrgTradeOrdererGenesis
    CHANNEL_PROFILE=OneOrgTradeChannel
  else 
    PROFILE=FourOrgsTradeOrdererGenesis
    CHANNEL_PROFILE=FourOrgsTradeChannel
  fi

  # Note: For some unknown reason (at least for now) the block file can't be
  # named orderer.genesis.block or the orderer will fail to launch!
  set -x
  configtxgen -profile $PROFILE -outputBlock ./channel-artifacts/genesis.block
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo
  echo "###################################################################"
  echo "###  Generating channel configuration transaction  'channel.tx' ###"
  echo "###################################################################"
  set -x
  configtxgen -profile $CHANNEL_PROFILE -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi

  if [ "$DEV_MODE" = false ] ; then
    echo
    echo "#####################################################################"
    echo "#######  Generating anchor peer update for ExporterOrgMSP  ##########"
    echo "#####################################################################"
    set -x
    configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate ./channel-artifacts/ExporterOrgMSPanchors.tx -channelID $CHANNEL_NAME -asOrg ExporterOrgMSP
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate anchor peer update for ExporterOrgMSP..."
      exit 1
    fi

    echo
    echo "#####################################################################"
    echo "#######  Generating anchor peer update for ImporterOrgMSP  ##########"
    echo "#####################################################################"
    set -x
    configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate \
    ./channel-artifacts/ImporterOrgMSPanchors.tx -channelID $CHANNEL_NAME -asOrg ImporterOrgMSP
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate anchor peer update for ImporterOrgMSP..."
      exit 1
    fi

    echo
    echo "####################################################################"
    echo "#######  Generating anchor peer update for CarrierOrgMSP  ##########"
    echo "####################################################################"
    set -x
    configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate \
    ./channel-artifacts/CarrierOrgMSPanchors.tx -channelID $CHANNEL_NAME -asOrg CarrierOrgMSP
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate anchor peer update for CarrierOrgMSP..."
      exit 1
    fi

    echo
    echo "######################################################################"
    echo "#######  Generating anchor peer update for RegulatorOrgMSP  ##########"
    echo "######################################################################"
    set -x
    configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate \
    ./channel-artifacts/RegulatorOrgMSPanchors.tx -channelID $CHANNEL_NAME -asOrg RegulatorOrgMSP
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate anchor peer update for RegulatorOrgMSP..."
      exit 1
    fi
    echo
  fi
}

# Generate configuration (policies, certificates) for new org in JSON format
function generateChannelConfigForNewOrg() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  mkdir -p channel-artifacts

  echo "####################################################################################"
  echo "#########  Generating Channel Configuration for Exporting Entity Org  ##############"
  echo "####################################################################################"
  set -x
  FABRIC_CFG_PATH=${PWD}/add_org/ && configtxgen -printOrg ExportingEntityOrgMSP > ./channel-artifacts/exportingEntityOrg.json
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration for exportingentity org..."
    exit 1
  fi
  echo
}

# channel name
CHANNEL_NAME="tradechannel"
# use this as the default docker-compose yaml definition
COMPOSE_FILE=docker-compose-e2e.yaml
COMPOSE_FILE_NEW_ORG=add_org/docker-compose-exportingEntityOrg.yaml
# default image tag
IMAGETAG="latest"
# default log file
LOG_FILE="logs/network.log"
LOG_FILE_NEW_ORG="logs/network-neworg.log"
# Parse commandline args

MODE=$1;shift
# Determine whether starting, stopping, restarting or generating for announce
if [ "$MODE" == "up" ]; then
  EXPMODE="Starting"
elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "restart" ]; then
  EXPMODE="Restarting"
elif [ "$MODE" == "clean" ]; then
  EXPMODE="Cleaning"
elif [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and genesis block"
elif [ "$MODE" == "upgrade" ]; then
  EXPMODE="Upgrading the network"
elif [ "$MODE" == "createneworg" ]; then
  EXPMODE="Generating certs and configuration for new org"
elif [ "$MODE" == "startneworg" ]; then
  EXPMODE="Starting peer and CA for new org"
elif [ "$MODE" == "stopneworg" ]; then
  EXPMODE="Stopping peer and CA for new org"
else
  printHelp
  exit 1
fi

while getopts "h?m:c:f:i:o:d:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    c)  CHANNEL_NAME=$OPTARG
    ;;
    f)  COMPOSE_FILE=$OPTARG
    ;;
    i)  IMAGETAG=`uname -m`"-"$OPTARG
    ;;
    o)  LOG_FILE=$OPTARG
    ;;
    d)  DEV_MODE=$OPTARG 
    ;;
  esac
done

# Announce what was requested
echo "${EXPMODE} with channel '${CHANNEL_NAME}'"
# ask for confirmation to proceed
askProceed

#Create the network using docker compose
if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then ## Clear the network
  networkDown
elif [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateCerts
  replacePrivateKey
  generateChannelArtifacts
elif [ "${MODE}" == "restart" ]; then ## Restart the network
  networkDown
  networkUp
elif [ "${MODE}" == "reset" ]; then ## Delete chaincode containers while keeping network artifacts
  removeUnwantedImages
elif [ "${MODE}" == "clean" ]; then ## Delete network artifacts
  networkClean
elif [ "${MODE}" == "upgrade" ]; then ## Upgrade the network from v1.0.x to v1.1
  upgradeNetwork
elif [ "${MODE}" == "createneworg" ]; then ## Generate artifacts for new org
  generateCertsForNewOrg
  replacePrivateKeyForNewOrg
  generateChannelConfigForNewOrg
elif [ "${MODE}" == "startneworg" ]; then ## Start the network components for the new org
  newOrgNetworkUp
elif [ "${MODE}" == "stopneworg" ]; then ## Start the network components for the new org
  newOrgNetworkDown
else
  printHelp
  exit 1
fi
