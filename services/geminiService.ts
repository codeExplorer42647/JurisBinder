
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { JurisBinderResponse } from "../types";

const BRANCH_CODES = ["ADMIN","FACT","PEN","CIV","ADM","MED","EXP","COR","EVD","ANA","STR","PRC","ARC"];
const ARTIFACT_TYPES = ["SOURCE","OCR_TEXT","REDACTED_FILE","ANNOTATED_FILE","TRANSLATION","THUMBNAIL","EXPORT_BUNDLE","OTHER"];
const CONFIDENTIALITY_LEVELS = ["PUBLIC","NORMAL","SENSITIVE","HEALTH","CRIMINAL","LEGAL_PRIVILEGED"];
const DOC_STATUSES = ["INBOX", "REGISTERED", "CLASSIFIED", "QUALIFIED", "EXHIBIT_READY", "FILED", "FROZEN", "ARCHIVED", "DUPLICATE", "DISPUTED", "REDACTED", "ERROR"];
const LINK_TYPES = ["CROSS_BRANCH_REFERENCE","DERIVED_FROM","ATTACHMENT_OF","RELATES_TO_SAME_EVENT","SUPERSEDES","TRANSLATION_OF","REDACTION_OF","OCR_OF"];
const OBJECT_TYPES = ["DOCUMENT","ARTIFACT","PHYSICAL_ORIGINAL","CASE","OTHER"];

const caseGetTool: FunctionDeclaration = {
  name: 'case_get',
  description: 'Retrieve full case details, active branches, and parties. Essential to verify context before ingestion.',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." }
    }
  }
};

const docGetTool: FunctionDeclaration = {
  name: 'doc_get',
  description: 'Retrieve a specific document metadata and status. CRITICAL: Use before any status transition.',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "document_id", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      document_id: { type: Type.STRING },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." }
    }
  }
};

const docRenameTool: FunctionDeclaration = {
  name: 'doc_rename',
  description: 'Propose a new name for a document. Must follow standard: [BRANCH]_[YYYY-MM-DD]_[TYPE]_[DESC].ext',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "document_id", "new_name", "justification", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      document_id: { type: Type.STRING },
      new_name: { type: Type.STRING },
      justification: { type: Type.STRING },
      request_id: { type: Type.STRING }
    }
  }
};

const traceQueryTool: FunctionDeclaration = {
  name: 'trace_query',
  description: 'Query the immutable audit log to verify past actions or chain of custody.',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." },
      filters: {
        type: Type.OBJECT,
        properties: {
          event_type: { type: Type.STRING },
          object_id: { type: Type.STRING },
          actor: { type: Type.STRING },
          date_from: { type: Type.STRING }
        }
      }
    }
  }
};

const searchDocsTool: FunctionDeclaration = {
  name: 'search_documents',
  description: 'Find documents across segments based on criteria (branch, type, status).',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." },
      criteria: {
        type: Type.OBJECT,
        properties: {
          branch_code: { type: Type.STRING },
          status: { type: Type.STRING },
          doc_type_code: { type: Type.STRING },
          filename_contains: { type: Type.STRING }
        }
      }
    }
  }
};

const caseCreateTool: FunctionDeclaration = {
  name: 'case_create',
  description: 'Initializes a new legal dossier with isolated segments.',
  parameters: {
    type: Type.OBJECT,
    required: ["case_title", "jurisdiction", "confidentiality_level", "branches", "request_id"],
    properties: {
      case_title: { type: Type.STRING },
      jurisdiction: { type: Type.STRING },
      confidentiality_level: { type: Type.STRING, enum: CONFIDENTIALITY_LEVELS },
      branches: { type: Type.ARRAY, items: { type: Type.STRING, enum: BRANCH_CODES } },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." },
      parties: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ["party_role", "display_label"],
          properties: {
            party_role: { type: Type.STRING, enum: ["SELF","COUNTERPARTY","AUTHORITY","COURT","DOCTOR","EXPERT","OTHER"] },
            display_label: { type: Type.STRING },
            notes: { type: Type.STRING }
          }
        }
      }
    }
  }
};

const docIngestTool: FunctionDeclaration = {
  name: 'doc_ingest',
  description: 'Registers a new digital document into the authoritative segment.',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "branch_code", "source", "metadata", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      branch_code: { type: Type.STRING, enum: BRANCH_CODES },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." },
      source: {
        type: Type.OBJECT,
        required: ["storage_ref", "filename"],
        properties: { storage_ref: { type: Type.STRING }, filename: { type: Type.STRING } }
      },
      metadata: {
        type: Type.OBJECT,
        required: ["doc_type_code", "source_channel", "confidentiality_level", "status"],
        properties: {
          doc_type_code: { type: Type.STRING },
          source_channel: { type: Type.STRING },
          confidentiality_level: { type: Type.STRING, enum: CONFIDENTIALITY_LEVELS },
          status: { type: Type.STRING, enum: DOC_STATUSES },
          doc_date: { type: Type.STRING, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          author: { type: Type.STRING },
          subject: { type: Type.STRING }
        }
      }
    }
  }
};

