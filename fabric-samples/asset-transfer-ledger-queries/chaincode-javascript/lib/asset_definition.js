const AccessRequestDecisionType = require('./enums.js');
const AccessRequestDecision = require('./enums.js');
const DocType = require('./enums.js');

class PatientRecord {
	constructor(patientRecordJSON) {
		this.docType = DocType.PATIENT_RECORD;
		this.recordId = patientRecordJSON.recordId;
		this.offlineDataUrl = patientRecordJSON.offlineDataUrl;
		this.hashedData = patientRecordJSON.hashedData;
	}
}

class AccessRequest {
	constructor(requestId, patientId, practitionerId, lastUpdated) {
		this.docType = DocType.ACCESS_REQUEST;
		this.requestId = requestId;
		this.patientId = patientId;
		this.practitionerId = practitionerId;
		this.lastUpdated = lastUpdated;
		this.reviewed = false;
		this.decisionType = AccessRequestDecisionType.UNDEFINED;
		this.decision = AccessRequestDecision.UNDEFINED;
		this.availableFrom = '';
		this.availableUntil = '';
		this.itemsAccess = [];
	}
}

class ItemAccess {
	constructor(item, time, decision, availableFrom, availableUntil) {
		this.item = item;
		this.time = time;
		this.decision = decision;
		this.availableFrom = availableFrom;
		this.availableUntil = availableUntil;
	}
}

module.exports = {PatientRecord, AccessRequest, ItemAccess};