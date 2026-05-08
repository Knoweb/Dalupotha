import { Edit2, Shield, Globe, Database, Cloud, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const userRole = sessionStorage.getItem('user_role');
  const isManager = userRole === 'manager';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{isManager ? t('System Settings') : t('Preferences')}</h1>
           <p className="text-slate-950 text-sm">
             {isManager 
               ? t('Global configuration and external service integrations')
               : t('Manage your app experience')
             }
           </p>
        </div>
      </div>

      <section className="space-y-4">
         <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Globe size={14} />
            {t('Language Preference')}
         </h2>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-bold text-slate-800">{t('Language Preference')}</p>
                  <p className="text-xs text-slate-950 mt-1">{t('Choose your preferred interface language')}</p>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => setLang('en')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                      lang === 'en' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t('English')}
                  </button>
                  <button 
                    onClick={() => setLang('si')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                      lang === 'si' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t('Sinhala')}
                  </button>
               </div>
            </div>
         </div>
      </section>

      {isManager && (
        <>
          <section className="space-y-4">
             <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <SettingsIcon size={14} />
                {t('System')}
             </h2>
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <SettingRow label={t("Factory Name")} value="Uva Halpewatte Factory" />
                <SettingRow label={t("Financial Year Start")} value={t("April")} />
                <SettingRow label={t("Advance Limit (Rs.)")} value="25,000" />
                <SettingRow label={t("Debt Alert Threshold")} value="80% of supply value" />
             </div>
          </section>

          <section className="space-y-4 pt-4">
             <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Globe size={14} />
                {t('Integration')}
             </h2>
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <SettingRow label={t("Ginum Ledger URL")} value="https://ginum.internal" />
                <SettingRow label={t("Sync Interval")} value={t("Every 10 min")} />
                <SettingRow label={t("Backup Storage")} value={t("Cloud (AWS S3)")} />
                <SettingRow label={t("Last Backup")} value={t("Today 13:00")} />
             </div>
          </section>
          
          <section className="pt-8 opacity-40">
             <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center border-dashed">
                <Shield size={32} className="mx-auto mb-4 text-slate-950" />
                <p className="text-xs font-black text-slate-900 uppercase tracking-[4px]">{t('Advanced Security Controls')}</p>
                <p className="text-[10px] text-slate-950 mt-2 font-medium">{t('Access to security auditing and encryption keys is restricted to root administrators.')}</p>
             </div>
          </section>
        </>
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string, value: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between px-8 py-6 group hover:bg-slate-50/50 transition-colors">
       <div>
          <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-1">{label}</p>
          <p className="font-bold text-slate-800">{value}</p>
       </div>
       <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-900 uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all">
          <Edit2 size={12} />
          {t('Edit')}
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
