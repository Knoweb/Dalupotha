import { useState, useEffect, useMemo } from 'react'
import { 
  CreditCard, Wallet, TrendingUp, Download, RefreshCw, 
  Search, Filter, ChevronRight, ArrowUpRight, ArrowDownRight, 
  Coins, Settings, Calculator, CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import React from 'react'

type TabType = 'overview' | 'payouts' | 'ledgers' | 'settings';

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [leafPrice, setLeafPrice] = useState(240); // Default Rs/kg
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Treasury</h1>
          <p className="text-slate-500 font-medium">Manage supplier payouts, advances, and ledger reconciliation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Coins size={16} className="text-emerald-600" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Leaf Price: Rs. {leafPrice}</span>
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Ledgers'}</span>
          </button>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="flex p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50">
        <TabButton active={activeTab === 'overview'} label="Overview" onClick={() => setActiveTab('overview')} icon={<TrendingUp size={14} />} />
        <TabButton active={activeTab === 'payouts'} label="Payout Generator" onClick={() => setActiveTab('payouts')} icon={<Calculator size={14} />} />
        <TabButton active={activeTab === 'ledgers'} label="Supplier Ledgers" onClick={() => setActiveTab('ledgers')} icon={<CreditCard size={14} />} />
        <TabButton active={activeTab === 'settings'} label="Treasury Settings" onClick={() => setActiveTab('settings')} icon={<Settings size={14} />} />
      </div>

      {/* Dynamic Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'payouts' && <PayoutGeneratorTab price={leafPrice} />}
        {activeTab === 'ledgers' && <LedgersTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
        {activeTab === 'settings' && <SettingsTab price={leafPrice} setPrice={setLeafPrice} />}
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' 
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Rs. 1,420,500" label="Projected Payout" sub="Unpaid net weight total" icon={<Wallet className="text-indigo-500" />} color="indigo" />
        <StatCard title="Rs. 432,000" label="Paid (Current Month)" sub="18 transactions completed" icon={<CheckCircle2 className="text-emerald-500" />} color="emerald" />
        <StatCard title="Rs. 284,500" label="Active Advances" sub="Awaiting deduction" icon={<Coins className="text-orange-500" />} color="orange" />
        <StatCard title="Rs. 1,247,800" label="Debt Recovery" sub="Outstanding store credits" icon={<AlertCircle className="text-rose-500" />} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
             <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Transactions</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Cash flow reconciliation</p>
             </div>
             <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="p-4 space-y-2">
            <TransactionRow name="Aroshani Sinhawansha" type="Payout" amount="Rs. 42,500" date="2 hours ago" status="Completed" />
            <TransactionRow name="Jagath Somapala" type="Advance" amount="Rs. 5,000" date="5 hours ago" status="Pending" />
            <TransactionRow name="Saman Kumara" type="Payout" amount="Rs. 18,200" date="Yesterday" status="Completed" />
            <TransactionRow name="Nimal Perera" type="Debt" amount="Rs. 2,400" date="Yesterday" status="Cleared" />
          </div>
        </div>

        {/* Treasury Health Card */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col justify-between shadow-2xl shadow-indigo-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative">
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Treasury Snapshot</p>
            <h4 className="text-3xl font-black mb-2 tracking-tight">Rs. 8.4M</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Available cash reserves for supplier settlements this cycle.</p>
          </div>
          <div className="mt-12 space-y-4 relative">
             <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Monthly Target</span>
                <span>85%</span>
             </div>
             <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
             </div>
             <button className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-4">
                Generate Balance Sheet
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAYOUT GENERATOR TAB ─────────────────────────────────────────────────────
function PayoutGeneratorTab({ price }: { price: number }) {
  const [period, setPeriod] = useState('April 2026');
  const [processing, setProcessing] = useState(false);

  const startProcessing = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Mass Payout Generator</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Process earnings for all suppliers in a specific cycle</p>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <select className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500">
                <option>April 2026</option>
                <option>March 2026</option>
                <option>February 2026</option>
              </select>
              <button 
                onClick={startProcessing}
                disabled={processing}
                className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                {processing ? <RefreshCw className="animate-spin" size={14} /> : <Calculator size={14} />}
                {processing ? 'Processing...' : 'Run Calculations'}
              </button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Supplier</th>
                <th className="px-8 py-5 text-right">Net Weight</th>
                <th className="px-8 py-5 text-right">Gross Earnings</th>
                <th className="px-8 py-5 text-right">Advances</th>
                <th className="px-8 py-5 text-right">Final Payout</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <PayoutRow name="Aroshani Sinhawansha" pb="PB-0093" weight={425.4} price={price} advances={5000} />
              <PayoutRow name="Jagath Somapala" pb="PB-0042" weight={112.2} price={price} advances={0} />
              <PayoutRow name="Saman Kumara" pb="PB-0128" weight={854.7} price={price} advances={12500} />
              <PayoutRow name="Nimal Perera" pb="PB-0012" weight={320.0} price={price} advances={2000} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── LEDGERS TAB ─────────────────────────────────────────────────────────────
function LedgersTab({ searchQuery, setSearchQuery }: any) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search supplier by name or passbook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 px-6 py-4 rounded-2xl text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50">
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LedgerCard name="Aroshani Sinhawansha" pb="PB-0093" balance="Rs. 42,500" lastTrans="2 days ago" />
        <LedgerCard name="Jagath Somapala" pb="PB-0042" balance="Rs. -5,000" lastTrans="5 hours ago" isNegative />
        <LedgerCard name="Saman Kumara" pb="PB-0128" balance="Rs. 18,200" lastTrans="Yesterday" />
        <LedgerCard name="Nimal Perera" pb="PB-0012" balance="Rs. 840" lastTrans="1 week ago" />
        <LedgerCard name="Priyani Malani" pb="PB-0215" balance="Rs. 0" lastTrans="2 weeks ago" />
      </div>
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ price, setPrice }: any) {
  return (
    <div className="max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
       <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-10 space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Treasury Configuration</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Global parameters for financial calculations</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Green Leaf Price (Rs/kg)</label>
              <div className="relative">
                <Coins className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-5 text-2xl font-black text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic mt-2 ml-1">This price will be used for all projected earnings and payout calculations.</p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-4">
              <button className="flex-1 bg-slate-900 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                Save Changes
              </button>
            </div>
          </div>
       </div>
    </div>
  );
}

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────

function StatCard({ title, label, sub, icon, color }: any) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    orange: 'bg-orange-50 border-orange-100',
    rose: 'bg-rose-50 border-rose-100',
  };
  return (
    <div className={`p-6 rounded-[24px] border shadow-sm flex flex-col gap-3 ${colors[color] || 'bg-white border-slate-200'}`}>
       <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-white">{icon}</div>
       <div>
         <p className="text-2xl font-black text-slate-900 tracking-tight">{title}</p>
         <p className="text-xs font-bold text-slate-500">{label}</p>
         <p className="text-[10px] text-slate-400 font-medium italic mt-1">{sub}</p>
       </div>
    </div>
  );
}

