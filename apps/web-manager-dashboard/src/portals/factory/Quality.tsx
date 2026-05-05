import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, CheckCircle2, AlertTriangle, RefreshCw, Loader2, X, Scale, User, Truck } from 'lucide-react'
import React from 'react'
import { dismissCollectionAlertById } from '../../hooks/useNotifications'

interface CollectionRow {
  collectionId: string;
  supplierName: string;
  passbookNo: string;
  transportAgentName?: string;
  grossWeight: number;
  netWeight: number;
  collectedAt: string;
  status: 'Pending' | 'Processed';
}

export default function QualityPage() {
  const [deliveries, setDeliveries] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<CollectionRow | null>(null);
  const [deductionInput, setDeductionInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collection/recent?limit=100');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Map backend response to display rows
      setDeliveries(data.map((c: any) => ({
        collectionId: c.collectionId,
        supplierName: c.supplierName || 'Unknown',
        passbookNo: c.passbookNo || '—',
        transportAgentName: c.transportAgentName || '—',
        grossWeight: parseFloat(c.grossWeight ?? 0),
        netWeight: parseFloat(c.netWeight ?? c.grossWeight ?? 0),
        collectedAt: c.collectedAt,
        // If net < gross, deduction was already applied
        status: (c.netWeight !== null && parseFloat(c.netWeight) < parseFloat(c.grossWeight)) ? 'Processed' : 'Pending',
      })));
    } catch (e) {
      console.error('Failed to load collections:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleProcess = async (collectionId: string, grossWeight: number) => {
    const deduction = parseFloat(deductionInput) || 0;
    const staffName = sessionStorage.getItem('user_name') || 'Unknown Staff';
    const staffId   = sessionStorage.getItem('employee_id') || '';
    setSaving(true);
    try {
      const res = await fetch(`/api/collection/${collectionId}/deduction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deductionWeight: deduction,
          processedByName: staffId ? `${staffName} (${staffId})` : staffName,
        }),
      });
      if (!res.ok) throw new Error('Failed to save deduction');
      // Dismiss the persistent alert for this collection
      dismissCollectionAlertById(collectionId);
      // Update local state
      setDeliveries(prev => prev.map(d =>
        d.collectionId === collectionId
          ? { ...d, netWeight: Number((grossWeight - deduction).toFixed(2)), status: 'Processed' }
          : d
      ));
      setSelectedDelivery(null);
      setDeductionInput('');
    } catch (e) {
      alert('Failed to save deduction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pending   = deliveries.filter(d => d.status === 'Pending').length;
  const processed = deliveries.filter(d => d.status === 'Processed').length;
  const totalDeductions = deliveries.reduce((s, d) => s + Math.max(0, d.grossWeight - d.netWeight), 0).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brought Leaf Register</h1>
          <p className="text-slate-500 text-sm">Log green leaf weights and apply quality deductions</p>
        </div>
        <button onClick={fetchCollections} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Pending" value={pending.toString()} sub="Deliveries awaiting processing" icon={<ClipboardCheck className="text-orange-500" />} color="orange" />
        <StatCard label="Processed Today" value={processed.toString()} sub="Weights logged successfully" icon={<CheckCircle2 className="text-green-500" />} color="green" />
        <StatCard label="Total Deductions" value={`${totalDeductions} kg`} sub="Quality-based weight deducted" icon={<AlertTriangle className="text-red-500" />} color="red" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">Supplier</th>
              <th className="px-6 py-4">Agent</th>
              <th className="px-6 py-4 text-right">Gross (kg)</th>
              <th className="px-6 py-4 text-right">Deduction (kg)</th>
              <th className="px-6 py-4 text-right">Net (kg)</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-slate-300 text-xs uppercase font-bold tracking-widest">Loading...</td></tr>
            ) : deliveries.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-slate-300 text-xs uppercase font-bold tracking-widest">No collections today</td></tr>
            ) : deliveries.map((d) => {
              const deducted = parseFloat((d.grossWeight - d.netWeight).toString());
              return (
                <React.Fragment key={d.collectionId}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{d.supplierName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{d.passbookNo}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{d.transportAgentName}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">{d.grossWeight.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      {deducted > 0.001
                        ? <span className="text-red-500 font-bold text-sm">-{deducted.toFixed(2)}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">{d.netWeight.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'Processed'
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-orange-50 text-orange-600 border border-orange-200'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {d.status === 'Pending' && (
                        <button
                          onClick={() => { setSelectedDelivery(d); setDeductionInput(''); }}
                          className="ml-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Quality Deduction Modal ────────────────────── */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => !saving && setSelectedDelivery(null)}
          />
          
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-200">
                    Quality Assessment
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Process Collection</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Review weights and apply deductions</p>
              </div>
              <button 
                onClick={() => setSelectedDelivery(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Collection Summary Card */}
            <div className="px-8 mb-8">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Supplier</p>
                      <p className="text-xs font-bold text-slate-800">{selectedDelivery.supplierName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      <Truck size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Agent</p>
                      <p className="text-xs font-bold text-slate-800">{selectedDelivery.transportAgentName}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200/60 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scale size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gross Weight</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">{selectedDelivery.grossWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="px-8 pb-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Quality Deduction (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    max={selectedDelivery.grossWeight}
                    value={deductionInput}
                    onChange={e => setDeductionInput(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-6 pr-14 py-4 text-lg font-bold text-slate-900 outline-none focus:border-green-500 focus:bg-white transition-all placeholder:text-slate-200"
                    autoFocus
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">kg</div>
                </div>
              </div>

              {/* Calculated Result */}
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Final Net Weight</p>
                <p className="text-xl font-black text-green-700">
                  {(selectedDelivery.grossWeight - (parseFloat(deductionInput) || 0)).toFixed(2)} kg
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProcess(selectedDelivery.collectionId, selectedDelivery.grossWeight)}
                  disabled={saving}
                  className="flex-[2] px-6 py-4 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Confirm Weight
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
  };
  return (
    <div className={`p-6 rounded-2xl border shadow-sm flex items-center gap-5 ${colors[color] || 'bg-white border-slate-200'}`}>
      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-white">{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[10px] text-slate-300 font-medium italic">{sub}</p>
      </div>
    </div>
  );
}
