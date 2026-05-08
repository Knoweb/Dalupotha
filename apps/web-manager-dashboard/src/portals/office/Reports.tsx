import { FileText, Download, TrendingUp, Users, Package, Clock, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'

export default function ReportsPage() {
  const { t } = useLanguage()
  const auditLogs = [
    { time: '13:02', user: 'A. MG-001', action: t('Approved Advance'), target: 'REQ-008 • SH-0022', status: 'Success' },
    { time: '12:56', user: 'A. MG-001', action: t('Viewed Reports'), target: 'REG-001 • SH-1042', status: 'Info' },
    { time: '12:45', user: 'A. SYS', action: t('Automated Sync'), target: 'Cloud Ledger', status: 'Success' },
    { time: '11:13', user: 'A. MG-002', action: t('Rejected Request'), target: 'REQ-007 • SH-0533', status: 'Warning' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{t('Reports & Analytics')}</h1>
           <p className="text-slate-950 text-sm">{t('System audits and comprehensive data exports')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportTile icon={<FileText className="text-green-500"/>} label={t("Daily Collection Report")} t={t} />
          <ReportTile icon={<TrendingUp className="text-blue-500"/>} label={t("Monthly Financial Report")} t={t} />
          <ReportTile icon={<Package className="text-orange-500"/>} label={t("Inventory Stock Report")} t={t} />
          <ReportTile icon={<Clock className="text-purple-500"/>} label={t("TA Performance Report")} t={t} />
          <ReportTile icon={<Users className="text-red-500"/>} label={t("Small Holder Supply Ranking")} t={t} />
          <ReportTile icon={<FileText className="text-slate-950"/>} label={t("Debt Ageing Report")} t={t} />
      </div>

      <section>
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">{t('System Audit Log')}</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-4">{t('TIME')}</th>
                    <th className="px-8 py-4">{t('USER')}</th>
                    <th className="px-8 py-4">{t('ACTION')}</th>
                    <th className="px-8 py-4">{t('TARGET ENTITY')}</th>
                    <th className="px-8 py-4">{t('STATUS')}</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {auditLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-5 text-sm font-bold text-slate-900">{log.time}</td>
                       <td className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-tighter">{log.user}</td>
                       <td className="px-8 py-5 text-sm font-medium text-slate-900">{log.action}</td>
                       <td className="px-8 py-5 text-xs font-mono font-bold text-slate-900">{log.target}</td>
                       <td className="px-8 py-5">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold ${
                             log.status === 'Success' ? 'text-green-500' :
                             log.status === 'Warning' ? 'text-orange-500' : 'text-blue-500'
                          }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${
                                log.status === 'Success' ? 'bg-green-500' :
                                log.status === 'Warning' ? 'bg-orange-500' : 'bg-blue-500'
                             }`} />
                             {t(log.status).toUpperCase()}
                          </span>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[10px] font-black text-[#2d6a4f] uppercase tracking-widest hover:text-[#1b4332]">{t('View Full Audit Log →')}</button>
           </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60">
         <StatusBadge label={t("Database")} status="99.98% uptime" color="bg-green-500" />
         <StatusBadge label={t("Cloud Sync")} status="Last backup: 13:00 today" color="bg-green-500" />
         <StatusBadge label={t("Ginum Ledger")} status="Synced: 13:00 PM" color="bg-green-500" />
         <StatusBadge label={t("BLE Gateway")} status="1 device offline" color="bg-orange-500" />
      </section>
    </div>
  );
}

function ReportTile({ icon, label, t }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-4 hover:shadow-md transition-all group">
       <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">{icon}</div>
       <p className="text-sm font-bold text-slate-700">{label}</p>
       <div className="flex gap-2 w-full">
          <button className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2 rounded-lg text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100">
             <FileText size={12} />
             {t('PDF')}
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2 rounded-lg text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100">
             <RefreshCw size={12} />
             {t('Excel')}
          </button>
       </div>
    </div>
  );
}

function StatusBadge({ label, status, color }: any) {
  return (
    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
       <div className={`w-2 h-2 rounded-full ${color}`} />
       <div>
          <p className="text-[10px] font-black text-slate-900 tracking-widest uppercase mb-0.5">{label}</p>
          <p className="text-[10px] font-bold text-slate-600 italic">{status}</p>
       </div>
    </div>
  );
}
