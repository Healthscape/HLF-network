/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

const { Contract } = require('fabric-contract-api');
const { Util } = require('./util.js');
const {AccessRequest} = require('./asset_definition.js');
const DocType = require('./enums.js');


class Chaincode extends Contract {

	async beforeTransaction(ctx) {
		const functionAndParameters = ctx.stub.getFunctionAndParameters();
		const params = functionAndParameters.params.join(',');
		const function_ = functionAndParameters.fcn;

		console.log();
		console.log('===================================== START =====================================');
		console.info(`Function name: ${function_}, params: [${params}]`);
		await this.clientIdentityInfo(ctx);
	}

	async clientIdentityInfo(ctx) {
		try {
			const clientIdentityId = ctx.clientIdentity.getID();
			const clientIdentityMspId = ctx.clientIdentity.getMSPID();
			const role = await Util.GetUserRole(ctx);
			const cn = await Util.GetCN(ctx);

			console.info(`clientIdentityId: ${clientIdentityId}`);
			console.info(`clientIdentityMspId: ${clientIdentityMspId}`);
			console.info(`User Role: ${role}`);
			console.info(`CN: ${cn}`);
		} catch (error) {
			console.log(error);
			const errorMessage = 'Error during method ctx.clientIdentity.getAttributeValue(...)';
			console.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	async afterTransaction() {
		console.log();
		console.log('===================================== END =====================================');
	}

	async hasPermission(ctx, methodName){
		return await Util.RoleHasPermission(ctx, methodName);
	}

	// getAccessRequest - get access request, stored into chaincode state
	async GetAccessRequest(ctx, userId){
		const methodName = 'GetAccessRequest';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		const role = await Util.GetUserRole(ctx);
		const cn = await Util.GetCN(ctx);
		let result;

		if(role === 'ROLE_PATIENT'){
			result = await this.getAccessRequest(ctx, cn, userId);
		}else if(role === 'ROLE_PRACTITIONER'){
			result = await this.getAccessRequest(ctx, userId, cn);
		}else{
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		return JSON.stringify(result.Record);
	}

	// CreateAccessRequest - create a new access request, store into chaincode state
	async CreateAccessRequest(ctx, patientId, time){
		const methodName = 'CreateAccessRequest';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		const cn = await Util.GetCN(ctx);
		const accessReqExists = await this.AccessRequestExists(ctx, patientId, cn);
		if(accessReqExists){
			throw new Error(`Access Request for ids:[${patientId} , ${cn}] already exists`);
		}

		let txID =  ctx.stub.getTxID();
		const accessReq = new AccessRequest(txID ,patientId, cn, time);
		await ctx.stub.putState(txID, Buffer.from(JSON.stringify(accessReq)));
		return JSON.stringify(accessReq);
	}

	// AccessRequestExists - checks if access request already exists in chaincode state, it uses index defined in indexPatientPractitioner.json file (by default)
	async getAccessRequest(ctx, patientId, practitionerId){
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.patientId = patientId;
		queryString.selector.practitionerId = practitionerId;
		let results =  await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		if(results.length === 1){
			console.log(results[0]);
			return results[0];
		}else if(results.length === 0){
			console.log('NULL');
			return null;
		}else{
			throw new Error(`Found multiple assets of type ${DocType.ACCESS_REQUEST} and ids: [${patientId} , ${practitionerId}]`);
		}
	}

	// AccessRequestExists - checks if access request already exists in chaincode state, it uses index defined in indexPatientPractitioner.json file (by default)
	async AccessRequestExists(ctx, patientId, practitionerId){
		const accessReq = await this.getAccessRequest(ctx, patientId, practitionerId);
		return accessReq !== null;
	}

	// CreateAsset - create a new asset, store into chaincode state
	async CreatePatientRecord(ctx) {

		await Util.GetUserRole(ctx);

		// await this.beforeTransaction(ctx);

		// const asset = PatientRecord(JSON.parse(assetStr));
		// const assetID = asset.elementaryInfo.ssn;

		// const exists = await this.AssetExists(ctx, assetID);
		// if (exists) {
		// 	throw new Error(`The asset ${assetID} already exists`);
		// }

		// // === Save asset to state ===
		// await ctx.stub.putState(assetID, Buffer.from(JSON.stringify(asset)));
		// let indexName = 'color~name';
		// let colorNameIndexKey = await ctx.stub.createCompositeKey(indexName, [asset.color, asset.assetID]);

		// //  Save index entry to state. Only the key name is needed, no need to store a duplicate copy of the marble.
		// //  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
		// await ctx.stub.putState(colorNameIndexKey, Buffer.from('\u0000'));
	}

	// ReadAsset returns the asset stored in the world state with given id.
	async ReadAsset(ctx, id) {
		const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
		if (!assetJSON || assetJSON.length === 0) {
			throw new Error(`Asset ${id} does not exist`);
		}

		return assetJSON.toString();
	}

	// delete - remove a asset key/value pair from state
	async DeleteAsset(ctx, id) {

		// const userRole = await this.getUserRole(ctx);
		// if (!("ROLE_ADMIN" === userRole)) {
		//     throw new Error("Permission denied: Only users with 'admin' role can perform this operation");
		// }


		if (!id) {
			throw new Error('Asset name must not be empty');
		}

		let exists = await this.AssetExists(ctx, id);
		if (!exists) {
			throw new Error(`Asset ${id} does not exist`);
		}

		// to maintain the color~name index, we need to read the asset first and get its color
		let valAsbytes = await ctx.stub.getState(id); // get the asset from chaincode state
		let jsonResp = {};
		if (!valAsbytes) {
			jsonResp.error = `Asset does not exist: ${id}`;
			throw new Error(jsonResp);
		}
		let assetJSON;
		try {
			assetJSON = JSON.parse(valAsbytes.toString());
		} catch (err) {
			jsonResp = {};
			jsonResp.error = `Failed to decode JSON of: ${id}`;
			throw new Error(jsonResp);
		}
		await ctx.stub.deleteState(id); //remove the asset from chaincode state

		// delete the index
		let indexName = 'color~name';
		let colorNameIndexKey = ctx.stub.createCompositeKey(indexName, [assetJSON.color, assetJSON.assetID]);
		if (!colorNameIndexKey) {
			throw new Error(' Failed to create the createCompositeKey');
		}
		//  Delete index entry to state.
		await ctx.stub.deleteState(colorNameIndexKey);
	}

	// TransferAsset transfers a asset by setting a new owner name on the asset
	async TransferAsset(ctx, assetName, newOwner) {

		let assetAsBytes = await ctx.stub.getState(assetName);
		if (!assetAsBytes || !assetAsBytes.toString()) {
			throw new Error(`Asset ${assetName} does not exist`);
		}
		let assetToTransfer = {};
		try {
			assetToTransfer = JSON.parse(assetAsBytes.toString()); //unmarshal
		} catch (err) {
			let jsonResp = {};
			jsonResp.error = 'Failed to decode JSON of: ' + assetName;
			throw new Error(jsonResp);
		}
		assetToTransfer.owner = newOwner; //change the owner

		let assetJSONasBytes = Buffer.from(JSON.stringify(assetToTransfer));
		await ctx.stub.putState(assetName, assetJSONasBytes); //rewrite the asset
	}

	// GetAssetsByRange performs a range query based on the start and end keys provided.
	// Read-only function results are not typically submitted to ordering. If the read-only
	// results are submitted to ordering, or if the query is used in an update transaction
	// and submitted to ordering, then the committing peers will re-execute to guarantee that
	// result sets are stable between endorsement time and commit time. The transaction is
	// invalidated by the committing peers if the result set has changed between endorsement
	// time and commit time.
	// Therefore, range queries are a safe option for performing update transactions based on query results.
	async GetAssetsByRange(ctx, startKey, endKey) {

		let resultsIterator = await ctx.stub.getStateByRange(startKey, endKey);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}

	// TransferAssetByColor will transfer assets of a given color to a certain new owner.
	// Uses a GetStateByPartialCompositeKey (range query) against color~name 'index'.
	// Committing peers will re-execute range queries to guarantee that result sets are stable
	// between endorsement time and commit time. The transaction is invalidated by the
	// committing peers if the result set has changed between endorsement time and commit time.
	// Therefore, range queries are a safe option for performing update transactions based on query results.
	// Example: GetStateByPartialCompositeKey/RangeQuery
	async TransferAssetByColor(ctx, color, newOwner) {
		// Query the color~name index by color
		// This will execute a key range query on all keys starting with 'color'
		let coloredAssetResultsIterator = await ctx.stub.getStateByPartialCompositeKey('color~name', [color]);

		// Iterate through result set and for each asset found, transfer to newOwner
		let responseRange = await coloredAssetResultsIterator.next();
		while (!responseRange.done) {
			if (!responseRange || !responseRange.value || !responseRange.value.key) {
				return;
			}

			let objectType;
			let attributes;
			(
				{ objectType, attributes } = await ctx.stub.splitCompositeKey(responseRange.value.key)
			);

			console.log(objectType);
			let returnedAssetName = attributes[1];

			// Now call the transfer function for the found asset.
			// Re-use the same function that is used to transfer individual assets
			await this.TransferAsset(ctx, returnedAssetName, newOwner);
			responseRange = await coloredAssetResultsIterator.next();
		}
	}

	// QueryAssetsByOwner queries for assets based on a passed in owner.
	// This is an example of a parameterized query where the query logic is baked into the chaincode,
	// and accepting a single query parameter (owner).
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Example: Parameterized rich query
	async QueryAssetsByOwner(ctx, owner) {
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = 'asset';
		queryString.selector.owner = owner;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

	// Example: Ad hoc rich query
	// QueryAssets uses a query string to perform a query for assets.
	// Query string matching state database syntax is passed in and executed as is.
	// Supports ad hoc queries that can be defined at runtime by the client.
	// If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
	// Only available on state databases that support rich query (e.g. CouchDB)
	async QueryAssets(ctx, queryString) {
		return await this.GetQueryResultForQueryString(ctx, queryString);
	}

	// GetQueryResultForQueryString executes the passed in query string.
	// Result set is built and returned as a byte array containing the JSON results.
	async GetQueryResultForQueryString(ctx, queryString) {

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return results;
	}

	// Example: Pagination with Range Query
	// GetAssetsByRangeWithPagination performs a range query based on the start & end key,
	// page size and a bookmark.
	// The number of fetched records will be equal to or lesser than the page size.
	// Paginated range queries are only valid for read only transactions.
	async GetAssetsByRangeWithPagination(ctx, startKey, endKey, pageSize, bookmark) {

		const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
		let results = {};

		results.results = await this._GetAllResults(iterator, false);

		results.fetchedRecordsCount = metadata.fetchedRecordsCount;

		results.bookmark = metadata.bookmark;

		return JSON.stringify(results);
	}

	// Example: Pagination with Ad hoc Rich Query
	// QueryAssetsWithPagination uses a query string, page size and a bookmark to perform a query
	// for assets. Query string matching state database syntax is passed in and executed as is.
	// The number of fetched records would be equal to or lesser than the specified page size.
	// Supports ad hoc queries that can be defined at runtime by the client.
	// If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Paginated queries are only valid for read only transactions.
	async QueryAssetsWithPagination(ctx, queryString, pageSize, bookmark) {

		const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
		let results = {};

		results.results = await this._GetAllResults(iterator, false);

		results.fetchedRecordsCount = metadata.fetchedRecordsCount;

		results.bookmark = metadata.bookmark;

		return JSON.stringify(results);
	}

	// GetAssetHistory returns the chain of custody for an asset since issuance.
	async GetAssetHistory(ctx, assetName) {

		let resultsIterator = await ctx.stub.getHistoryForKey(assetName);
		let results = await this._GetAllResults(resultsIterator, true);

		return JSON.stringify(results);
	}

	// AssetExists returns true when asset with given ID exists in world state
	async AssetExists(ctx, assetName) {
		// ==== Check if asset already exists ====
		let assetState = await ctx.stub.getState(assetName);
		return assetState && assetState.length > 0;
	}

	// This is JavaScript so without Funcation Decorators, all functions are assumed
	// to be transaction functions
	//
	// For internal functions... prefix them with _
	async _GetAllResults(iterator, isHistory) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.txId;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}

}

module.exports = Chaincode;