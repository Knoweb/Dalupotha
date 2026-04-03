import { Search, Filter, Download, ChevronRight, RefreshCw } from 'lucide-react'

export default function CollectionsPage() {
  const mockCollections = [
    { id: 'C001', supplier: 'Bandara, S.K.', weight: '87.5', net: '85', agent: 'Kumara P.', time: '09:14', status: 'Synced' },
    { id: 'C002', supplier: 'Perera, A.M.', weight: '124', net: '121', agent: 'Roshan M.', time: '08:50', status: 'Synced' },
    { id: 'C003', supplier: 'Jayasekara, R.', weight: '63', net: '60', agent: 'Roshan M.', time: '10:10', status: 'Synced' },
    { id: 'C004', supplier: 'Wijesekara, P.', weight: '201.5', net: '196.5', agent: 'Kumara P.', time: '09:35', status: 'Queued' },
    { id: 'C005', supplier: 'Dissanayake, H.', weight: '95', net: '93', agent: 'Prasad K.', time: '08:00', status: 'Synced' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Collections Register</h1>
           <p className="text-slate-500 text-sm">Real-time green leaf intake tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50">
             <Download size={16} />
             <span>Export Registry</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input type="text" placeholder="Search by supplier ID or TA..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
           <FilterBtn label="All" active />
           <FilterBtn label="Today" />
           <FilterBtn label="This Week" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left font-sans">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">COLLECTION ID</th>
              <th className="px-6 py-4">SUPPLIER</th>
              <th className="px-6 py-4">WEIGHT (KG)</th>
              <th className="px-6 py-4">AGENT</th>
              <th className="px-6 py-4 text-center">GPS</th>
              <th className="px-6 py-4">TIME</th>
              <th className="px-6 py-4">SYNC</th>
              <th className="px-6 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockCollections.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 text-sm">{c.id}</td>
                <td className="px-6 py-4">
                   <p className="font-bold text-slate-700 text-sm">{c.supplier}</p>
                   <p className="text-[10px] text-slate-400 font-mono">SH-1042</p>
                </td>
                <td className="px-6 py-4">
                   <p className="font-bold text-slate-700 text-sm">{c.weight}</p>
                   <p className="text-[10px] text-green-500 font-bold">Net: {c.net}</p>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm font-medium">{c.agent}</td>
                <td className="px-6 py-4 text-center">
                   <span className="text-green-500 text-[10px] font-bold">● YES</span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{c.time}</td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     c.status === 'Synced' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                   }`}>{c.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="text-slate-400 hover:text-slate-900"><ChevronRight size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterBtn({ label, active }: any) {
  return (
    <button className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
    }`}>
      {label}
    </button>
  );
}
