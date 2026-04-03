import { BookOpen, Search, Filter, Plus, FileText, Send, RefreshCw } from 'lucide-react'

export default function CircularsPage() {
  const mockCirculars = [
    { id: 'TRI001', title: 'Feb 2026 - Tea Price Revision', date: '01 Feb 2026', distributed: 247, read: 188, percent: 77 },
    { id: 'TRI002', title: 'Fertilizer Subsidy Scheme 2026', date: '15 Jan 2026', distributed: 247, read: 201, percent: 81 },
    { id: 'TRI003', title: 'Quality Standards Update - Q1 2026', date: '10 Jan 2026', distributed: 247, read: 234, percent: 95 },
    { id: 'TRI004', title: 'Pest Alert: Blister Blight Notice', date: '05 Dec 2025', distributed: 247, read: 247, percent: 100 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">TRI Circulars</h1>
           <p className="text-slate-500 text-sm">Official Tea Research Institute advisory registry</p>
        </div>
        <button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold">
          <Plus size={18} />
          <span>Distribute New Circular</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search circulars..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500" />
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">CIRCULAR ID</th>
              <th className="px-8 py-4">TITLE</th>
              <th className="px-8 py-4 text-center">DATE</th>
              <th className="px-8 py-4 text-center">DISTRIBUTED</th>
              <th className="px-8 py-4 text-center">READ</th>
              <th className="px-8 py-4 text-center">READ %</th>
              <th className="px-8 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockCirculars.map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 font-bold text-slate-900 text-sm">{c.id}</td>
                <td className="px-8 py-6 font-bold text-slate-700 text-sm">{c.title}</td>
                <td className="px-8 py-6 text-center text-slate-400 text-xs font-medium">{c.date}</td>
                <td className="px-8 py-6 text-center text-slate-600 font-bold text-sm">{c.distributed}</td>
                <td className="px-8 py-6 text-center text-green-600 font-bold text-sm tracking-tighter">{c.read}</td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-3 justify-center">
                     <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div className="h-full bg-green-500" style={{ width: `${c.percent}%` }} />
                     </div>
                     <span className="text-[10px] font-black text-slate-400 w-8">{c.percent}%</span>
                   </div>
                </td>
                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                   <button className="bg-slate-50 border border-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100">View</button>
                   <button className="bg-green-50 border border-green-100 px-3 py-1 rounded text-[10px] font-black text-green-600 uppercase tracking-widest hover:bg-green-100 flex items-center gap-1">
                      <RefreshCw size={10} />
                      Resend
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
