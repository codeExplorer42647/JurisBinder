
import React, { useState, useRef, useEffect } from 'react';
import { Case, TraceEvent, ChatMessage, JurisBinderResponse, Document, Branch, BRANCH_MAPPING, BranchCode, LinkType, ConfidentialityLevel, FileArtifact, Link, DocStatus, PhysicalOriginal, ObjectType, CustodyAction, DocTypeCode, SourceChannel, QualityFlag, TraceEventType, AUTHORITATIVE_TRANSITIONS, ArtifactType, ValidatorErrorCode } from './types';
import { DocumentList } from './components/DocumentList';
import { TraceLog } from './components/TraceLog';
import { analyzeArtifact, processQuery } from './services/geminiService';

const INITIAL_BRANCHES: Branch[] = Object.entries(BRANCH_MAPPING).map(([code, name]) => ({
  branch_id: `BRANCH-2024-001-${code}`,
  branch_code: code as BranchCode,
  branch_label: name,
  isolation_level: 'STRICT_WITH_REFERENCES',
  documents: []
}));

const MOCK_CASE: Case = {
  case_id: 'CASE-2024-001',
  case_title: 'Smith v. Global Logistics Corp.',
  jurisdiction: 'High Court of Justice',
  created_at: new Date().toISOString(),
  confidentiality_level: 'LEGAL_PRIVILEGED',
  branches: INITIAL_BRANCHES,
  parties: [
    { party_role: 'SELF', display_label: 'Alice Smith', notes: 'Lead Claimant' },
    { party_role: 'COUNTERPARTY', display_label: 'Global Logistics Corp.', notes: 'Primary Defendant' }
  ],
  links: []
};

const INITIAL_TRACE: TraceEvent = {
  event_id: 'TRACE-000000',
  case_id: 'SYSTEM_ROOT',
  timestamp: new Date().toISOString(),
  actor: 'CORE_KERNEL',
  event_type: 'CASE_CREATED',
  objects: [{ object_type: 'CASE', object_id: 'CASE-2024-001' }],
  details: {
    summary: 'JurisBinder Core initialized. Validator Gate v3.1 (Full Authority) active.',
    after: { status: 'OPTIMAL' }
  }
};

const getConfidentialityStyle = (level: ConfidentialityLevel) => {
  switch (level) {
    case 'PUBLIC': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'NORMAL': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'SENSITIVE': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'HEALTH': return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
    case 'CRIMINAL': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'LEGAL_PRIVILEGED': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }
};

