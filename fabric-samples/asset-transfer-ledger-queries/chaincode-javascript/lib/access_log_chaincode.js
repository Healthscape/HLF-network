const {Util} = require('./util.js');
const {AccessLog} = require('./asset_definition.js');
const {DocType} = require('./enums.js');

class AccessLogChaincode{
	
	// ==================================================================================================
	// ========================================= PUBLIC METHODS =========================================
	// ==================================================================================================

	// AddAccessLog - creates new access log
	static async AddAccessLog(ctx, recordId, time, action){
		const methodName = 'AddAccessLog';
		this.writeInfo(methodName);

		let txID = await ctx.stub.getTxID();
		let accessorId = await Util.GetCN(ctx);
		let accessorName = await Util.GetUserName(ctx);
		let accessorRole = await Util.GetUserRole(ctx);
		let accessorOrg = "Healthscape";

		let id = await Util.GenerateID(DocType.ACCESS_LOG, txID);
		let accessLog = new AccessLog(id, recordId, accessorId, accessorName, accessorRole, accessorOrg, action, time, txID);
		await ctx.stub.putState(id, Buffer.from(JSON.stringify(accessLog)));
		console.log(`Access log saved: [id: ${id}]`);

		return accessLog;
	}

	// GetAccessLogsForUser - gets all access logs for user
	static async GetAccessLogsForUser(ctx, recordId){
		const methodName = 'GetAccessLogsForUser';
		this.writeInfo(methodName);
		this.writeInfo("For recordId: " + recordId);

		return await this.#getAccessLogs(ctx, recordId);
	}
	// ==================================================================================================
	// ======================================== PRIVATE METHODS =========================================
	// ==================================================================================================


	// #getAccessLogs - gets identifiers if patient with identifier exists
	static async #getAccessLogs(ctx, recordId){
		this.writeInfo("#getAccessLogs");
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = DocType.ACCESS_LOG;
		queryString.selector.recordId = recordId;
		let results =  await Util.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
		if(results.length >= 1){
			return results;
		}else if(results.length === 0){
			return undefined;
		}
	}

	static writeInfo(method){
		console.log("AccessLogChaincode: " + method);
	}

}

module.exports = {AccessLogChaincode};