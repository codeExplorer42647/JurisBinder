
import React from 'react';
import { Document, DocStatus, Link, BRANCH_MAPPING } from '../types';

interface DocumentListProps {
  documents: Document[];
  caseLinks: Link[];
  onSelect: (doc: Document) => void;
}

const getStatusStyle = (status?: DocStatus) => {
  switch (status) {
    case 'INBOX': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'REGISTERED': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
    case 'CLASSIFIED': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
    case 'QUALIFIED': return 'bg-purple-50 text-purple-600 border-purple-200';
    case 'EXHIBIT_READY': return 'bg-amber-50 text-amber-700 border-amber-300 font-bold';
    case 'FILED': return 'bg-emerald-600 text-white border-emerald-700 font-black shadow-sm';
    case 'FROZEN': return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'ARCHIVED': return 'bg-slate-200 text-slate-400 border-slate-300';
    case 'DUPLICATE': return 'bg-amber-50 text-amber-600 border-amber-200 opacity-60';
    case 'DISPUTED': return 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse';
    case 'REDACTED': return 'bg-slate-900 text-white border-slate-950';
    case 'ERROR': return 'bg-rose-600 text-white border-rose-700';
    default: return 'bg-slate-50 text-slate-400 border-slate-200';
  }
};

export const DocumentList: React.FC<DocumentListProps> = ({ documents, caseLinks, onSelect }) => {
  const getLinkCount = (docId: string) => {
    return caseLinks.filter(l => l.from_object.object_id === docId || l.to_object.object_id === docId).length;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
          <tr>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SEQ_ID</th>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dossier_Item</th>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Segment</th>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance</th>
            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Physical</th>
            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tools</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-50">
          {documents.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-8 py-20 text-center">
                <div className="text-slate-300 font-mono text-xs uppercase tracking-widest">No objects in segment isolated_view</div>
              </td>
            </tr>
          ) : (
            documents.map((doc) => {
              const linkCount = getLinkCount(doc.document_id);
              const branchLabel = BRANCH_MAPPING[doc.branch_code] || doc.branch_code;
              const mainArtifact = doc.artifacts[0];
              const displayTitle = doc.subject || mainArtifact?.filename || 'Unnamed Object';
              
              return (
                <tr key={doc.document_id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group" onClick={() => onSelect(doc)}>
                  <td className="px-8 py-6 whitespace-nowrap text-[10px] font-mono text-slate-400 group-hover:text-indigo-600">
                    {doc.document_id.slice(-8)}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      {doc.status === 'FILED' && <i className="fa-solid fa-file-shield text-emerald-500 text-[10px]"></i>}
                      {displayTitle}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
                      {doc.doc_type_code} • {mainArtifact?.mime_type.split('/')[1] || 'RAW'}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block uppercase tracking-tighter">
                      {doc.branch_code}
                    </div>
                    <div className="text-[8px] text-slate-400 mt-0.5 truncate max-w-[120px]">{branchLabel}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded border uppercase tracking-widest ${getStatusStyle(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {doc.quality_flags?.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full bg-rose-100 border border-white flex items-center justify-center text-rose-600 text-[8px]">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                          </div>
                        ))}
                        {(doc.quality_flags?.length || 0) === 0 && (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-emerald-600 text-[8px]">
                            <i className="fa-solid fa-check"></i>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">{linkCount} REFS</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    {doc.physicalOriginal ? (
                      <div className="text-[10px] font-medium text-slate-700 flex items-center gap-1.5">
                        <i className={`fa-solid fa-box-archive ${doc.physicalOriginal.status === 'verified' ? 'text-emerald-500' : 'text-amber-500'}`}></i>
                        {doc.physicalOriginal.location.binder}:{doc.physicalOriginal.location.section}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300 uppercase tracking-tighter italic">Not_Registered</span>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <button className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 transition-all shadow-sm group-hover:shadow-indigo-100">
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
