const { Util } = require('./util.js');
const { AssociationPatientRecord } = require('./asset_definition.js');
const { DocType } = require('./enums.js');

class AssociationPatientRecordChaincode {
	
	// ==================================================================================================
	// ========================================= PUBLIC METHODS =========================================
	// ==================================================================================================

	// CreateAssociation - creates new association between patientId and recordId
	static async CreateAssociation(ctx, userId, recordId, time){
		this.writeInfo("CreateAssociation");
		let txID =  ctx.stub.getTxID();
		const uniqueID = await Util.GenerateID(DocType.ASSOCIATION, txID);
		const association = new AssociationPatientRecord(uniqueID, userId, recordId, time, txID);
		console.log(`Association saved: [userId: ${userId}, recordId: ${recordId}]`)
		await ctx.stub.putState(uniqueID, Buffer.from(JSON.stringify(association)));
	}

	// GetAssociation - returns association to recordId for given patientId
	static async GetAssociation(ctx, patientId){
		this.writeInfo("GetAssociation");
		const association = await this.#searchAssociation(ctx, patientId);
		return association;
	}

	// GetAssociations - returns associations for access requests
	static async GetAssociations(accessRequestList){
		this.writeInfo("GetAssociations");
		let associationList = [];
		for(let request of accessRequestList){
			let association = await this.#searchAssociation(ctx, request.patientId);
			associationList.push(association)
		}
		return associationList;
	}
	// ==================================================================================================
	// ======================================== PRIVATE METHODS =========================================
	// ==================================================================================================

	// #searchAssociation - searches for association for patientId, stored into chaincode state
	static async #searchAssociation(ctx, patientId){
		this.writeInfo("#searchAssociation");
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ASSOCIATION;
		queryString.selector.userId = patientId;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		if(results.length === 1){
			console.log(results[0]);
			return results[0].Record;
		}else if(results.length === 0){
			console.log('NULL');
			return "";
		}else{
			throw new Error(`Found multiple assets of type ${DocType.ASSOCIATION} for patient id: ${patientId}`);
		}
	}

	static writeInfo(method){
		console.log("AssociationPatientRecordChaincode: " + method);
	}
}

module.exports = {AssociationPatientRecordChaincode};