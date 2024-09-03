/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

const { Contract } = require('fabric-contract-api');
const { Util } = require('./util.js');
const { PatientRecordChaincode } = require('./patient_record_chaincode.js');
const { AccessLogChaincode } = require('./access_log_chaincode.js');
const { AssociationPatientRecordChaincode } = require('./association_chaincode.js');
const { PatientIdentifiersChaincode } = require('./patient_identifiers_chaincode.js');
const { TransactionUtils } = require('./transaction_utils.js');
const { Action } = require('./enums.js');


class Chaincode extends Contract {
	async beforeTransaction(ctx){
		TransactionUtils.beforeTransaction(ctx);
	}

	async afterTransaction(){
		TransactionUtils.afterTransaction();
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
		await AccessLogChaincode.AddAccessLog(ctx, patientRecord.recordId, time, Action.CREATE);
		return JSON.stringify(patientRecord);
	}

	// GetPatientRecord - retreive patient record of user with hashedUserId
	async GetPatientRecord(ctx, hashedUserId, time) {
		let role = await Util.GetUserRole(ctx);

		if(role !== 'ROLE_PRACTITIONER'){
			throw new Error('unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, hashedUserId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		let patientRecord = await PatientRecordChaincode.GetPatientRecord(ctx, association.recordId);
		await AccessLogChaincode.AddAccessLog(ctx, association.recordId, time, Action.VIEW);
		return JSON.stringify(patientRecord);
	}

	// UpdatePatientRecord - update patient record with new hash of record data
	async UpdatePatientRecord(ctx, hashedUserId, offlineDataUrl, hashedData, salt, time) {
		let role = await Util.GetUserRole(ctx);

		if(role !== 'ROLE_PRACTITIONER'){
			throw new Error('Unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, hashedUserId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		let patientRecord = await PatientRecordChaincode.UpdatePatientRecord(ctx, association.recordId, offlineDataUrl, hashedData, salt, time);
		await AccessLogChaincode.AddAccessLog(ctx, association.recordId, time, Action.EDIT);
		return JSON.stringify(patientRecord);
	}

	// GetPatientRecordByIdentifier - create a patient record, store into chaincode state
	// async GetPatientRecordByIdentifier(ctx, identifier) {
	// 	let patientRecord = await PatientRecordChaincode.CreatePatientRecord(ctx, identifier, hashedUserId, offlineDataUrl, hashedData, salt, time);
	// 	await AssociationPatientRecordChaincode.CreateAssociation(ctx, hashedUserId, patientRecord.uniqueId, time);
	// 	return JSON.stringify(patientRecord);
	// }


	// GetMyPatientRecord - retreive patient record of user with patiendId
	async GetMyPatientRecord(ctx, time) {
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
		await AccessLogChaincode.AddAccessLog(ctx, association.recordId, time, Action.VIEW);
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
		await AccessLogChaincode.AddAccessLog(ctx, association.recordId, time, Action.EDIT);
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


	// ==================================================================================================
	// =========================================== ACCESS LOG ===========================================
	// ==================================================================================================

	// GetAccessLog - return list of all access log entries
	async GetAccessLog(ctx) {
		let role = await Util.GetUserRole(ctx);
		let userId = await Util.GetCN(ctx);

		if(role !== 'ROLE_PATIENT'){
			throw new Error('Unauthorized access to patient record!');
		}

		let association = await AssociationPatientRecordChaincode.GetAssociation(ctx, userId);

		if(!association){
			throw new Error('Invalid patient id.');
		}

		const accessLog = await AccessLogChaincode.GetAccessLogsForUser(ctx, association.recordId);
		return JSON.stringify(accessLog);
	}

	// ==================================================================================================
	// =============================================== END ==============================================
	// ==================================================================================================

}

module.exports = Chaincode;