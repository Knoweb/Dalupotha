import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Eye, RefreshCw, AlertCircle, Clock, Calendar, X, User, FileText, Landmark } from 'lucide-react'
import { FinanceAPI, ServiceRequest, RequestStatus } from '../services/api'

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [ledgerInfo, setLedgerInfo] = useState<{currentDebt: number; estimatedBalance: number} | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [filter, setFilter] = useState<'PENDING' | 'PROCESSED'>('PENDING');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await FinanceAPI.getRequests({ limit: '50' });
      const sorted = [...data].sort((a, b) => {
        return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
      setRequests(sorted);
    } catch (err: any) {
      setError(err?.message || 'Failed to establish connection to gateway.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSelectRequest = async (req: ServiceRequest | null) => {
    setSelectedRequest(req);
    if (req) {
      setLedgerLoading(true);
      try {
        const info = await FinanceAPI.getSupplierLedger(req.supplierId);
        setLedgerInfo(info);
      } catch (err) {
        console.error("Ledger fetch failed", err);
        setLedgerInfo(null);
      } finally {
        setLedgerLoading(false);
      }
    } else {
      setLedgerInfo(null);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: RequestStatus) => {
    setProcessingId(requestId);
    try {
      const adminUuid = '11111111-1111-1111-1111-111111111111';
      await FinanceAPI.updateStatus(requestId, status, adminUuid);
      handleSelectRequest(null);
      loadRequests();
    } catch (err: any) {
      alert(err?.message || 'Status update failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const processedCount = requests.filter(r => r.status !== 'PENDING').length;

  const filteredRequests = requests.filter(r => {
    if (filter === 'PENDING') return r.status === 'PENDING';
    return r.status !== 'PENDING';
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const getRequestAccent = (requestType: string) => {
    if (requestType === 'ADVANCE') return 'emerald';
    if (requestType === 'FERTILIZER') return 'blue';
    if (requestType === 'TRANSPORT') return 'violet';
    if (requestType === 'TOOL_PURCHASE' || requestType === 'TOOL_RENT') return 'teal';
    return 'slate';
  };

  const getRequestLabel = (requestType: string) => requestType.replace(/_/g, ' ').toLowerCase();

  const getRequestSpecification = (req: ServiceRequest) => {
    if (req.requestType === 'ADVANCE') return `Rs. ${Number(req.requestedAmount || 0).toLocaleString()}`;
    if (req.requestType === 'TRANSPORT') return 'Provision';
    if (req.requestType === 'FERTILIZER') return `${Number(req.quantity || 0).toLocaleString()} kg`;
    return `${Number(req.quantity || 0).toLocaleString()} units`;
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-20 pr-4 lg:pr-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Approvals Queue</h1>
           <p className="text-slate-500 text-sm font-medium">Verify and authorize field service requests</p>
        </div>
         <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <StatusTab 
              label={`${pendingCount} Pending`} 
              color="text-orange-600" 
              active={filter === 'PENDING'} 
              onClick={() => setFilter('PENDING')}
            />
            <StatusTab 
              label={`${processedCount} Processed`} 
              color="text-green-600" 
              active={filter === 'PROCESSED'} 
              onClick={() => setFilter('PROCESSED')}
            />
         </div>
      </div>

      {error && (
        <div className="mx-4 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-4 text-red-600 shadow-sm">
           <AlertCircle size={20} />
           <div className="flex-1 text-sm font-semibold">{error}</div>
           <button onClick={loadRequests} className="px-4 py-2 bg-white rounded-lg border border-red-200 text-xs font-bold hover:bg-red-50 transition-colors">
             Retry Sync
           </button>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm mx-4 overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-[0.1em]">
                <th className="px-6 py-5">Supplier Profile</th>
                <th className="px-6 py-5">Requested By</th>
                <th className="px-6 py-5">Request Category</th>
                <th className="px-6 py-5">Submission Log</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                     <RefreshCw className="animate-spin inline-block text-green-500 mb-4" size={32} />
                     <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Refreshing Request Database...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center text-slate-400 text-sm italic font-medium">
                     No active service requests found.
                  </td>
                </tr>
              ) : filteredRequests.map((req) => {
                const dt = formatDateTime(req.requestDate);
                return (
                  <tr key={req.requestId} className="group hover:bg-white transition-all duration-200">
                    <td className="px-8 py-7">
                       <p className="font-bold text-slate-900 text-[15px] leading-tight mb-1">{req.supplierName || 'System ID Entry'}</p>
                       <p className="text-[11px] text-slate-400 font-bold tracking-wider uppercase">{req.passbookNo || 'PB-000000'}</p>
                    </td>
                    <td className="px-6 py-6">
                      <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {req.creatorName || "Transport Agent"}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">ID: {req.creatorId || "—"}</p>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.requestType === 'ADVANCE' ? 'bg-emerald-50 text-emerald-600' : 
                        req.requestType === 'FERTILIZER' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        {req.requestType}
                      </span>
                    </td>
                    <td className="px-6 py-7">
                       <div className="flex items-center gap-2 mb-1">
                          <Calendar size={13} className="text-slate-400" />
                          <span className="text-slate-900 text-xs font-bold">{dt.date}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <Clock size={13} className="text-slate-400" />
                          <span className="text-slate-400 text-[11px] font-semibold uppercase">{dt.time}</span>
                       </div>
                    </td>
                    <td className="px-6 py-7 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          req.status === 'PENDING' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 
                          req.status.startsWith('APPROVED') || req.status === 'DISPATCHED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                          req.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400' :
                          'bg-red-500 text-white shadow-lg shadow-red-100'
                        }`}>{req.status.startsWith('APPROVED') ? 'APPROVED' : req.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-8 py-7 text-right">
                       <button 
                         onClick={() => handleSelectRequest(req)}
                         className="px-5 py-2.5 bg-slate-900 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold ml-auto hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-md shadow-slate-200"
                       >
                         <Eye size={15}/>
                         Review
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => handleSelectRequest(null)} />
          <div className="bg-white w-full max-w-xl rounded-[24px] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Administrative Audit</p>
                  <h3 className="text-xl font-bold text-slate-900">Request Details</h3>
               </div>
               <button onClick={() => handleSelectRequest(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="p-6 space-y-5 bg-white">
               <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex items-start justify-between gap-4">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] mb-1">Request</p>
                   <h4 className="text-xl font-black text-slate-900 leading-tight capitalize">
                     {getRequestLabel(selectedRequest.requestType)}
                   </h4>
                   <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                     {selectedRequest.notes?.trim() || '—'}
                   </p>
                 </div>
                 <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap ${
                   getRequestAccent(selectedRequest.requestType) === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                   getRequestAccent(selectedRequest.requestType) === 'blue' ? 'bg-blue-50 text-blue-700' :
                   getRequestAccent(selectedRequest.requestType) === 'violet' ? 'bg-violet-50 text-violet-700' :
                   getRequestAccent(selectedRequest.requestType) === 'teal' ? 'bg-teal-50 text-teal-700' :
                   'bg-slate-100 text-slate-600'
                 }`}>
                   {selectedRequest.status.replace(/_/g, ' ')}
                 </span>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <DetailBlock icon={<User size={18} className="text-emerald-600"/>} label="Supplier">
                      <p className="font-bold text-slate-900 text-lg leading-tight">{selectedRequest.supplierName}</p>
                      <p className="text-xs text-slate-400 font-bold tracking-widest mt-1 uppercase">PB REF: {selectedRequest.passbookNo}</p>
                   </DetailBlock>
                   <DetailBlock icon={<Landmark size={18} className="text-blue-600"/>} label="Transport Agent">
                      <p className="font-bold text-slate-900 text-lg leading-tight">
                        {selectedRequest.creatorName || "Transport Agent"}
                      </p>
                      <p className="text-xs text-slate-400 font-bold tracking-widest mt-1 uppercase">AGENT REF: {selectedRequest.creatorId || "—"}</p>
                   </DetailBlock>
                  <DetailBlock icon={<Landmark size={18} className="text-emerald-600"/>} label="Request Specification">
                     <p className="text-2xl font-bold text-emerald-600 leading-tight">
                        {getRequestSpecification(selectedRequest)}
                     </p>
                     <div className="mt-3 grid grid-cols-2 gap-2.5">
                       <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                         <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-0.5">Item</p>
                         <p className="text-sm font-bold text-slate-900 leading-tight">{selectedRequest.itemType || '—'}</p>
                       </div>
                       <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                         <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-0.5">Units</p>
                         <p className="text-sm font-bold text-slate-900 leading-tight">
                           {selectedRequest.requestType === 'ADVANCE' ? '—' : selectedRequest.requestType === 'TRANSPORT' ? 'Provision' : `${selectedRequest.quantity?.toLocaleString() || '0'}`}
                         </p>
                       </div>
                     </div>
                  </DetailBlock>
                  <DetailBlock icon={<AlertCircle size={18} className="text-orange-500"/>} label="Ledger Position">
                     {ledgerLoading ? (
                        <RefreshCw size={16} className="animate-spin text-slate-400" />
                     ) : ledgerInfo ? (
                        <>
                           <p className="font-bold text-slate-900 text-lg leading-tight">Debt: Rs. {ledgerInfo.currentDebt.toLocaleString()}</p>
                           <p className={`text-[11px] font-bold tracking-widest mt-1 uppercase ${ledgerInfo.estimatedBalance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              BALANCE: Rs. {ledgerInfo.estimatedBalance.toLocaleString()}
                           </p>
                        </>
                     ) : (
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">No Ledger Data</p>
                     )}
                     <div className="mt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Verification Required</p>
                     </div>
                  </DetailBlock>
               </div>

               {selectedRequest.status === 'PENDING' ? (
                 <div className="pt-6 border-t border-slate-100 flex gap-4">
                    <button 
                      disabled={!!processingId}
                      onClick={() => handleUpdateStatus(selectedRequest.requestId, 'REJECTED')}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-50 text-red-600 font-bold hover:bg-red-50 hover:border-red-100 transition-all disabled:opacity-50"
                    >
                       <XCircle size={20} />
                       Decline
                    </button>
                    <button 
                      disabled={!!processingId}
                      onClick={() => handleUpdateStatus(selectedRequest.requestId, 'APPROVED_BY_EXT')}
                      className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                       <CheckCircle2 size={20} />
                       Authorize & Approve
                    </button>
                 </div>
               ) : (
                 <div className="pt-8 border-t border-slate-100 text-center">
                    <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-[0.2em] shadow-sm shadow-slate-100 ${
                      selectedRequest.status.startsWith('APPROVED') || selectedRequest.status === 'DISPATCHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {selectedRequest.status.startsWith('APPROVED') || selectedRequest.status === 'DISPATCHED' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                      {selectedRequest.status.startsWith('APPROVED') ? 'APPROVED' : selectedRequest.status.replace(/_/g, ' ')}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusTab({ label, color, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 ${
      active ? 'bg-white shadow-md ' + color : 'text-slate-400 hover:text-slate-600'
    }`}>
      {active && <span className="w-2 h-2 rounded-full bg-current shadow-sm" />}
      {label}
    </button>
  );
}

function DetailBlock({ icon, label, children }: any) {
  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
     <div className="flex items-center gap-3 text-slate-400">
          <div className="p-2 bg-slate-50 rounded-lg shadow-inner">
            {icon}
          </div>
       <span className="text-[10px] font-bold uppercase tracking-[0.22em]">{label}</span>
       </div>
       <div className="pl-1">
          {children}
       </div>
    </div>
  );
}
