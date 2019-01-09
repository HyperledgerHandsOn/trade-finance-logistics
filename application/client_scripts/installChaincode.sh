JWT=$(jq '.token' adminCred.json)
if [ ${JWT:0:1} == "\"" ]
then
	JWT=${JWT:1}
fi
let "JLEN = ${#JWT} - 1"
if [ ${JWT:$JLEN:1} == "\"" ]
then
	JWT=${JWT:0:$JLEN}
fi
CC=$(curl -s -X POST http://localhost:4000/chaincode/install -H "content-type: application/json" -H "authorization: Bearer $JWT" -d '{ "ccpath": "github.com/trade_workflow", "ccversion": "v0" }')
JWT=$(echo $CC | jq '.success')
if [ $JWT == true ]
then
	echo "SUCCESS: "$(echo $CC | jq '.message')
else
	echo "FAILURE: "$(echo $CC | jq '.message')
fi
