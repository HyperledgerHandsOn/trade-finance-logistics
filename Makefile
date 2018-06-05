# GENERAL PATH DEFINITIONS
ROOT_DIR=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DIST_DIR=$(ROOT_DIR)/dist

# CHAINCODE RELATED DEFINITIONS
ifdef VER
	VERSION =_$(VER)
endif
CC=trade_workflow$(VERSION)
CC_PATH=$(ROOT_DIR)/chaincode

CC_BUILD_CMD=go build -o /go/src/$(CC) --tags nopkcs11 github.com/$(CC);cp /go/src/$(CC) /dist/$(CC)
CC_UNITTEST_CMD=go test --tags nopkcs11

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
	docker run --rm -v $(CC_PATH):/go -v $(DIST_DIR):/dist -w /go golang:1.9.6 sh -c "$(CC_BUILD_CMD)"

.PHONY: chaincode_test
chaincode_test:
	echo ">> Execute unit-tests for chaincode within Docker container"
	docker run --rm -v $(CC_PATH):/go -w /go/src/github.com/$(CC) golang:1.9.6 sh -c "$(CC_UNITTEST_CMD)"

.PHONY: composer
composer:
	echo ">> Building composer package within Docker container"
	docker run  --rm -v $(COMPOSER_PATH):/src -v $(DIST_DIR):/dist -w /src node:8.11 sh -c "$(COMPOSER_BUILD_CMD)"

.PHONY: composer_test
composer_test:
	echo ">> Running composer unit-test within Docker container"
	docker run --rm -v $(COMPOSER_PATH):/src -v $(DIST_DIR):/dist -w /src node:8.11 sh -c "$(COMPOSER_UNITTEST_CMD)"

.PHONY: middleware
middleware:
	echo ">> Building middleware dependencies"
	cd middleware && npm install

.PHONY: application
application:
	echo ">> Building application (web server) dependencies"
	cd application && npm install

.PHONY: clean
clean: 
	echo ">> cleaning dist directory"
	rm -rf $(ROOT_DIR)/dist
	rm -rf $(ROOT_DIR)/middleware/node_modules
	rm -rf $(ROOT_DIR)/application/node_modules
