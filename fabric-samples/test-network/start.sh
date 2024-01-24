#!/bin/bash

./network.sh "down"
#./network.sh "up" "createChannel" "-c" "mychannel" "-ca"
#./network.sh "deployCC" "-ccn" "basic" "-ccp" "../asset-transfer-basic/chaincode-typescript/" "-ccl" "typescript"

./network.sh "up" "createChannel" "-s" "couchdb" "-c" "mychannel" "-ca"
#./network.sh "deployCC" "-ccn" "ledger" "-ccp" "../asset-transfer-ledger-queries/chaincode-go/" "-ccl" "go"
#./network.sh "deployCC" "-ccn" "basic" "-ccp" "../asset-transfer-basic/chaincode-java/" "-ccl" "java"
./network.sh "deployCC" "-ccn" "ledger" "-ccp" "../asset-transfer-ledger-queries/chaincode-javascript/" "-ccl" "javascript"

cp -r /home/leakalmar/hyperledger-fabric/test-network/organizations/peerOrganizations/org1\.example\.com /mnt/e/GIT/HealthscapeOrganization/OrganizationApp/src/main/resources
echo -en "\007"