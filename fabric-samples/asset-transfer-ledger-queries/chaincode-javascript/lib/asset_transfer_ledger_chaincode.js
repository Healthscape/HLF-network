/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

const { Contract } = require('fabric-contract-api');
const { Util } = require('./util.js');
const { PatientRecordChaincode } = require('./patient_record_chaincode.js');
const { AccessRequestChaincode } = require('./access_request_chaincode.js');
const { AssociationPatientRecordChaincode } = require('./association_chaincode.js');
const { PatientIdentifiersChaincode } = require('./patient_identifiers_chaincode.js');
const { TransactionUtils } = require('./transaction_utils.js');


class Chaincode extends Contract {
	async beforeTransaction(ctx){
		TransactionUtils.beforeTransaction(ctx);
	}

	async afterTransaction(){
		TransactionUtils.afterTransaction();
	}

	// ==================================================================================================
	// ========================================= ACCESS REQUEST =========================================
	// ==================================================================================================

	// GetAccessRequestForUser - get access request between ctx user and userId, stored into chaincode state
	async GetAccessRequestForUser(ctx, userId){
		let accessReq = await AccessRequestChaincode.GetAccessRequestForUser(ctx, userId);
		return JSON.stringify(accessReq);
	}

	// CreateAccessRequest - create a new access request between ctx user and patientId, store into chaincode state
	async CreateAccessRequest(ctx, patientId, time){
		let accessReq = await AccessRequestChaincode.CreateAccessRequest(ctx, patientId, time);
		return JSON.stringify(accessReq);
	}

