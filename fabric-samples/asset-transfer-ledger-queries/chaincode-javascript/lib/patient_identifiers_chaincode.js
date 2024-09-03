const { Util } = require('./util.js');
const { PatientIdentifiers } = require('./asset_definition.js');
const { DocType } = require('./enums.js');

class PatientIdentifiersChaincode {
	
	// ==================================================================================================
	// ========================================= PUBLIC METHODS =========================================
	// ==================================================================================================

	// UserExists - checks if user with personalId already exist
	static async UserExists(ctx, identifier){
		return await this.#getPatientIdentifiers(ctx, identifier, false);
	}

	// CreatePatientIdentifiers - creates patient identifiers block
	static async CreatePatientIdentifiers(ctx, hashedIdentifier, offlineIdentifiersUrl, identifiersHashedData, identifiersSalt, time){
		const methodName = 'CreatePatientIdentifiers';
		this.writeInfo(methodName);
		this.writeInfo("Saving user with hashedIdentifier: ", hashedIdentifier);

		let txID =  ctx.stub.getTxID();
		const identifiersId = await Util.GenerateID(DocType.PATIENT_IDENTIFIERS, txID);
		const patientIdentifiers = new PatientIdentifiers(identifiersId, hashedIdentifier, offlineIdentifiersUrl, identifiersHashedData, identifiersSalt, time, txID);
		await ctx.stub.putState(identifiersId, Buffer.from(JSON.stringify(patientIdentifiers)));
		console.log(`Patient Identifiers saved: [identifiersId: ${identifiersId}]`);

		return patientIdentifiers;
	}

	// GetPatientIdentifiers - gets patient identifiers block
	static async GetPatientIdentifiers(ctx, hashedIdentifier){
		const patientIdentifiers = await this.#getPatientIdentifiers(ctx, hashedIdentifier, false);

		if(!patientIdentifiers){
			throw new Error(`Patient identifiers ${hashedIdentifier} does not exist`);
		}

		return patientIdentifiers;
    }

	// UpdatePatientIdentifiers - update identifiers of existing patient to add new one
	static async UpdatePatientIdentifiers(ctx, identifiersId, hashedIdentifier, offlineIdentifierUrl, hashedIdentifiers, salt, time){
		let txID =  ctx.stub.getTxID()
		const patientIdentifiers = await this.#getPatientIdentifiers(ctx, hashedIdentifier, true);

		if(!patientIdentifiers){
			throw new Error(`Patient record ${hashedIdentifier} does not exist`);
		}

		patientIdentifiers.offlineIdentifierUrl = offlineIdentifierUrl;
		patientIdentifiers.hashedIdentifiers = hashedIdentifiers;
		patientIdentifiers.salt = salt;
		patientIdentifiers.lastUpdated = time;
		patientIdentifiers.lastUpdatedTxId = txID;

		let requestJSONasBytes = Buffer.from(JSON.stringify(patientIdentifiers));
		await ctx.stub.putState(identifiersId, requestJSONasBytes); //rewrite the request
		return patientIdentifiers;
    }


	// ==================================================================================================
	// ======================================== PRIVATE METHODS =========================================
	// ==================================================================================================

	// #getPatientIdentifiers - gets identifiers if patient with identifier exists
	static async #getPatientIdentifiers(ctx, identifier, isHashed){
		this.writeInfo("#getPatientIdentifiers");
		let hashedIdentifier = identifier;
		if(!isHashed){
			hashedIdentifier = await Util.CreateHash(identifier);
		}
		this.writeInfo("hashedIdentifier: {}");
		this.writeInfo(hashedIdentifier);
		this.writeInfo("identifier: {}");
		this.writeInfo(identifier);
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.PATIENT_IDENTIFIERS;
		queryString.selector.hashedIdentifier = hashedIdentifier;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		this.writeInfo(JSON.stringify(results));
		if(results.length === 1){
			this.writeInfo(true);
			return results[0].Record;
		}else if(results.length === 0){
			this.writeInfo(false);
			return undefined;
		}else{
			throw new Error(`Found multiple assets of type ${DocType.PATIENT_IDENTIFIERS} with id: [${hashedIdentifier}]`);
		}
	}

	static writeInfo(method){
		console.log("PatientIdentifierChaincode: " + method);
	}
}

module.exports = {PatientIdentifiersChaincode};