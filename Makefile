# GENERAL PATH DEFINITIONS
ROOT_DIR=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DIST_DIR=$(ROOT_DIR)/dist

# CHAINCODE RELATED DEFINITIONS
CC=trade_workflow_v1
CC_SHIM=github.com/hyperledger/fabric/core/chaincode/shim
CC_PATH=$(ROOT_DIR)/chaincode/src/github.com/$(CC)

CC_LOAD_DEP_CMD=go get -u --tags nopkcs11 $(CC_SHIM)
CC_BUILD_CMD=$(CC_LOAD_DEP_CMD);go build --tags nopkcs11 -o /dist/$(CC)
CC_UNITTEST_CMD=$(CC_LOAD_DEP_CMD);go test --tags nopkcs11

# COMPOSER RELATED DEFINITIONS
COMPOSER_PATH=$(ROOT_DIR)/composer

COMPOSER_BUILD_CMD=npm install
COMPOSER_UNITTEST_CMD=npm test

.PHONY: all
all: build test 

.PHONY: build
build: clean chaincode composer

.PHONY: test
test: chaincode_test composer_test

.PHONY: chaincode
chaincode:
	echo ">> Building chaincode within Docker container"
	docker run --rm -v $(CC_PATH):/src -v $(DIST_DIR):/dist -w /src golang:1.9.6 sh -c "$(CC_BUILD_CMD)"

.PHONY: chaincode_test
chaincode_test:
	echo ">> Execute unit-tests for chaincode within Docker container"
	docker run --rm -v $(CC_PATH):/src -w /src golang:1.9.6 sh -c "$(CC_UNITTEST_CMD)"

.PHONY: composer
composer:
	echo ">> Building composer package within Docker container"
	docker run  --rm -v $(COMPOSER_PATH):/src -v $(DIST_DIR):/dist -w /src node:8.11 sh -c "$(COMPOSER_BUILD_CMD)"

.PHONY: composer_test
composer_test:
	echo ">> Running composer unit-test within Docker container"
	docker run --rm -v $(COMPOSER_PATH):/src -v $(DIST_DIR):/dist -w /src node:8.11 sh -c "$(COMPOSER_UNITTEST_CMD)"

.PHONY: clean
clean: 
	echo ">> cleaning dist directory"
	rm -rf $(ROOT_DIR)/dist	