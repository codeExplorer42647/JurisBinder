
export type ID = string; 
export type ISODate = string; // YYYY-MM-DD
export type ISODatetime = string;

export const BRANCH_MAPPING = {
  "ADMIN": "Administration & governance",
  "FACT":  "Factual chronology & context",
  "PEN":   "Criminal",
  "CIV":   "Civil",
  "ADM":   "Administrative",
  "MED": "Medical",
  "EXP": "Expert reports / independent expertise",
  "COR": "Correspondence (non-procedural)",
  "EVD": "Evidence repository (digital/physical references)",
  "ANA": "Analyses (legal/medical/factual syntheses)",
  "STR": "Strategy (non-disclosable internal work product)",
  "PRC": "Procedure (filings, deadlines, court steps)",
  "ARC": "Archives (frozen/closed material)"
} as const;

export type BranchCode = keyof typeof BRANCH_MAPPING;
export type IsolationLevel = "STRICT" | "STRICT_WITH_REFERENCES";

export type ArtifactType = "SOURCE" | "OCR_TEXT" | "REDACTED_FILE" | "ANNOTATED_FILE" | "TRANSLATION" | "THUMBNAIL" | "EXPORT_BUNDLE" | "OTHER";
export type DerivationMethod = "OCR" | "REDACTION" | "ANNOTATION" | "TRANSLATION" | "CONVERSION" | "BUNDLE_EXPORT" | "OTHER";

export type CustodyAction = "CREATED" | "TRANSFERRED" | "VIEWED" | "RETURNED" | "LOST" | "DESTROYED" | "OTHER";

export type DocTypeCode = 
  | "LETTER_IN" | "LETTER_OUT" | "EMAIL" | "EMAIL_ATTACHMENT" | "FAX"
  | "COURT_ORDER" | "COURT_JUDGMENT" | "DECISION" | "RULING" | "SUMMONS"
  | "FILING" | "COMPLAINT" | "STATEMENT" | "BRIEF" | "MOTION" | "APPEAL"
  | "PROTOCOL_MINUTES" | "HEARING_NOTE" | "EVIDENCE_ITEM" | "PHOTO" | "VIDEO" | "AUDIO"
  | "MED_REPORT" | "MED_CERTIFICATE" | "MED_LAB_RESULT" | "MED_IMAGING_REPORT" | "MED_CORRESPONDENCE"
  | "EXPERT_REPORT" | "EXPERT_ANNEX" | "INVOICE" | "RECEIPT" | "CONTRACT" | "POLICY" | "FORM" | "ID_DOCUMENT"
  | "CHRONOLOGY" | "SYNTHESIS" | "INTERNAL_NOTE" | "OTHER";

export type DocStatus = 
  | "INBOX" | "REGISTERED" | "CLASSIFIED" | "QUALIFIED"
  | "EXHIBIT_READY" | "FILED" | "FROZEN" | "ARCHIVED"
  | "DUPLICATE" | "DISPUTED" | "REDACTED" | "ERROR";

/**
 * State machine for authoritative transitions.
 */
export const AUTHORITATIVE_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  "INBOX": ["REGISTERED", "DUPLICATE", "ERROR", "DISPUTED"],
  "REGISTERED": ["CLASSIFIED", "DUPLICATE", "ERROR", "DISPUTED"],
  "CLASSIFIED": ["QUALIFIED", "REDACTED", "ERROR", "DISPUTED"],
  "QUALIFIED": ["EXHIBIT_READY", "ERROR", "DISPUTED"],
  "EXHIBIT_READY": ["FILED", "ERROR", "DISPUTED"],
  "FILED": ["FROZEN", "ERROR", "DISPUTED"],
  "FROZEN": ["ARCHIVED", "ERROR", "DISPUTED"],
  "ARCHIVED": [],
  "DUPLICATE": ["ARCHIVED", "ERROR"],
  "DISPUTED": ["CLASSIFIED", "ERROR", "ARCHIVED"],
  "REDACTED": ["QUALIFIED", "ERROR"],
  "ERROR": ["INBOX", "ARCHIVED"]
};