const docLinkCreateTool: FunctionDeclaration = {
  name: 'doc_link_create',
  description: 'Binds dossier objects via semantic relationships (Link).',
  parameters: {
    type: Type.OBJECT,
    required: ["case_id", "link_type", "from_object", "to_object", "justification", "request_id"],
    properties: {
      case_id: { type: Type.STRING },
      link_type: { type: Type.STRING, enum: LINK_TYPES },
      request_id: { type: Type.STRING, description: "Unique UUID for this specific transaction." },
      from_object: {
        type: Type.OBJECT,
        required: ["object_type", "object_id"],
        properties: { object_type: { type: Type.STRING, enum: OBJECT_TYPES }, object_id: { type: Type.STRING }, branch_code: { type: Type.STRING } }
      },
      to_object: {
        type: Type.OBJECT,
        required: ["object_type", "object_id"],
        properties: { object_type: { type: Type.STRING, enum: OBJECT_TYPES }, object_id: { type: Type.STRING }, branch_code: { type: Type.STRING } }
      },
      justification: { type: Type.STRING }
    }
  }
};

const SYSTEM_INSTRUCTION = `
You are "JurisBinder Core", the authoritative records manager. 

GATEWAY PROTOCOL v3.0:
1) All suggested mutations are "PROPOSALS" until the SOVEREIGN BACKEND GATE returns { ok: true }.
2) REQUEST ID REQUIREMENT: Every tool call MUST include a unique 'request_id' UUID.
3) AUTHORITY CHARTER: The Backend Gate is the level 4 validator. It enforces strict naming standards, transition matrices, and isolation levels.
4) MUTATION RULES:
   - Status transitions must follow the authoritative sequence.
   - Renames must follow standard: [BRANCH]_[YYYY-MM-DD]_[TYPE]_[DESC].ext.
   - Links must belong to the same case and have 10+ chars justification.
5) FAILURE HANDLING: If the Backend Gate rejects a mutation, analyze the 'code' and 'message' to suggest a compliant alternative.

TAXONOMIC CONSISTENCY: Substantive branches (PEN/CIV/ADM) override Correspondence (COR).
RESPONSE PROTOCOL: Return only JurisBinderResponse JSON.
`;

const TOOLS = [{ 
  functionDeclarations: [
    caseCreateTool, docIngestTool, docLinkCreateTool, docRenameTool,
    caseGetTool, docGetTool, traceQueryTool, searchDocsTool,
    { name: 'original_register', parameters: { type: Type.OBJECT, required: ["case_id","document_id","label","location","justification", "request_id"], properties: { case_id: { type: Type.STRING }, document_id: { type: Type.STRING }, label: { type: Type.STRING }, location: { type: Type.OBJECT, required: ["binder","section"], properties: { binder: { type: Type.STRING }, section: { type: Type.STRING }, pocket: { type: Type.STRING }, page_range: { type: Type.STRING } } }, justification: { type: Type.STRING }, request_id: { type: Type.STRING } } } },
    { name: 'doc_classify', parameters: { type: Type.OBJECT, required: ["case_id","document_id","metadata","justification", "request_id"], properties: { case_id: { type: Type.STRING }, document_id: { type: Type.STRING }, metadata: { type: Type.OBJECT }, justification: { type: Type.STRING }, request_id: { type: Type.STRING } } } },
    { name: 'doc_status_transition', parameters: { type: Type.OBJECT, required: ["case_id","document_id","from_status","to_status","justification", "request_id"], properties: { case_id: { type: Type.STRING }, document_id: { type: Type.STRING }, from_status: { type: Type.STRING, enum: DOC_STATUSES }, to_status: { type: Type.STRING, enum: DOC_STATUSES }, justification: { type: Type.STRING }, request_id: { type: Type.STRING } } } },
    { name: 'artifact_create', parameters: { type: Type.OBJECT, required: ["case_id","document_id","artifact_type","input_artifact_id","output_storage_ref","notes", "request_id"], properties: { case_id: { type: Type.STRING }, document_id: { type: Type.STRING }, artifact_type: { type: Type.STRING, enum: ARTIFACT_TYPES }, input_artifact_id: { type: Type.STRING }, output_storage_ref: { type: Type.STRING }, notes: { type: Type.STRING }, request_id: { type: Type.STRING } } } },
    { name: 'trace_append', parameters: { type: Type.OBJECT, required: ["case_id","event", "request_id"], properties: { case_id: { type: Type.STRING }, event: { type: Type.OBJECT }, request_id: { type: Type.STRING } } } }
  ] 
}];

export const processQuery = async (query: string, currentCaseData: any): Promise<JurisBinderResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `STATE_DIGEST: ${JSON.stringify({ case_id: currentCaseData.case_id, title: currentCaseData.case_title })}. REQ: ${query}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      tools: TOOLS,
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const analyzeArtifact = async (imageDataBase64: string, mimeType: string, context: string): Promise<JurisBinderResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: imageDataBase64, mimeType } },
        { text: `INGESTION_CONTEXT: ${context}` }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      tools: TOOLS,
      thinkingConfig: { thinkingBudget: 16384 }
    }
  });
  return JSON.parse(response.text || '{}');
};
