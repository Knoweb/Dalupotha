import { Edit2, Shield, Globe, Database, Cloud, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
           <p className="text-slate-500 text-sm">Global configuration and external service integrations</p>
        </div>
      </div>

      <section className="space-y-4">
         <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <SettingsIcon size={14} />
            System
         </h2>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            <SettingRow label="Factory Name" value="Uva Halpewatte Factory" />
            <SettingRow label="Financial Year Start" value="April" />
            <SettingRow label="Advance Limit (Rs.)" value="25,000" />
            <SettingRow label="Debt Alert Threshold" value="80% of supply value" />
         </div>
      </section>

      <section className="space-y-4 pt-4">
         <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Globe size={14} />
            Integration
         </h2>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            <SettingRow label="Girum Ledger URL" value="https://ginum.internal" />
            <SettingRow label="Sync Interval" value="Every 10 min" />
            <SettingRow label="Backup Storage" value="Cloud (AWS S3)" />
            <SettingRow label="Last Backup" value="Today 13:00" />
         </div>
      </section>
      
      <section className="pt-8 opacity-40">
         <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center border-dashed">
            <Shield size={32} className="mx-auto mb-4 text-slate-300" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[4px]">Advanced Security Controls</p>
            <p className="text-[10px] text-slate-300 mt-2 font-medium">Access to security auditing and encryption keys is restricted to root administrators.</p>
         </div>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between px-8 py-6 group hover:bg-slate-50/50 transition-colors">
       <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="font-bold text-slate-800">{value}</p>
       </div>
       <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all">
          <Edit2 size={12} />
          Edit
       </button>
    </div>
  );
}

function SettingsIcon({ className, size }: { className?: string, size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
