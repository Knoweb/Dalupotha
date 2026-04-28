import { CreditCard, Wallet, TrendingUp, Download, RefreshCw } from 'lucide-react'

export default function FinancialsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Financial Control</h1>
           <p className="text-slate-500 text-sm">Ledger balance and payment tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50">
             <RefreshCw size={16} />
             <span>Sync Girum Ledger</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinCard title="Rs. 1,142,000" label="Pending Balance Payments" sub="47 suppliers" icon={<Wallet className="text-green-500" />} />
        <FinCard title="Rs. 432,000" label="Paid This Week" sub="18 payments" icon={<CreditCard className="text-blue-500" />} />
        <FinCard title="Rs. 284,500" label="Total Advances Out" sub="Feb 2026" icon={<TrendingUp className="text-orange-500" />} />
        <FinCard title="Rs. 1,247,800" label="Total Debt Portfolio" sub="247 holders" icon={<TrendingUp className="text-red-500" />} />
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center h-96">
         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-200 border border-slate-100">
            <TrendingUp size={32} />
         </div>
         <p className="text-slate-400 font-bold uppercase tracking-[4px] text-xs">Financial Trends (6 Months)</p>
         <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Chart visualization powered by DaluPotha Analytics Engine</p>
         <button className="mt-8 text-[#2d6a4f] font-black text-[10px] uppercase tracking-widest border-b-2 border-green-500/20 pb-1">Open Detailed Ledger</button>
      </div>
    </div>
  );
}

function FinCard({ title, label, sub, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">{icon}</div>
       <p className="text-2xl font-black text-slate-900 tracking-tight">{title}</p>
       <p className="text-xs font-bold text-slate-500">{label}</p>
       <p className="text-[10px] text-slate-300 font-medium">{sub}</p>
    </div>
  );
}