	// IsAccessRequestApproved - checks if access request is approved
	async IsAccessRequestApproved(ctx, requestId){
		let accessReq = await AccessRequestChaincode.GetAccessRequest(ctx, requestId);
		let approved = await AccessRequestChaincode.CheckIfAccessRequestValid(accessReq);
		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, accessReq.patientId);
		let record = '';
		if(approved){
			record = await PatientRecordChaincode.GetPatientRecord(ctx, association.recordId);
			record.userId = accessReq.patientId;
		}
		return JSON.stringify(record);
	}

	// AccessRequestExists - checks if access request already exists in chaincode state, it uses index defined in indexPatientPractitioner.json file (by default)
	async AccessRequestExists(ctx, patientId, practitionerId){
		return await AccessRequestChaincode.AccessRequestExists(ctx, patientId, practitionerId);
	}

	// GetAccessRequestsByReviewed - gets all access requests attached to user from context by reviewed property
	async GetAccessRequestsByReviewed(ctx, reviewed){
		let accessReqs = await AccessRequestChaincode.GetAccessRequestsByReviewed(ctx, reviewed);
		return JSON.stringify(accessReqs);
	}

	// GetAccessRequestsByStatus - gets all access requests attached to user from context by decision property
	async GetAccessRequestsByStatus(ctx, status){
		let accessReqs = await AccessRequestChaincode.GetAccessRequestsByStatus(ctx, status);
		return JSON.stringify(accessReqs);
	}

	// GetRecentAccessRequests - gets most recent access requests of user from context
	async GetRecentAccessRequests(ctx){
		let accessReqs = await AccessRequestChaincode.GetRecentAccessRequests(ctx);
		return JSON.stringify(accessReqs);
	}

	// ReviewAccessRequest - updates access request with patients decision
	async ReviewAccessRequest(ctx, requestId, desicion, availableFrom, availableUntil, itemsAccess, time){
		return await AccessRequestChaincode.ReviewAccessRequest(ctx, requestId, desicion, availableFrom, availableUntil, itemsAccess, time);
	}

	// GetAccessRequestHistory - gets access request history
	async GetAccessRequestHistory(ctx, requestId){
		let accessReqHistory = await AccessRequestChaincode.GetAccessRequestHistory(ctx, requestId);
		return JSON.stringify(accessReqHistory);
	}

	// GetAllAvailableAccessRequests - gets all approved requests related to practitioner form ctx
	async GetAllAvailableAccessRequests(ctx) {
		let role = await Util.GetUserRole(ctx);

		if(role !== 'ROLE_PRACTITIONER'){
			throw new Error('unauthorized access to patient record!');
		}

		let availableRequests = await AccessRequestChaincode.GetAvailableAccessRequests(ctx);
		return JSON.stringify(availableRequests);
	}

	// ==================================================================================================
	// ====================================== PATIENT IDENTIFIERS =======================================
	// ==================================================================================================

	// UserExists - if user exists returns Identifier object
	async UserExists(ctx, identifier){
		const methodName = 'UserExists';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}
		let patientIdentifiers = await PatientIdentifiersChaincode.UserExists(ctx, identifier);
		return JSON.stringify(patientIdentifiers);
	}

	// GetPatientIdentifiers
	async GetPatientIdentifiers(ctx, identifier){
		const methodName = 'GetPatientIdentifiers';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}
		console.log('User authorized');
		let hashedIdentifier = await Util.CreateHash(identifier);
		let patientIdentifiers = await PatientIdentifiersChaincode.GetPatientIdentifiers(ctx, hashedIdentifier);
		return JSON.stringify(patientIdentifiers);
	}

	// UpdatePatientIdentifiers
	async UpdatePatientIdentifiers(ctx, identifiersId, hashedIdentifier, offlineIdentifierUrl, hashedIdentifiers, salt, time){
		const methodName = 'UpdatePatientIdentifiers';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}
		console.log('User authorized');
		let patientIdentifiers = await PatientIdentifiersChaincode.UpdatePatientIdentifiers(ctx, identifiersId, hashedIdentifier, offlineIdentifierUrl, hashedIdentifiers, salt, time);
		return JSON.stringify(patientIdentifiers);
	}

	// ==================================================================================================
	// ========================================= PATIENT RECORD =========================================
	// ==================================================================================================

	// CreatePatientRecord - creates patient record, patient identifiers and association
	async CreatePatientRecord(ctx, identifier, hashedUserId, offlineDataUrl, hashedData, salt, offlineIdentifiersUrl,identifiersHashedData, identifiersSalt, time) {
		const methodName = 'CreatePatientRecord';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);
		let cn = await Util.GetCN(ctx);

		if(!hasPermission || hashedUserId !== cn){
			throw new Error(`Unauthorized access: ${methodName}`);
		}
		console.log('User authorized');

		let hashedIdentifier = await Util.CreateHash(identifier);
		let patientRecord = await PatientRecordChaincode.CreatePatientRecord(ctx, hashedIdentifier, offlineDataUrl, hashedData, salt, time);
		await AssociationPatientRecordChaincode.CreateAssociation(ctx, hashedUserId, patientRecord.recordId, time);
		await PatientIdentifiersChaincode.CreatePatientIdentifiers(ctx, hashedIdentifier, offlineIdentifiersUrl, identifiersHashedData, identifiersSalt, time);
		return JSON.stringify(patientRecord);
	}

	// GetPatientRecordByIdentifier - create a patient record, store into chaincode state
	// async GetPatientRecordByIdentifier(ctx, identifier) {
	// 	let patientRecord = await PatientRecordChaincode.CreatePatientRecord(ctx, identifier, hashedUserId, offlineDataUrl, hashedData, salt, time);
	// 	await AssociationPatientRecordChaincode.CreateAssociation(ctx, hashedUserId, patientRecord.uniqueId, time);
	// 	return JSON.stringify(patientRecord);
	// }


	// GetMyPatientRecord - retreive patient record of user with patiendId
	async GetMyPatientRecord(ctx) {
		let role = await Util.GetUserRole(ctx);
		let userId = await Util.GetCN(ctx);

		if(role !== 'ROLE_PATIENT'){
			throw new Error('Unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, userId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		let patientRecord = await PatientRecordChaincode.GetPatientRecord(ctx, association.recordId);
		return JSON.stringify(patientRecord);
	}

	// UpdatePatientRecord - update patient record with new hash of record data
	async UpdateMyPatientRecord(ctx, offlineDataUrl, hashedData, salt, time) {
		let role = await Util.GetUserRole(ctx);
		let userId = await Util.GetCN(ctx);

		if(role !== 'ROLE_PATIENT'){
			throw new Error('Unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, userId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		let patientRecord = await PatientRecordChaincode.UpdatePatientRecord(ctx, association.recordId, offlineDataUrl, hashedData, salt, time);
		return JSON.stringify(patientRecord);
	}

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// PreviewPatientRecord - returns if user has permission to see preview of patient record
	async PreviewPatientRecord(ctx) {
		let role = await Util.GetUserRole(ctx);

		let result = true;
		if(role !== 'ROLE_PRACTITIONER'){
			result = false;
		}

		return JSON.stringify(result);
	}

	// UpdatePatientRecord - update patient record with new hash of record data
	async UpdatePatientRecord(ctx, patientId, hashedData, time) {
		let role = await Util.GetUserRole(ctx);

		if(role !== 'ROLE_PRACTITIONER'){
			throw new Error('Unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, patientId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		let patientRecord = await PatientRecordChaincode.UpdatePatientRecord(ctx, association.recordId, hashedData, time);
		patientRecord.userId = patientId;
		return JSON.stringify(patientRecord);
	}

	// GetPatientRecord - retreive patient record of user with patiendId
	async GetPatientRecord(ctx, uniqueId) {
		let role = await Util.GetUserRole(ctx);

		if(role !== 'ROLE_PRACTITIONER' || role !== 'ROLE_ADMIN' ){
			throw new Error('unauthorized access to patient record!');
		}

		let patientRecord = await PatientRecordChaincode.GetPatientRecord(ctx, uniqueId);
		return JSON.stringify(patientRecord);
	}


	// ==================================================================================================
	// =============================================== END ==============================================
	// ==================================================================================================

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

	// Example: Ad hoc rich query
	// QueryAssets uses a query string to perform a query for assets.
	// Query string matching state database syntax is passed in and executed as is.
	// Supports ad hoc queries that can be defined at runtime by the client.
	// If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
	// Only available on state databases that support rich query (e.g. CouchDB)
	async QueryAssets(ctx, queryString) {
		return await this.GetQueryResultForQueryString(ctx, queryString);
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

}

module.exports = Chaincode;