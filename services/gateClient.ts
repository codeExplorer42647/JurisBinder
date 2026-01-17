import { v4 as uuidv4 } from 'uuid';
import { JurisBinderResponse, ValidatorErrorCode } from '../types';

const GATE_URL = 'http://localhost:3000/api/gate';

interface GateResult {
  ok: boolean;
  data?: any;
  error?: { code: ValidatorErrorCode; message: string };
  trace_event_id?: string;
}

/**
 * Exécute une opération autoritaire via le Validator Gate.
 * Ajoute automatiquement le request_id requis par vos invariants.
 */
export const executeAuthoritativeTool = async (
  toolName: string,
  payload: any,
  caseId: string
): Promise<GateResult> => {
  // Génération du Request ID unique côté client (Invariant n°2 du geminiService)
  const requestId = uuidv4();
  
  const enrichedPayload = {
    ...payload,
    case_id: caseId,
    request_id: requestId
  };

  try {
    const response = await fetch(GATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName,
        payload: enrichedPayload,
        caseId
      })
    });

    if (!response.ok) {
        throw new Error(`Gate Network Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error("GATE ACCESS DENIED:", err);
    return { 
        ok: false, 
        error: { code: 'TRACE_REQUIRED', message: 'Gate unreachable or crashed' } 
    };
  }
};