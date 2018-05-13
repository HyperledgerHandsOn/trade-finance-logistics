# GENERAL DEFINITIONS
ROOT_DIR=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DIST_DIR=$(ROOT_DIR)/dist

# COMMAND DEFINITIONS
BUILD		= docker build -t
RUN			= docker run 
LOGIN		= docker login
PUSH		= docker push
TAG			= docker tag

# CHAINCODE RELATED DEFINITIONS
CHAINCODE=trade_workflow_v1
CHAINCODE_SHIM=github.com/hyperledger/fabric/core/chaincode/shim
CHAINCODE_PATH=$(ROOT_DIR)/chaincode/src/github.com/$(CHAINCODE)
CHAINCODE_LOAD_DEP_CMD=go get -u --tags nopkcs11 $(CHAINCODE_SHIM)
CHAINCODE_BUILD_CMD=$(CHAINCODE_LOAD_DEP_CMD);go build --tags nopkcs11 -o /dist/$(CHAINCODE)
CHAINCODE_UNITTEST_CMD=$(CHAINCODE_LOAD_DEP_CMD);go test --tags nopkcs11

.PHONY: all
all: clean build_chaincode unittest_chaincode

.PHONY: build_chaincode
build_chaincode:
	echo ">> Building chaincode within Docker container"
	$(RUN) --rm -v $(CHAINCODE_PATH):/src -v $(DIST_DIR):/dist -w /src golang:1.9.6 sh -c "$(CHAINCODE_BUILD_CMD)"

.PHONY: unittest_chaincode
unittest_chaincode:
	echo ">> Execute unit-tests for chaincode within Docker container"
	$(RUN) --rm -v $(CHAINCODE_PATH):/src -w /src golang:1.9.6 sh -c "$(CHAINCODE_UNITTEST_CMD)"

.PHONY: clean
clean: 
	echo ">> cleaning dist directory"
	rm -rf $(ROOT_DIR)/dist	