export type ValidatorErrorCode = 
  | "SCHEMA_INVALID" | "CASE_NOT_FOUND" | "OBJECT_NOT_FOUND" | "ID_ALREADY_EXISTS"
  | "CASE_MISMATCH" | "BRANCH_ISOLATION_VIOLATION" | "ILLEGAL_STATUS_TRANSITION"
  | "STATUS_MISMATCH" | "MISSING_JUSTIFICATION" | "SOURCE_IMMUTABLE_VIOLATION"
  | "PROVENANCE_REQUIRED" | "STORAGE_REF_INVALID" | "FILENAME_NON_COMPLIANT"
  | "DUPLICATE_DETECTED" | "TRACE_REQUIRED";

export type SourceChannel = "SCAN" | "POST" | "EMAIL" | "PORTAL" | "HAND_DELIVERED" | "MESSAGING_APP" | "PHONE_RECORDING" | "PHOTO_CAPTURE" | "SYSTEM_EXPORT" | "OTHER";

export type ConfidentialityLevel = "PUBLIC" | "NORMAL" | "SENSITIVE" | "HEALTH" | "CRIMINAL" | "LEGAL_PRIVILEGED";

export type LinkType = "CROSS_BRANCH_REFERENCE" | "DERIVED_FROM" | "ATTACHMENT_OF" | "RELATES_TO_SAME_EVENT" | "SUPERSEDES" | "TRANSLATION_OF" | "REDACTION_OF" | "OCR_OF";

export type ObjectType = "DOCUMENT" | "ARTIFACT" | "PHYSICAL_ORIGINAL" | "CASE" | "OTHER";

export type PartyRole = "SELF" | "COUNTERPARTY" | "AUTHORITY" | "COURT" | "DOCTOR" | "EXPERT" | "OTHER";

export type ThinkMoreTrigger = 
  | "BRANCH_CONFLICT" | "MULTI_TYPE_CONFLICT" | "PROCEDURAL_RISK_ON_STATUS_CHANGE"
  | "INTERNAL_INCONSISTENCY_DETECTED" | "HYBRID_MEDICO_LEGAL_DOCUMENT"
  | "USER_REQUESTED_DEEP_VERIFICATION";

export interface Party {
  party_role: PartyRole;
  display_label: string;
  notes?: string;
}

export interface ArtifactProvenance {
  derived_from_artifact_id?: string;
  derivation_method?: DerivationMethod;
  tool_version?: string;
  notes?: string;
}

export interface FileArtifact {
  artifact_id: ID;
  document_id: ID;
  artifact_type: ArtifactType;
  storage_ref: string;
  filename: string;
  mime_type: string;
  sha256: string;
  byte_size?: number;
  created_at: ISODatetime;
  provenance?: ArtifactProvenance;
}

export interface PhysicalOriginalLocation {
  binder: string;
  section: string;
  pocket?: string;
  page_range?: string;
}

export interface CustodyEvent {
  timestamp: ISODatetime;
  actor: string;
  action: CustodyAction;
  notes?: string;
}

export interface PhysicalOriginal {
  physical_original_id: ID;
  case_id: ID;
  label: string;
  location: PhysicalOriginalLocation;
  registered_at: ISODatetime;
  custody_chain: CustodyEvent[];
  status?: 'verified' | 'unverified';
}

export interface ExhibitRef {
  branch_code: string;
  exhibit_id: string;
  filed_at?: ISODatetime;
}

export type QualityFlag = "PAGES_MISSING" | "LOW_SCAN_QUALITY" | "UNCERTAIN_DATE" | "UNCERTAIN_AUTHOR" | "POTENTIAL_DUPLICATE" | "SIGNATURE_PRESENT" | "STAMP_PRESENT" | "HANDWRITTEN_NOTES";

export interface Document {
  document_id: ID;
  case_id: ID;
  branch_code: BranchCode;
  doc_type_code: DocTypeCode;
  status: DocStatus;
  source_channel: SourceChannel;
  confidentiality_level: ConfidentialityLevel;
  doc_date?: ISODate;
  author?: string;
  counterparty?: string;
  subject?: string;
  registered_at: ISODatetime;
  registered_by?: string;
  physical_original_id?: ID;
  exhibits?: ExhibitRef[];
  artifacts: FileArtifact[];
  quality_flags?: QualityFlag[];
  notes?: string;
  // UI Helper
  physicalOriginal?: PhysicalOriginal;
}

