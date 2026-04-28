import { useState } from 'react'
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronDown } from 'lucide-react'

const mockDeliveries = [
  { id: 'C001', supplier: 'Bandara, S.K.', passbook: 'PB-1042', agent: 'Kumara P.', gross: 87.5, grade: 'A', deduction: 0, net: 87.5, status: 'Assessed' },
  { id: 'C002', supplier: 'Perera, A.M.', passbook: 'PB-0244', agent: 'Roshan M.', gross: 124.0, grade: 'B', deduction: 6.2, net: 117.8, status: 'Assessed' },
  { id: 'C003', supplier: 'Jayasekara, R.', passbook: 'PB-0317', agent: 'Roshan M.', gross: 63.0, grade: 'C', deduction: 12.6, net: 50.4, status: 'Pending' },
  { id: 'C004', supplier: 'Wijesekara, P.', passbook: 'PB-0891', agent: 'Kumara P.', gross: 201.5, grade: '', deduction: 0, net: 201.5, status: 'Pending' },
  { id: 'C005', supplier: 'Dissanayake, H.', passbook: 'PB-0055', agent: 'Prasad K.', gross: 95.0, grade: 'A', deduction: 0, net: 95.0, status: 'Assessed' },
];

const gradeConfig: Record<string, { label: string; deductPct: number; color: string }> = {
  A: { label: 'Grade A — Premium (0%)', deductPct: 0, color: 'text-green-600 bg-green-50 border-green-200' },
  B: { label: 'Grade B — Standard (5%)', deductPct: 5, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  C: { label: 'Grade C — Below Standard (10%)', deductPct: 10, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  D: { label: 'Grade D — Rejected (20%)', deductPct: 20, color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function QualityPage() {
  const [deliveries, setDeliveries] = useState(mockDeliveries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');

  const pending = deliveries.filter(d => d.status === 'Pending').length;
  const assessed = deliveries.filter(d => d.status === 'Assessed').length;
  const totalDeductions = deliveries.reduce((s, d) => s + d.deduction, 0);

  const handleAssess = (id: string) => {
    if (!gradeInput) return;
    const pct = gradeConfig[gradeInput]?.deductPct ?? 0;
    setDeliveries(prev => prev.map(d => {
      if (d.id !== id) return d;
      const deduction = parseFloat(((d.gross * pct) / 100).toFixed(1));
      return { ...d, grade: gradeInput, deduction, net: parseFloat((d.gross - deduction).toFixed(1)), status: 'Assessed' };
    }));
    setSelectedId(null);
    setGradeInput('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Assessment</h1>
          <p className="text-slate-500 text-sm">Green leaf quality grading and deduction calculation</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Pending Assessment" value={pending.toString()} sub="Deliveries awaiting grading" icon={<ClipboardCheck className="text-orange-500" />} color="orange" />
        <StatCard label="Assessed Today" value={assessed.toString()} sub="Graded successfully" icon={<CheckCircle2 className="text-green-500" />} color="green" />
        <StatCard label="Total Deductions" value={`${totalDeductions.toFixed(1)} kg`} sub="Quality-based weight deducted" icon={<AlertTriangle className="text-red-500" />} color="red" />
      </div>

      {/* Grade Reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(gradeConfig).map(([grade, cfg]) => (
          <div key={grade} className={`rounded-xl border px-4 py-3 ${cfg.color}`}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-0.5">Grade {grade}</p>
            <p className="text-xs font-medium">{cfg.deductPct}% deduction</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">Supplier</th>
              <th className="px-6 py-4">Agent</th>
              <th className="px-6 py-4 text-right">Gross (kg)</th>
              <th className="px-6 py-4 text-center">Grade</th>
              <th className="px-6 py-4 text-right">Deduction (kg)</th>
              <th className="px-6 py-4 text-right">Net (kg)</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deliveries.map((d) => (
              <>
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm">{d.supplier}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{d.passbook}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{d.agent}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700">{d.gross}</td>
                  <td className="px-6 py-4 text-center">
                    {d.grade
                      ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${gradeConfig[d.grade]?.color}`}>Grade {d.grade}</span>
                      : <span className="text-slate-300 text-xs font-bold">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {d.deduction > 0
                      ? <span className="text-red-500 font-bold text-sm">-{d.deduction}</span>
                      : <span className="text-slate-300 text-sm">0</span>}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">{d.net}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      d.status === 'Assessed' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {d.status === 'Pending' && (
                      <button
                        onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-700 transition-all"
                      >
                        Grade <ChevronDown size={12} className={selectedId === d.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      </button>
                    )}
                  </td>
                </tr>
                {selectedId === d.id && (
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign Grade:</p>
                        <div className="flex gap-2">
                          {Object.keys(gradeConfig).map(g => (
                            <button
                              key={g}
                              onClick={() => setGradeInput(g)}
                              className={`px-4 py-2 rounded-lg border text-xs font-black transition-all ${
                                gradeInput === g ? gradeConfig[g].color + ' shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              Grade {g}
                            </button>
                          ))}
                        </div>
                        {gradeInput && (
                          <div className="flex items-center gap-3 ml-auto">
                            <p className="text-xs text-slate-500">Deduction: <span className="font-bold text-red-500">{((d.gross * (gradeConfig[gradeInput]?.deductPct ?? 0)) / 100).toFixed(1)} kg</span></p>
                            <button onClick={() => handleAssess(d.id)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-700">
                              <CheckCircle2 size={13} /> Confirm
                            </button>
                            <button onClick={() => { setSelectedId(null); setGradeInput(''); }} className="px-3 py-2 border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 hover:bg-slate-100">
                              <XCircle size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
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
