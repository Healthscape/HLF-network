const DocType = Object.freeze({
	ACCESS_REQUEST: 'AccessRequest',
	PATIENT_RECORD: 'PatientRecord'
});

const AccessRequestDecision = Object.freeze({
	UNDEFINED: 'Undefined',
	UNLIMITED: 'Unlimited',
	NO_ACCESS: 'NoAccess',
	ONE_TIME: 'OneTime'
});

const AccessRequestDecisionType = Object.freeze({
	UNDEFINED: 'Undefined',
	RECORD: 'Record',
	ITEMS: 'Items'
});

module.exports = DocType;
module.exports = AccessRequestDecision;
module.exports = AccessRequestDecisionType;