export interface Branch {
  branch_id: ID;
  branch_code: BranchCode;
  branch_label: string;
  isolation_level: IsolationLevel;
  default_storage_ref?: string;
  documents: Document[];
}

export interface LinkObject {
  object_type: ObjectType;
  object_id: ID;
  branch_code?: string;
}

export interface Link {
  link_id: ID;
  case_id: ID;
  link_type: LinkType;
  from_object: LinkObject;
  to_object: LinkObject;
  justification: string;
  created_at: ISODatetime;
  created_by?: string;
}

export interface Case {
  case_id: ID;
  case_title: string;
  jurisdiction: string;
  created_at: ISODatetime;
  confidentiality_level: ConfidentialityLevel;
  branches: Branch[];
  parties?: Party[];
  root_storage_ref?: string;
  tags?: string[];
  links: Link[];
}

export type TraceEventType = 
  | "CASE_CREATED" | "BRANCH_CREATED"
  | "DOC_INGESTED" | "DOC_CLASSIFIED" | "DOC_QUALIFIED" | "DOC_RENAMED"
  | "DOC_STATUS_CHANGED" | "DOC_LINKED"
  | "ARTIFACT_CREATED" | "OCR_PERFORMED" | "REDACTION_PERFORMED"
  | "PHYSICAL_ORIGINAL_REGISTERED" | "PHYSICAL_CUSTODY_CHANGED"
  | "EXPORT_CREATED" | "ERROR_RECORDED" | "ESCALATED_REASONING";

export interface TraceObjectRef {
  object_type: "CASE" | "BRANCH" | "DOCUMENT" | "ARTIFACT" | "PHYSICAL_ORIGINAL" | "LINK";
  object_id: ID;
  branch_code?: string;
}

export interface TraceEvent {
  event_id: ID;
  case_id: ID;
  timestamp: ISODatetime;
  actor: string;
  event_type: TraceEventType;
  objects: TraceObjectRef[];
  details: {
    summary?: string;
    before?: any;
    after?: any;
    justification?: string;
    risk_note?: string;
    think_more_trigger?: ThinkMoreTrigger | string;
    [key: string]: any;
  };
}

export type JurisIntent = 
  | "CASE_CREATE" | "DOC_INGEST" | "DOC_CLASSIFY" | "DOC_RENAME"
  | "DOC_LINK_CREATE" | "ARTIFACT_CREATE" | "DOC_STATUS_TRANSITION"
  | "TRACE_APPEND" | "ORIGINAL_REGISTER" | "DEDUPE_CHECK" | "EXPORT_PACK"
  | "QUERY_STATUS" | "ERROR";

export interface Compliance {
  invariants_respected: boolean;
  trace_required: boolean;
  branch_isolation_respected: boolean;
  think_more_used?: boolean;
  think_more_trigger?: string;
}

export interface JurisBinderResponse {
  intent: JurisIntent;
  operations: {
    op_type: "TOOL_CALL" | "RETURN_DATA";
    payload: any;
  }[];
  data?: {
    case?: Case;
    branch?: Branch;
    document?: Document;
    artifact?: FileArtifact;
    physical_original?: PhysicalOriginal;
    link?: Link;
    trace_event?: TraceEvent;
  };
  assistant_notes: {
    summary: string;
    assumptions: string[];
    missing_info: string[];
  };
  compliance: Compliance;
  /** Added request_id to support authoritative trace binding validation results */
  errors?: { code: ValidatorErrorCode | string; message: string; field?: string; request_id?: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: ISODatetime;
  isThinking?: boolean;
  compliance?: Compliance;
  notes?: { assumptions: string[]; missing_info: string[] };
  validation_status?: 'PENDING' | 'COMMITTED' | 'FAILED';
  /** Added request_id to error objects for UI display of authoritative operation failures */
  errors?: { code: string; message: string; field?: string; request_id?: string }[];
}
