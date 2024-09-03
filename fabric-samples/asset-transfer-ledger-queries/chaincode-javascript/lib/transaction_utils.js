const { Util } = require('./util.js');

class TransactionUtils{

	static async beforeTransaction(ctx) {
		const functionAndParameters = ctx.stub.getFunctionAndParameters();
		const params = functionAndParameters.params.join(',');
		const function_ = functionAndParameters.fcn;

		console.log();
		console.log('===================================== START =====================================');
		console.info(`Function name: ${function_}, params: [${params}]`);
		await this.clientIdentityInfo(ctx);
	}

	static async clientIdentityInfo(ctx) {
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

	static async afterTransaction() {
		console.log('===================================== END =====================================');
		console.log('===============================================================================');
	}
}

module.exports = {TransactionUtils};