const { Util } = require('./util.js');
const {AccessRequest} = require('./asset_definition.js');
const {DocType, AccessRequestDecision, Role} = require('./enums.js');

class AccessRequestChaincode{
	
	// ==================================================================================================
	// ========================================= PUBLIC METHODS =========================================
	// ==================================================================================================

	// GetAccessRequestForUser - get access request between ctx user and userId, stored into chaincode state
	static async GetAccessRequestForUser(ctx, userId){
		this.writeInfo("GetAccessRequestForUser");
		const role = await Util.GetUserRole(ctx);
		const cn = await Util.GetCN(ctx);
		let result;

		if(role === Role.PATIENT){
			result = await this.#searchAccessRequest(ctx, cn, userId);
		}else if(role === Role.PRACTITIONER){
			result = await this.#searchAccessRequest(ctx, userId, cn);
		}else{
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		return result;
	}

	// GetAvailableAccessRequests - get all available requests for practitioner from ctx
	static async GetAvailableAccessRequests(ctx){
		this.writeInfo("GetAvailableAccessRequests");
		const cn = await Util.GetCN(ctx);
		let result = await this.#searchAccessRequestByPractitioner(ctx, cn);

		let returnVal = []
		result.forEach(resultItem => {
			if(this.#checkRequestAvailability(resultItem.Record)){
				returnVal.push(resultItem.Record);
			}
		});

		return returnVal;
	}

	// CreateAccessRequest - create a new access request between ctx user and patientId, store into chaincode state
	static async CreateAccessRequest(ctx, patientId, time){
		this.writeInfo("CreateAccessRequest");
		const methodName = 'CreateAccessRequest';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		const cn = await Util.GetCN(ctx);
		let result = await this.#searchAccessRequest(ctx, patientId, cn);
		if(result){
			console.log(`Access Request for ids:[${patientId} , ${cn}] already exists`);
			console.log('Sending new access request...');
			console.log(result.decision);
			switch (result.decision) {
				case AccessRequestDecision.UNLIMITED:
					return result;

				case AccessRequestDecision.NO_ACCESS:
					result = await this.#resendAccessRequest(ctx, result, time)
					console.log('Access request sent.');
					return result;

				case AccessRequestDecision.ONE_TIME:
					if(result.availableFrom > new Date()){
						console.log(`Patient record will be available starting  ${availableFrom}`);
						return result;
					}else if(result.availableUntil < new Date()){
						result = await this.#resendAccessRequest(ctx, result, time)
						console.log('Access request sent.');
						return result;
					}else{
						return result;
					}

				default:
					return result;
			}
		}
		let txID =  ctx.stub.getTxID();
		const uniqueID = await Util.GenerateID(DocType.ACCESS_REQUEST, txID);
		const accessReq = new AccessRequest(uniqueID ,patientId, cn, time, txID);
		console.log(accessReq)
		await ctx.stub.putState(uniqueID, Buffer.from(JSON.stringify(accessReq)));

		return accessReq;
	}

	// GetAccessRequest - checks if access request is approved
	static async GetAccessRequest(ctx, requestId){
		this.writeInfo("GetAccessRequest");		
		let accessReq = await this.#getAccessRequest(ctx, requestId);
		return accessReq;
	}

	// AccessRequestExists - checks if access request already exists in chaincode state, it uses index defined in indexPatientPractitioner.json file (by default)
	static async AccessRequestExists(ctx, patientId, practitionerId){
		this.writeInfo("AccessRequestExists");
		const accessReq = await this.#searchAccessRequest(ctx, patientId, practitionerId);
		return accessReq !== null;
	}

	// GetAccessRequestsByReviewed - gets all access requests attached to user from context by reviewed property
	static async GetAccessRequestsByReviewed(ctx, reviewed){
		this.writeInfo("GetAccessRequestsByReviewed");
		const role = await Util.GetUserRole(ctx);
		const userId = await Util.GetCN(ctx);

		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.reviewed = Util.ConvertToBool(reviewed);

		let results;
		if(role == Role.PATIENT){
			queryString.selector.patientId = userId;
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else if(role == Role.PRACTITIONER){
			queryString.selector.practitionerId = userId;
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else{
			throw new Error('Unauthorized access');
		}

		let resultsJson = [];
		results.forEach(element => {
			resultsJson.push(element.Record);
		});
		
		return resultsJson;
	}

	// GetAccessRequestsByStatus - gets all access requests attached to user from context by decision property
	static async GetAccessRequestsByStatus(ctx, status){
		this.writeInfo("GetAccessRequestsByStatus");
		const role = await Util.GetUserRole(ctx);
		const userId = await Util.GetCN(ctx);

		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.decision = AccessRequestDecision[status];

		let results;
		if(role == Role.PATIENT){
			queryString.selector.patientId = userId;
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else if(role == Role.PRACTITIONER){
			queryString.selector.practitionerId = userId;
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else{
			throw new Error('Unauthorized access');
		}

		let resultsJson = [];
		results.forEach(element => {
			resultsJson.push(element.Record);
		});
		
		return resultsJson;
	}

	// GetRecentAccessRequests - gets most recent access requests of user from context
	static async GetRecentAccessRequests(ctx){
		this.writeInfo("GetRecentAccessRequests");
		const role = await Util.GetUserRole(ctx);
		const userId = await Util.GetCN(ctx);

		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.lastUpdated = {};
		queryString.selector.lastUpdated.$gte = 0;
		queryString.sort = [];
		let lastUpdatedObj = {};
		lastUpdatedObj.lastUpdated = "desc";
		queryString.sort.push(lastUpdatedObj);

		let results;
		if(role == Role.PATIENT){
			queryString.selector.patientId = userId;
			console.log(queryString)
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else if(role == Role.PRACTITIONER){
			queryString.selector.practitionerId = userId;
			console.log(queryString)
			results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

		}else{
			throw new Error('Unauthorized access');
		}

		let resultsJson = [];
		results.forEach(element => {
			resultsJson.push(element.Record);
		});
		
		return resultsJson;
	}
	
	// ReviewAccessRequest - updates access request with patients decision
	static async ReviewAccessRequest(ctx, requestId, decision, availableFrom, availableUntil, itemsAccess, time){
		this.writeInfo("ReviewAccessRequest");
		if(!this.#isDecisionValid(decision)){
			throw new Error('ReviewAccessRequest: Invalid values for update');
		}

		const methodName = 'ReviewAccessRequest';
		const hasPermission = await Util.RoleHasPermission(ctx, methodName);

		// Check if user has patient role
		if(!hasPermission){
			throw new Error(`Unauthorized access: ${methodName}`);
		}

		const accessReq = await this.#getAccessRequest(ctx, requestId);

		// Check if user is updating its own access request
		const userId = Util.GetCN(ctx);
		if(userId !== accessReq.patientId){
			throw new Error(`Unauthorized access: ${methodName}`);
		}
		
		let txID =  ctx.stub.getTxID();

		accessReq.decision = decision;
		accessReq.availableFrom = availableFrom;
		accessReq.availableUntil = availableUntil;
		accessReq.itemsAccess = itemsAccess;
		accessReq.reviewed = true;
		accessReq.lastUpdated = time;
		accessReq.lastUpdatedTxId = txID;

		let requestJSONasBytes = Buffer.from(JSON.stringify(accessReq));
		await ctx.stub.putState(requestId, requestJSONasBytes); //rewrite the request
	}

	// GetAccessRequestHistory - gets access request history
	static async GetAccessRequestHistory(ctx, requestId) {
		this.writeInfo("GetAccessRequestHistory");

		let resultsIterator = await ctx.stub.getHistoryForKey(requestId);
		let results = await Util._GetAllResults(resultsIterator, true);

		return results;
	}

	// CheckIfAccessRequestValid returns the chain of custody for an asset since issuance.
	static async CheckIfAccessRequestValid(accessRequest) {
		this.writeInfo("CheckIfAccessRequestValid");
		let valid = this.#checkRequestAvailability(accessRequest);
		return valid;
		
	}

	// GetAccessRequest returns access request stored
	static async GetAccessRequest(ctx, accessRequestId) {
		this.writeInfo("GetAccessRequest");
		let accessRequest = await this.#getAccessRequest(ctx, accessRequestId);
		return accessRequest;
		
	}

	// ==================================================================================================
	// ======================================== PRIVATE METHODS =========================================
	// ==================================================================================================


	// #searchAccessRequest - searches for access request with specific patient and pracitioner involved, stored into chaincode state
	static #checkRequestAvailability(request){
		this.writeInfo("#checkRequestAvailability");
		switch (request.decision) {
			case AccessRequestDecision.UNDEFINED:
				return false;

			case AccessRequestDecision.UNLIMITED:
				return true;

			case AccessRequestDecision.NO_ACCESS:
				return false;

			case AccessRequestDecision.ONE_TIME:
				if(request.availableFrom > new Date()){
					console.log(`Patient record will be available starting at ${availableFrom}`);
					return false;
				}else if(request.availableUntil < new Date()){
					return false;
				}else{
					return true;
				}

			default:
				return false;
		}
	}

	// #searchAccessRequest - searches for access request with specific patient and pracitioner involved, stored into chaincode state
	static async #searchAccessRequest(ctx, patientId, practitionerId){
		this.writeInfo("#searchAccessRequest");
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.patientId = patientId;
		queryString.selector.practitionerId = practitionerId;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		if(results.length === 1){
			console.log(results[0]);
			return results[0].Record;
		}else if(results.length === 0){
			console.log('NULL');
			return null;
		}else{
			throw new Error(`Found multiple assets of type ${DocType.ACCESS_REQUEST} and ids: [${patientId} , ${practitionerId}]`);
		}
	}

	// #searchAccessRequest - searches for access request with specific patient and pracitioner involved, stored into chaincode state
	static async #searchAccessRequestByPractitioner(ctx, practitionerId){
		this.writeInfo("#searchAccessRequestByPractitioner");
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_REQUEST;
		queryString.selector.practitionerId = practitionerId;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		
		if(results.length === 0){
			console.log('NULL');
			return null;
		}

		return results;
	}

	// #getAccessRequest - get access request, stored into chaincode state
	static async #getAccessRequest(ctx, requestId){
		this.writeInfo("#getAccessRequest");
		let requestAsBytes = await ctx.stub.getState(requestId);
		if (!requestAsBytes || !requestAsBytes.toString()) {
			throw new Error(`Access request ${requestId} does not exist`);
		}
		let request = {};
		try {
			request = JSON.parse(requestAsBytes.toString()); //unmarshal
		} catch (err) {
			let jsonResp = {};
			jsonResp.error = 'Failed to decode JSON of: ' + requestId;
			throw new Error(jsonResp);
		}
		return request;
	}

	// resendAccessRequest - updates access request like it is new request
	static async #resendAccessRequest(ctx, request, time){
		this.writeInfo("#resendAccessRequest");
		
		let txID =  ctx.stub.getTxID();

		request.decision = AccessRequestDecision.UNDEFINED;
		request.availableFrom = '';
		request.availableUntil = '';
		request.reviewed = false;
		request.lastUpdated = time;
		request.lastUpdatedTxId = txID;

		let requestJSONasBytes = Buffer.from(JSON.stringify(request));
		await ctx.stub.putState(request.requestId, requestJSONasBytes); //rewrite the request
		return request;
	}

	static #isDecisionValid(decision){
		this.writeInfo("#isDecisionValid");
		let found = false;
		Object.keys(AccessRequestDecision).forEach(decisionEnum => {
			if(decisionEnum == decision){
				found = true;
			}
		})
		return found;
		
	}

	static writeInfo(method){
		console.log("AccessRequestChaincode: " + method);
	}

}

module.exports = {AccessRequestChaincode};