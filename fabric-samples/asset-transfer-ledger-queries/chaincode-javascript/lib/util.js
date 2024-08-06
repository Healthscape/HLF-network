const asn1js = require('asn1js');
const pkijs = require('pkijs');
const crypto = require('crypto-js');

class Util{

	static async GenerateID(docType, txId){
		this.writeInfo('GenerateID');
		const combinedAttributes = docType + txId;

		const hash = crypto.SHA256(combinedAttributes);
		const hashHex = hash.toString(crypto.enc.Hex);
		return hashHex;
	}

	static async CreateHash(plainData){
		this.writeInfo('CreateHash');

		const hash = crypto.SHA256(plainData);
		const hashHex = hash.toString(crypto.enc.Hex);
		this.writeInfo(hash);
		this.writeInfo(hashHex);
		return hashHex;
	}

	static async RoleHasPermission(ctx, methodName){
		this.writeInfo('RoleHasPermission');
		const role = await this.GetUserRole(ctx);
		switch(methodName){
		case 'UserExists':
			return role === 'ROLE_ADMIN';
		case 'UpdatePatientIdentifiers':
			return role === 'ROLE_ADMIN';
		case 'GetPatientIdentifiers':
			return role === 'ROLE_ADMIN';
		case 'GetPatientRecordByIdentifier':
			return role === 'ROLE_ADMIN';
		case 'GetAccessRequestForUser':
			return ['ROLE_PRACTITIONER', 'ROLE_PATIENT'].includes(role);
		case 'CreateAccessRequest':
			return role === 'ROLE_PRACTITIONER';
		case 'ReviewAccessRequest':
			return role === 'ROLE_PATIENT';
		case 'CreatePatientRecord':
			return role === 'ROLE_PATIENT';
		case 'UpdatePatientRecord':
			return ['ROLE_PRACTITIONER', 'ROLE_PATIENT'].includes(role);
		default:
			console.log('Undefined method name');
			return false;
		}
	}

	static GetCN(ctx){
		this.writeInfo('GetCN');
		const clientIdentity = ctx.clientIdentity;
		const id = clientIdentity.getID();
		let cnIndex = id.indexOf('CN=');
		let cnEndIndex = id.indexOf(':', cnIndex);
		const name = id.substring(cnIndex + 3, cnEndIndex);
		return name.trim();
	}

	static async GetUserRole(ctx) {
		this.writeInfo('GetUserRole');
		const creatorBytes = ctx.stub.getCreator();
		const clientIdentity = new TextDecoder().decode(creatorBytes.idBytes);

		const userCert = await this.GenerateX509CertificateFromPEM(clientIdentity);
		const extensions = userCert.extensions;
		const customExtension = extensions.find(ext => ext.extnID === '1.2.3.4.5.6.7.8.1');

		if(customExtension === undefined){
			return 'ROLE_ADMIN';
		}

		const extnValue = customExtension.extnValue.valueBeforeDecodeView;
		const decoder = new TextDecoder();
		const extnValueDecoded = decoder.decode(extnValue);

		const startIndex = extnValueDecoded.indexOf('ROLE_');
		const endIndex = extnValueDecoded.indexOf('"', startIndex);

		if(startIndex === -1){
			throw new Error('Invalid certificate: Inadequate role');
		}

		const role = extnValueDecoded.substring(startIndex, endIndex);

		console.log('Role of user running the request is: ' + role);

		return role;
	}

	static async GenerateX509CertificateFromPEM(pemCertificate) {
		this.writeInfo('GenerateX509CertificateFromPEM');
		const cleanedPem = pemCertificate.replace('-----BEGIN CERTIFICATE-----', '')
			.replace('-----END CERTIFICATE-----', '')
			.replace(/\n/g, '');

		// eslint-disable-next-line indent
		try {
			const asn1 = asn1js.fromBER(Buffer.from(cleanedPem, 'base64'));
			const certificate = new pkijs.Certificate({ schema: asn1.result });
			return certificate;
		} catch (e) {
			throw new Error('Failed to generate X.509 certificate from PEM');
		}
	}


	// GetQueryResultForQueryString executes the passed in query string.
	// Result set is built and returned as a byte array containing the JSON results.
	static async GetQueryResultForQueryString(ctx, queryString) {
		this.writeInfo('GetQueryResultForQueryString');

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return results;
	}


	// This is JavaScript so without Funcation Decorators, all functions are assumed
	// to be transaction functions
	//
	// For internal functions... prefix them with _
	static async _GetAllResults(iterator, isHistory) {
		this.writeInfo('_GetAllResults');
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

	static ConvertToBool(boolStr){
		return String(boolStr) === 'true';
	}

	static writeInfo(method){
		console.log('Util: ' + method);
	}

}

module.exports = {Util};