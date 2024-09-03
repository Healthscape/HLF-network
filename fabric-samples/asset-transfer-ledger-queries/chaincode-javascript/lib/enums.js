const DocType = Object.freeze({
	ACCESS_LOG: 'ACCESS_LOG',
	PATIENT_RECORD: 'PATIENT_RECORD',
	ASSOCIATION: 'ASSOCIATION',
	PATIENT_IDENTIFIERS: 'PATIENT_IDENTIFIERS'
});

const Role = Object.freeze({
	ADMIN: 'ROLE_ADMIN',
	PATIENT: 'ROLE_PATIENT',
	PRACTITIONER: 'ROLE_PRACTITIONER'
});

const Action = Object.freeze({
	CREATE: 'CREATE',
	VIEW: 'VIEW',
	EDIT: 'EDIT'
})

module.exports = {DocType, Role, Action};