const App: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<Case>(MOCK_CASE);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(MOCK_CASE.branches[0].branch_id);
  const [traceHistory, setTraceHistory] = useState<TraceEvent[]>([INITIAL_TRACE]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'JURISBINDER_CORE: Sovereign Gate v3.1 online. Both Read and Write operations are now synchronized with the Authoritative Backend.', 
      timestamp: new Date().toISOString() 
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeBranch = currentCase.branches.find(b => b.branch_id === selectedBranchId) || currentCase.branches[0];

  /**
   * SOVEREIGN EXECUTION ENGINE v3.1
   * Handles both READ and MUTATION via unified /api/gate.
   */
  const executeOperation = async (op: any): Promise<{ ok: boolean; error?: any; result?: any; trace_event_id?: string }> => {
    const args = op.payload.args || op.payload;
    const toolName = op.payload.name || op.intent;

    try {
      const response = await fetch('http://localhost:3000/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, payload: args, caseId: currentCase.case_id })
      });

      const result = await response.json();

      if (result.ok) {
        // Authoritative State Sync
        syncAuthoritativeState(toolName, result.data, result.trace_event_id, args?.request_id);
        return { ok: true, trace_event_id: result.trace_event_id, result: result.data };
      } else {
        return { ok: false, error: result.error };
      }
    } catch (e) {
      console.warn("Backend Gate Unreachable. Operating in Terminal Isolated Mode.");
      return { ok: false, error: { code: 'GATE_UNREACHABLE', message: 'The Sovereign Gate is offline.' } };
    }
  };

  const syncAuthoritativeState = (toolName: string, data: any, traceId: string, requestId: string) => {
    // 1. Handle READ tool sync
    if (toolName === 'case_get') {
      setCurrentCase(data);
      return;
    }
    if (toolName === 'trace_query') {
      setTraceHistory(data);
      return;
    }

    // 2. Handle MUTATION tool sync
    if (toolName === 'doc_ingest') {
      setCurrentCase(prev => {
        const branches = prev.branches.map(b => 
          b.branch_code === data.branch_code ? { ...b, documents: [...b.documents, data] } : b
        );
        return { ...prev, branches };
      });
    } else if (toolName === 'doc_status_transition') {
      setCurrentCase(prev => {
        const branches = prev.branches.map(b => ({
          ...b,
          documents: b.documents.map(d => 
            d.document_id === data.document_id ? { ...d, status: data.status } : d
          )
        }));
        return { ...prev, branches };
      });
    }
    
    // Auto-append mutation trace if traceId provided
    if (traceId) {
        setTraceHistory(prev => [{
          event_id: traceId,
          case_id: currentCase.case_id,
          timestamp: new Date().toISOString(),
          actor: 'AUTHORITATIVE_GATE',
          event_type: toolName.toUpperCase() as any,
          objects: [],
          details: { summary: `Authorized: ${toolName}`, request_id: requestId }
        }, ...prev]);
    }
  };

  const handleJurisResponse = async (response: JurisBinderResponse) => {
    const gateErrors: any[] = [];
    let sequenceHalted = false;

    for (const op of response.operations) {
      if (sequenceHalted) break;

      if (op.op_type === 'TOOL_CALL') {
        const result = await executeOperation(op);
        if (!result.ok) {
          gateErrors.push({ ...result.error, request_id: op.payload?.args?.request_id || 'SYSTEM' });
          sequenceHalted = true; 
        }
      }
    }

    setChatMessages(prev => [
      ...prev.filter(m => !m.isThinking),
      { 
        role: 'assistant', 
        content: gateErrors.length > 0 
          ? `GATE_ALERT: ${gateErrors[0].message}` 
          : response.assistant_notes.summary, 
        timestamp: new Date().toISOString(),
        notes: response.assistant_notes,
        compliance: { 
          ...response.compliance, 
          invariants_respected: gateErrors.length === 0 
        },
        validation_status: gateErrors.length > 0 ? 'FAILED' : 'COMMITTED',
        errors: gateErrors.length > 0 ? gateErrors : response.errors
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;
    setChatMessages(prev => [...prev, { role: 'user', content: userInput, timestamp: new Date().toISOString() }]);
    setUserInput('');
    setIsProcessing(true);
    try {
      const response = await processQuery(userInput, currentCase);
      await handleJurisResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessArtifact = async (base64Data: string, mimeType: string, filename: string) => {
    setIsProcessing(true);
    setChatMessages(prev => [...prev, { role: 'assistant', content: `SECURE_ANALYSIS: REQ_GATE v3.1 [${filename}]...`, timestamp: new Date().toISOString(), isThinking: true }]);
    try {
      const response = await analyzeArtifact(base64Data, mimeType, `Target_Segment: ${activeBranch.branch_label}`);
      await handleJurisResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* SIDEBAR */}
      <div className="w-80 bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl z-20">
        <div className="p-8 border-b border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-950">
            <i className="fa-solid fa-scale-balanced text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white leading-tight">JurisBinder</h1>
            <span className="text-[11px] text-slate-500 font-mono uppercase tracking-[0.2em]">GATE_KERN_V3.1</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-8 mt-4 custom-scrollbar">
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">GATE: FULL_AUTHORITY</div>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getConfidentialityStyle(currentCase.confidentiality_level)}`}>
                {currentCase.confidentiality_level}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-100 leading-snug mb-1 truncate">{currentCase.case_title}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Compliance Partition</div>
            <div className="space-y-1 px-1">
              {currentCase.branches.map(branch => (
                <button
                  key={branch.branch_id}
                  onClick={() => setSelectedBranchId(branch.branch_id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-between border ${
                    selectedBranchId === branch.branch_id ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'hover:bg-slate-800 text-slate-400 border-transparent'
                  }`}
                >
                  <span className="truncate font-semibold">{branch.branch_label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${selectedBranchId === branch.branch_id ? 'bg-white/20' : 'bg-slate-800'}`}>{branch.documents.length}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-white relative">
        <header className="h-24 border-b border-slate-200 flex items-center justify-between px-12 bg-white/80 backdrop-blur-2xl z-10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeBranch.branch_label}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authority-Synchronized State</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowScanner(true)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 text-sm font-bold text-slate-700 shadow-sm transition-all">
              <i className="fa-solid fa-camera text-indigo-500 mr-2"></i> Capture
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-black text-sm font-bold shadow-xl transition-all">
              <i className="fa-solid fa-file-import text-indigo-400 mr-2"></i> Ingest
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                  const base64 = (re.target?.result as string).split(',')[1];
                  handleProcessArtifact(base64, file.type, file.name);
                };
                reader.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*,application/pdf"/>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 bg-[#F9FAFB]/50 custom-scrollbar">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200/60 shadow-2xl overflow-hidden ring-1 ring-black/5">
            <DocumentList documents={activeBranch.documents} caseLinks={currentCase.links} onSelect={() => {}} />
          </div>
        </main>

        {/* CHAT INTERFACE */}
        <div className="border-t border-slate-200 p-10 bg-white">
          <div className="max-w-4xl mx-auto">
            {chatMessages.length > 0 && (
              <div className="mb-6 max-h-[30vh] overflow-y-auto space-y-4 px-2 custom-scrollbar">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 rounded-2xl text-sm border shadow-sm relative ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                      {msg.isThinking && <div className="text-[10px] font-mono text-indigo-600 font-black animate-pulse mb-2 tracking-widest uppercase">GATE_VALIDATION...</div>}
                      
                      {msg.validation_status && (
                        <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          msg.validation_status === 'COMMITTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {msg.validation_status}
                        </div>
                      )}

                      <div className="leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
                      
                      {msg.errors && msg.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100 text-[10px] text-rose-700 font-mono">
                          <div className="font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-shield-halved text-rose-500"></i> BINDING_ANOMALY
                          </div>
                          {msg.errors.map((err, i) => <div key={i} className="mt-1 border-l-2 border-rose-200 pl-2 ml-1">
                            <span className="font-black">[{err.code}]</span> {err.message}
                          </div>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="SUBMIT_TO_AUTHORITY..." className="w-full bg-white border border-slate-200 rounded-2xl pl-8 pr-20 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-xl transition-all hover:border-slate-300"/>
              <button onClick={handleSendMessage} disabled={isProcessing} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg disabled:bg-slate-200">
                {isProcessing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-paper-plane-top"></i>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 h-full bg-[#0F172A] z-20">
        <TraceLog events={traceHistory} />
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-10">
          <div className="text-white text-center">
            <h3 className="text-xl font-bold mb-4 uppercase tracking-widest">Scanner Terminal Active</h3>
            <p className="text-slate-400 text-sm mb-10">Ready for Document Analysis</p>
            <button onClick={() => setShowScanner(false)} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold">Abort Scan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
