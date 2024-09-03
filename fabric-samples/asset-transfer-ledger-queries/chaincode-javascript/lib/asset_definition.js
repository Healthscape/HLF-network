const {DocType} = require('./enums.js');

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
		this.docType = DocType.PATIENT_IDENTIFIERS;
		this.identifiersId = identifiersId;
		this.hashedIdentifier = hashedIdentifier;
		this.offlineIdentifierUrl = offlineIdentifierUrl;
		this.hashedIdentifiers = hashedIdentifiers;
		this.salt = salt;
		this.lastUpdated = lastUpdated;
		this.lastUpdatedTxId = lastUpdatedTxId;
	}
}

class AccessLog {
	constructor(id, recordId, accessorId, accessorName, accessorRole, accessorOrg, action, timestamp, txId) {
		this.docType = DocType.ACCESS_LOG;
		this.recordId = recordId;
		this.id = id;
		this.accessorId = accessorId;
		this.accessorName = accessorName;
		this.accessorRole = accessorRole;
		this.accessorOrg = accessorOrg;
		this.action = action;
		this.timestamp = timestamp;
		this.txId = txId;
	}
}

module.exports = {PatientRecord, AccessLog, AssociationPatientRecord, PatientIdentifiers};