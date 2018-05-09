# Configuring and Launching a Trade Network
As described in the [use case document](../docs/Use-Case-Description.docx), we have 6 participants in a trade scenario.
But since a trading party (exporter or importer) implicitly trusts its bank, the party and the bank can belong to the same organization (run by the bank.)
The network we configure and run is represented by the figure below, where vertical cylinders represent organizations (with peers and clients), and 
the nodes themselves (peers and orderers) are connected in a blockchain network represented by the horizontal.

![alt text](../docs/Initial-Network.png)

- The trade network consists of 4 organizations: {exporter, importer, carrier, regulator}
- Every organization has one peer.
- The exporter and importer organizations have two non-admin users each by default (one representing the trading entity and another the bank, 
...whereas the other organizations have one non-admin user each.

# Prerequisites to Configure and Launch the Network
Our application code is based on the current Hyperledger Fabric release version (`release-1.1` branch.)
- Make sure you have `docker` and `docker-compose` tools installed on your system.
- Download and build [Fabric](https://github.com/hyperledger/fabric/):
  * `git clone https://github.com/hyperledger/fabric/`
  * If the default branch is not `release-1.1`, append `-b release-1.1` to the above command
  * Run `make configtxgen cryptogen configtxlator` to build the tools we will use to create configuration files.
  * Run `make docker` to build docker images for the various network components from the downloaded source code.
- Download and build [Fabric-CA](https://github.com/hyperledger/fabric-ca/):
  * `git clone https://github.com/hyperledger/fabric-ca/` (`release-1.1` branch as above)
  * Run `make docker` to build docker images for the MSP components.

# Build Channel and Crypto Artifacts, and Network Structure Using Docker Containers
Run `./trade.sh -m generate -c tradechannel`
The following files and folders should be created:
- `channel-artifacts/`: contains files `genesis.block`, `channel.tx`, and 4 anchor peer configuration files, one corresponding to each org
- `crypto-config/`: contains crypto material for the network peers and clients
  * `crypto-config/ordererOrganizations/`: crypto material for the orderer organization
  * `crypto-config/peerOrganizations/`: crypto material for the peer organizations; this should have 4 subfolders, one corresponding to each org
- `docker-compose-e2e.yaml`: network configuration file to launch using the `docker-compose` tool.

# Launch the Network
Run `./trade.sh up`.
- By default, this runs the network as a background process, and logs the output to `logs/network.log`.
- To use a different log file, run `./trade.sh up -o <log-file-name>`.
- Alternatively, you can manually start the network as a foreground process: `docker-compose -f docker-compose-e2e.yaml up`.
- You can view the network logs (from all the containers) in the foreground.

# Bring Down the Network
Run `./trade.sh down`
- If you ran the full application using instructions in [middleware](../middleware/) and [application](../application/), extra docker containers may get started that will not be removed by the above command.
  * To clean up the containers, run `docker kill $(docker ps -q)` followed by `docker rm $(docker ps -a -f status=exited -q)`.
    (*Note*: This will remove all docker containers on your system, so if you want to be selective, modify the above commands suitably.)
  * To clean up network volumes, run `docker volume rm $(docker volume ls | grep -v VOL | awk '{print $2}')`.
    (*Note*: This will remove all docker volumes on your system, so if you want to be selective, modify the above command suitably.)


# Add a New Organization
*Instructions to be added*
