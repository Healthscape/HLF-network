const DocType = Object.freeze({
	ACCESS_REQUEST: 'ACCESS_REQUEST',
	PATIENT_RECORD: 'PATIENT_RECORD',
	ASSOCIATION: 'ASSOCIATION',
	PATIENT_IDENTIFIERS: 'PATIENT_IDENTIFIERS'
});

const AccessRequestDecision = Object.freeze({
	UNDEFINED: 'UNDEFINED',
	UNLIMITED: 'UNLIMITED',
	NO_ACCESS: 'NO_ACCESS',
	ONE_TIME: 'NO_ACCESS',
	CUSTOM: 'CUSTOM'
});

const Role = Object.freeze({
	ADMIN: 'ROLE_ADMIN',
	PATIENT: 'ROLE_PATIENT',
	PRACTITIONER: 'ROLE_PRACTITIONER'
});

module.exports = {DocType, AccessRequestDecision, Role};