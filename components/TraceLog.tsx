
import React from 'react';
import { TraceEvent } from '../types';

interface TraceLogProps {
  events: TraceEvent[];
}

export const TraceLog: React.FC<TraceLogProps> = ({ events }) => {
  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-400 p-8 font-mono text-[11px] overflow-hidden">
      <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-lg shadow-indigo-950"></div>
          <span className="uppercase font-black text-slate-100 tracking-[0.3em] text-[10px]">Audit_Trail_v2.4</span>
        </div>
        <div className="text-[9px] text-slate-600 tracking-widest px-2 py-0.5 bg-slate-900 border border-slate-800 rounded uppercase">REQ_BOUND</div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-4">
        {[...events].reverse().map((event) => {
          const isEscalated = event.event_type === 'ESCALATED_REASONING';
          const trigger = event.details.think_more_trigger;
          const requestId = event.details.request_id;
          const displaySummary = event.details.summary || event.details.justification || 'Operation trace recorded.';

          return (
            <div key={event.event_id} className={`group relative pl-6 border-l transition-all ${isEscalated ? 'border-amber-500 bg-amber-500/5 py-4' : 'border-slate-800 hover:border-indigo-500/50'}`}>
              <div className={`absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full border border-[#0F172A] transition-colors ${isEscalated ? 'bg-amber-500' : 'bg-slate-800 group-hover:bg-indigo-500'}`}></div>
              
              <div className="flex justify-between items-center text-[9px] text-slate-600 mb-2 font-black tracking-widest uppercase">
                <span>{new Date(event.timestamp).toISOString().replace('T', ' ').slice(0, 19)}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">ID: {event.event_id.slice(-6)}</span>
              </div>

              <div className={`font-black mb-2 tracking-widest uppercase flex items-center gap-2 ${isEscalated ? 'text-amber-500' : 'text-indigo-400'}`}>
                <i className={`fa-solid ${isEscalated ? 'fa-brain animate-pulse' : 'fa-code-commit'} text-[8px] opacity-60`}></i>
                {event.event_type}
              </div>

              {requestId && (
                <div className="mb-2">
                  <span className="text-[8px] text-slate-500 font-black tracking-widest uppercase">REQ: </span>
                  <span className="text-[8px] text-indigo-300 font-mono tracking-tighter">{requestId}</span>
                </div>
              )}

              {trigger && (
                <div className="mb-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-[#0F172A] text-[8px] font-black uppercase tracking-tighter">
                    THINK_MORE: {trigger}
                  </span>
                </div>
              )}

              <div className={`font-medium leading-relaxed mb-3 transition-colors ${isEscalated ? 'text-amber-100' : 'text-slate-100 group-hover:text-white'}`}>
                {displaySummary}
              </div>

              {event.objects.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {event.objects.map((obj, i) => (
                    <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded border ${isEscalated ? 'bg-amber-900/30 border-amber-800 text-amber-200/50' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                      <span className={`font-black ${isEscalated ? 'text-amber-400' : 'text-indigo-500/70'}`}>{obj.object_type}:</span> {obj.object_id.slice(-6)}
                    </span>
                  ))}
                </div>
              )}

              <div className={`grid grid-cols-2 gap-4 text-[9px] mt-4 border-t pt-3 transition-colors ${isEscalated ? 'border-amber-800/50 text-amber-700' : 'border-slate-800/50 group-hover:border-slate-800 text-slate-600'}`}>
                <div>
                  <span className={`font-black tracking-widest mr-2 uppercase ${isEscalated ? 'text-amber-600' : 'text-slate-500'}`}>Actor:</span> 
                  <span className={isEscalated ? 'text-amber-200/40' : 'text-slate-400'}>{event.actor}</span>
                </div>
                <div className="text-right">
                  <span className={`font-black tracking-widest mr-2 uppercase ${isEscalated ? 'text-amber-600' : 'text-slate-500'}`}>Case:</span> 
                  <span className={isEscalated ? 'text-amber-200/40' : 'text-slate-400'}>{event.case_id.slice(-8)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800 text-[9px] text-slate-600 tracking-[0.2em] font-black uppercase text-center opacity-50">
        Trace Stream Finalized
      </div>
    </div>
  );
};
