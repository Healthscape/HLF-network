const asn1js = require('asn1js');
const pkijs = require('pkijs');

class Util{
	static async RoleHasPermission(ctx, methodName){
		const role = await this.GetUserRole(ctx);
		switch(methodName){
		case 'CreateAccessRequest':
			return role === 'ROLE_PRACTITIONER';
		case 'GetAccessRequest':
			console.log('Return value: ' + ['ROLE_PRACTITIONER', 'ROLE_PATIENT'].includes(role));
			return ['ROLE_PRACTITIONER', 'ROLE_PATIENT'].includes(role);
		default:
			console.log('Undefined method name');
			return false;
		}
	}

	static async GetCN(ctx){
		console.log('GetCN(ctx)');
		const clientIdentity = ctx.clientIdentity;
		const id = clientIdentity.getID();
		let cnIndex = id.indexOf('CN=');
		let cnEndIndex = id.indexOf(':', cnIndex);
		const name = id.substring(cnIndex + 3, cnEndIndex);
		return name.trim();
	}

	static async GetUserRole(ctx) {
		console.log('GetUserRole');
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
}

module.exports = {Util};