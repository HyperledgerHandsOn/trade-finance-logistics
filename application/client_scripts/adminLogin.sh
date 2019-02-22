curl -s -X POST http://localhost:4000/login -H "content-type: application/x-www-form-urlencoded" -d 'username=admin&orgName=importerorg&password=adminpw' > adminCred.json
JWT=$(jq '.success' adminCred.json)
if [ $JWT == true ]
then
	echo "Successfully obtained admin login credentials. See 'adminCred.json'."
else
	echo "Failed to login admin"
fi
