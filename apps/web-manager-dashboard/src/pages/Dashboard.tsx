import { TrendingUp, Users, CheckSquare, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard title="4,820 kg" subtitle="Today's Green Leaf" icon={<TrendingUp size={20} className="text-green-500" />} trend="+8.4%" />
          <KPICard title="247" subtitle="Active Small Holders" icon={<Users size={20} className="text-blue-500" />} trend="12 new this month" />
          <KPICard title="18" subtitle="Pending Approvals" icon={<CheckSquare size={20} className="text-orange-500" />} trend="Adv 9 • Fert 6 • Mech 3" />
        </div>
      </section>

      <section>
        <div className="bg-[#fffbeb] border border-orange-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="text-orange-500 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Low Fertilizer Stock</p>
            <p className="text-xs text-slate-500">Urea stock at 1,420 kg (below 3,000 kg threshold). Reorder now.</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Daily Green Leaf Collection (kg)</h3>
          <div className="flex-1 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl font-medium uppercase tracking-tighter">
            Chart: Daily Collection Trend
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Collection Performance</h3>
          <div className="space-y-4">
            <ProgressBar label="Kumara P." value={100} color="bg-green-500" detail="1240 kg" />
            <ProgressBar label="Roshan M." value={70} color="bg-green-500" detail="987 kg • 1 pending" />
            <ProgressBar label="Nishantha D." value={65} color="bg-orange-500" detail="843 kg • 2 pending" />
            <ProgressBar label="Prasad K." value={60} color="bg-green-500" detail="791 kg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, subtitle, icon, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
          {icon}
        </div>
        {trend.includes('%') && (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">{trend}</span>
        )}
      </div>
      <p className="text-sm font-bold text-slate-400">{subtitle}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{title}</p>
      {!trend.includes('%') && (
        <p className="text-[10px] font-bold text-slate-400 mt-2 italic">{trend}</p>
      )}
    </div>
  );
}

function ProgressBar({ label, value, color, detail }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-end">
        <p className="text-[11px] font-bold text-slate-600">{label}</p>
        <p className="text-[11px] font-bold text-slate-400">{detail}</p>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
