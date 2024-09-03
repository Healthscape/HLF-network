const { Util } = require('./util.js');
const { PatientRecord } = require('./asset_definition.js');
const { DocType } = require('./enums.js');

class PatientRecordChaincode {
	
	// ==================================================================================================
	// ========================================= PUBLIC METHODS =========================================
	// ==================================================================================================

	// CreatePatientRecord - create a patient record, store into chaincode state
	static async CreatePatientRecord(ctx, hashedIdentifier, offlineDataUrl, hashedData, salt, time){
		if(hashedIdentifier === ""){
			throw new Error(`Identifier not specified!`);
		}

		if(await this.#getPatientRecordWithIdentifier(ctx, hashedIdentifier) !== ""){
			throw new Error(`Patient record already exists.`);
		}

		let txID =  ctx.stub.getTxID();
		const recordId = await Util.GenerateID(DocType.PATIENT_RECORD, txID);
		const patientRecord = new PatientRecord(recordId, hashedIdentifier, offlineDataUrl, hashedData, salt, time, txID);
		await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(patientRecord)));
		console.log(`Patient Record saved: [recordId: ${recordId}]`);

		return patientRecord;
	}

	// UpdatePatientRecord - update patient record with new hash of record data
	static async UpdatePatientRecord(ctx, recordId, offlineDataUrl, hashedData, salt, time){
		this.writeInfo("UpdatePatientRecord");
		let txID =  ctx.stub.getTxID()
		const patientRecord = await this.#getPatientRecord(ctx, recordId);

		if(!patientRecord){
			throw new Error(`Patient record ${recordId} does not exist`);
		}

		patientRecord.offlineDataUrl = offlineDataUrl;
		patientRecord.hashedData = hashedData;
		patientRecord.salt = salt;
		patientRecord.lastUpdated = time;
		patientRecord.lastUpdatedTxId = txID;

		let requestJSONasBytes = Buffer.from(JSON.stringify(patientRecord));
		await ctx.stub.putState(recordId, requestJSONasBytes); //rewrite the request
		return patientRecord;
	}
	
	// GetPatientRecord - retreive patient record of user with recordId
	static async GetPatientRecord(ctx, recordId){
		this.writeInfo("GetPatientRecord");
		const patientRecord = await this.#getPatientRecord(ctx, recordId);

		if(!patientRecord){
			throw new Error(`Patient record ${recordId} does not exist`);
		}

		return patientRecord;
	}

	// ==================================================================================================
	// ======================================== PRIVATE METHODS =========================================
	// ==================================================================================================

	// #getPatientRecord - get record by record id
	static async #getPatientRecord(ctx, recordId){
		this.writeInfo("#getPatientRecord");
		let requestAsBytes = await ctx.stub.getState(recordId);
		if (!requestAsBytes || !requestAsBytes.toString()) {
			return null;
		}
		let request = {};
		try {
			request = JSON.parse(requestAsBytes.toString()); //unmarshal
		} catch (err) {
			let jsonResp = {};
			jsonResp.error = 'Failed to decode JSON of: ' + identifer;
			throw new Error(jsonResp);
		}
		return request;
	}

	// #getPatientRecordWithIdentifier - gets record if patient with identifier exists
	static async #getPatientRecordWithIdentifier(ctx, identifier){
		this.writeInfo("#getPatientRecordWithIdentifier");
		const hashedIdentifier = await Util.CreateHash(identifier);
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.PATIENT_RECORD;
		queryString.selector.hashedIdentifier = hashedIdentifier;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		if(results.length === 1){
			console.log(true);
			return results[0];
		}else if(results.length === 0){
			console.log(false);
			return "";
		}else{
			throw new Error(`Found multiple assets of type ${DocType.PATIENT_RECORD} with id: [${hashedIdentifier}]`);
		}
	}

	static writeInfo(method){
		console.log("AssociationPatientRecordChaincode: " + method);
	}
}

module.exports = {PatientRecordChaincode};