function TransactionRow({ name, type, amount, date, status }: any) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100">
       <div className="flex items-center gap-4">
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
           type === 'Payout' ? 'bg-emerald-50 text-emerald-600' : 
           type === 'Advance' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-600'
         }`}>
           {type === 'Payout' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
         </div>
         <div>
           <p className="text-sm font-bold text-slate-800">{name}</p>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type} · {date}</p>
         </div>
       </div>
       <div className="text-right">
         <p className="text-sm font-black text-slate-900">{amount}</p>
         <span className={`text-[9px] font-black uppercase tracking-widest ${
           status === 'Completed' ? 'text-emerald-500' : 
           status === 'Pending' ? 'text-orange-500' : 'text-slate-400'
         }`}>{status}</span>
       </div>
    </div>
  );
}

function PayoutRow({ name, pb, weight, price, advances }: any) {
  const gross = weight * price;
  const net = gross - advances;
  return (
    <tr className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
      <td className="px-8 py-5">
        <p className="text-sm font-bold text-slate-800">{name}</p>
        <p className="text-[10px] font-mono text-slate-400 uppercase">{pb}</p>
      </td>
      <td className="px-8 py-5 text-right font-bold text-slate-600">{weight} kg</td>
      <td className="px-8 py-5 text-right font-bold text-slate-900">Rs. {gross.toLocaleString()}</td>
      <td className="px-8 py-5 text-right font-bold text-rose-500">
        {advances > 0 ? `- Rs. ${advances.toLocaleString()}` : '—'}
      </td>
      <td className="px-8 py-5 text-right">
        <span className="text-lg font-black text-emerald-600">Rs. {net.toLocaleString()}</span>
      </td>
      <td className="px-8 py-5 text-center">
        <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
          Issue
        </button>
      </td>
    </tr>
  );
}

function LedgerCard({ name, pb, balance, lastTrans, isNegative }: any) {
  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{pb}</p>
           <h4 className="text-lg font-bold text-slate-800 leading-none">{name}</h4>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-all">
          <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance Owed</p>
          <p className={`text-xl font-black ${isNegative ? 'text-rose-500' : 'text-emerald-600'}`}>{balance}</p>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">Last: {lastTrans}</p>
      </div>
    </div>
  );
}
