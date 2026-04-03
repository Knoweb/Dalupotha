import { Map as MapIcon, Navigation, Info, Search, RefreshCw, ChevronRight } from 'lucide-react'

export default function TrackingPage() {
  const mockAgents = [
    { name: 'Kumara P.', id: 'TA001', collections: 14, total: '1240 kg', gps: '7.301°N', sync: '12:50 PM', status: 'Active' },
    { name: 'Roshan M.', id: 'TA002', collections: 11, total: '987 kg', gps: '7.312°N', sync: '12:40 PM', status: 'Active' },
    { name: 'Nishantha D.', id: 'TA003', collections: 6, total: '843 kg', gps: '7.298°N', sync: '11:30 AM', status: 'Pending' },
    { name: 'Prasad K.', id: 'TA004', collections: 8, total: '791 kg', gps: '7.325°N', sync: '10:15 AM', status: 'Offline' },
    { name: 'Sanjeewa B.', id: 'TA005', collections: 9, total: '612 kg', gps: '7.288°N', sync: '01:00 PM', status: 'Active' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Transport Live Tracking</h1>
           <p className="text-slate-500 text-sm">Real-time GPS visibility for leaf collection fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
             <RefreshCw size={16} />
             <span>Refetch GPS</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard label="Active TAs" value="3" sub="GPS tracking live" icon={<Navigation className="text-green-500"/>}/>
         <StatCard label="Sync Pending" value="1" sub="Records not yet synced" icon={<Clock className="text-orange-500"/>}/>
         <StatCard label="Offline TAs" value="1" sub="No signal detected" icon={<AlertCircle className="text-red-500"/>}/>
         <StatCard label="Total Collected Today" value="4,820 kg" sub="35 deliveries" icon={<TrendingUp className="text-blue-500"/>}/>
      </div>

      {/* Map Placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[400px] relative">
         <div className="absolute inset-0 bg-blue-50 flex items-center justify-center">
            <div className="text-center">
               <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 border border-blue-200">
                  <MapIcon size={32} className="text-blue-500" />
               </div>
               <p className="text-sm font-black text-slate-400 tracking-[5px] uppercase">Interactive Map: Uva Halpewatte Estate</p>
               <p className="text-[10px] text-slate-300 mt-2 font-medium">GPS Engine Ready • 5 Active Nodes Detected</p>
            </div>
         </div>
         <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-green-600 shadow-sm flex items-center gap-2">● Active</span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-orange-500 shadow-sm flex items-center gap-2">● Sync Pending</span>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">AGENT</th>
              <th className="px-8 py-4 text-center">ID</th>
              <th className="px-8 py-4 text-center">COLLECTIONS</th>
              <th className="px-8 py-4">TOTAL KG</th>
              <th className="px-8 py-4">LAST SYNC</th>
              <th className="px-8 py-4">STATUS</th>
              <th className="px-8 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockAgents.map((agent, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-4 font-bold text-slate-700 text-sm">{agent.name}</td>
                <td className="px-8 py-4 text-center text-xs text-slate-400 font-mono font-bold tracking-tight">{agent.id}</td>
                <td className="px-8 py-4 text-center font-bold text-slate-600 text-sm">{agent.collections}</td>
                <td className="px-8 py-4 font-black text-slate-700 text-sm tracking-tighter">{agent.total}</td>
                <td className="px-8 py-4 text-slate-400 text-xs font-medium">{agent.sync}</td>
                <td className="px-8 py-4">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     agent.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-200' : 
                     agent.status === 'Pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 
                     'bg-red-50 text-red-600 border border-red-200'
                   }`}>{agent.status}</span>
                </td>
                <td className="px-8 py-4 text-right">
                   <button className="bg-slate-50 border border-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100">Route</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
       <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">{icon}</div>
       <div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
          <p className="text-[10px] text-slate-300 font-medium italic">{sub}</p>
       </div>
    </div>
  );
}

function Clock({ className, size }: { className?: string, size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function TrendingUp({ className, size }: { className?: string, size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}

function AlertCircle({ className, size }: { className?: string, size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
