const {DocType, AccessRequestDecision} = require('./enums.js');

class AssociationPatientRecord {
	constructor(associationId, userId, recordId, dateAdded, createdBy) {
		this.docType = DocType.ASSOCIATION;
		this.associationId = associationId;
		this.userId = userId;
		this.recordId = recordId;
		this.dateAdded = dateAdded;
		this.createdBy = createdBy;
	}
}

class PatientRecord {
	constructor(recordId, hashedIdentifier, offlineDataUrl, hashedData, salt, lastUpdated, lastUpdatedTxId) {
		this.docType = DocType.PATIENT_RECORD;
		this.recordId = recordId;
		this.hashedIdentifier = hashedIdentifier;
		this.offlineDataUrl = offlineDataUrl;
		this.hashedData = hashedData;
		this.salt = salt;
		this.lastUpdated = lastUpdated;
		this.lastUpdatedTxId = lastUpdatedTxId;
	}
}

class PatientIdentifiers {
	constructor(identifiersId, hashedIdentifier, offlineIdentifierUrl, hashedIdentifiers, salt, lastUpdated, lastUpdatedTxId) {
		this.docType = DocType.PATIENT_RECORD;
		this.identifiersId = identifiersId;
		this.hashedIdentifier = hashedIdentifier;
		this.offlineIdentifierUrl = offlineIdentifierUrl;
		this.hashedIdentifiers = hashedIdentifiers;
		this.salt = salt;
		this.lastUpdated = lastUpdated;
		this.lastUpdatedTxId = lastUpdatedTxId;
	}
}

class AccessRequest {
	constructor(requestId, patientId, practitionerId, lastUpdated, lastUpdatedTxId) {
		this.docType = DocType.ACCESS_REQUEST;
		this.requestId = requestId;
		this.patientId = patientId;
		this.practitionerId = practitionerId;
		this.lastUpdated = lastUpdated;
		this.reviewed = false;
		this.decision = AccessRequestDecision.UNDEFINED;
		this.availableFrom = '';
		this.availableUntil = '';
		this.itemsAccess = [];
		this.lastUpdatedTxId = lastUpdatedTxId;
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

module.exports = {PatientRecord, AccessRequest, ItemAccess, AssociationPatientRecord, PatientIdentifiers};