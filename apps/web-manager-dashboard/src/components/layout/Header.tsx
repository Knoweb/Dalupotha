import { useState } from 'react'
import { ChevronRight, Bell, Settings, LogOut, User as UserIcon, CheckCheck, Trash2, Package, CheckSquare } from 'lucide-react'
import { AppNotification } from '../../hooks/useNotifications'
import { useLanguage } from '../../hooks/useLanguage'

interface HeaderProps {
  activeTab: string;
  userInfo: { fullName: string, estateName: string, employeeId?: string, role?: string };
  onLogout: () => void;
  unreadCount: number;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  pendingRequestCount?: number;
  pendingCollectionCount?: number;
}

export default function Header({ 
  activeTab, userInfo, onLogout, unreadCount, notifications, 
  onMarkAllRead, onMarkRead, onClearAll, pendingRequestCount = 0,
  pendingCollectionCount = 0
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { lang, t } = useLanguage();

  const role = userInfo.role || '';
  const showNotifBell = true;
  
  // Use collection count for factory-staff, otherwise request count
  const alertCount = role === 'factory-staff' ? pendingCollectionCount : pendingRequestCount;

  const ROLE_LABELS: Record<string, string> = {
    'manager':           t('Manager'),
    'extension-officer': t('Extension Officer'),
    'office-staff':      t('Office Staff'),
    'store-keeper':      t('Store Keeper'),
    'factory-staff':     t('Factory Staff'),
    'super-admin':       t('Super Admin'),
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shadow-sm relative">
      <div className="flex items-center gap-2 text-sm">
          <span className="text-black font-bold">{t('Project Dalupotha')}</span>
          <ChevronRight size={14} className="text-black" />
          <span className="text-black font-black capitalize text-base">{t(activeTab.replace('-', ' '))}</span>
         <div className="h-4 w-px bg-slate-200 mx-2" />
         <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 uppercase tracking-tight">
           {new Date().toLocaleDateString(lang === 'si' ? 'si-LK' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
         </span>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center gap-4 border-l border-slate-200 pl-6 relative">

          {/* Notification Bell */}
          {showNotifBell && (
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}
                className="relative text-slate-950 hover:text-slate-800 transition-colors"
              >
                <Bell size={20} className={(alertCount > 0) ? 'animate-wiggle' : ''} />
                {(alertCount > 0) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('Notifications')}</p>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={onMarkAllRead} className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
                            <CheckCheck size={11} /> {t('Mark all read')}
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={onClearAll} className="text-[10px] font-bold text-slate-900 hover:text-red-500 flex items-center gap-1">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-slate-950 text-xs font-bold uppercase tracking-widest">
                          {t('No notifications yet')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <NotifItem key={n.id} notification={n} onRead={onMarkRead} />
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
              className="flex items-center gap-3 hover:bg-slate-50 p-1 rounded-xl transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-black leading-tight">{userInfo.fullName}</p>
                <p className="text-[11px] text-black font-bold">
                  {ROLE_LABELS[role] || t('Staff')}{userInfo.employeeId ? ` • ${userInfo.employeeId}` : ''}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md uppercase">
                {userInfo.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="px-4 py-3 border-b border-slate-50 mb-1">
                      <p className="text-xs font-bold text-slate-900">{userInfo.fullName}</p>
                      <p className="text-[10px] text-slate-900 font-bold">{sessionStorage.getItem('estate_name') || userInfo.estateName}</p>
                   </div>
                   <DropdownItem icon={<UserIcon size={14}/>} label={t("My Profile")} />
                   <DropdownItem icon={<Settings size={14}/>} label={t("Account Settings")} />
                   <div className="h-px bg-slate-50 my-1" />
                   <button 
                     onClick={onLogout}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-xs font-bold"
                   >
                     <LogOut size={14} />
                     {t('Sign Out')}
                   </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NotifItem({ notification, onRead }: { notification: AppNotification; onRead: (id: string) => void }) {
  const { t } = useLanguage();
  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('just now');
    if (m < 60) return `${m}${t('m ago')}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${t('h ago')}`;
    return `${Math.floor(h / 24)}${t('d ago')}`;
  };

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-green-50/40' : ''}`}
    >
      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${!notification.read ? 'bg-green-100' : 'bg-slate-100'}`}>
        {notification.type === 'service_request' ? (
          <CheckSquare size={13} className={!notification.read ? 'text-green-600' : 'text-slate-900'} />
        ) : (
          <Package size={13} className={!notification.read ? 'text-green-600' : 'text-slate-900'} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-black truncate ${!notification.read ? 'text-slate-900' : 'text-slate-900'}`}>{notification.title}</p>
        <p className="text-[10px] text-slate-900 font-black mt-0.5 truncate">{notification.message}</p>
        <p className="text-[9px] text-slate-900 font-black mt-1">{timeAgo(notification.timestamp)}</p>
      </div>
      {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />}
    </button>
  );
}

function DateFilter({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
      active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-900 hover:text-slate-600'
    }`}>
      {label}
    </button>
  );
}

function DropdownItem({ icon, label }: { icon: any, label: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-900 hover:bg-slate-50 transition-all text-xs font-black">
      <span className="text-slate-900">{icon}</span>
      {label}
    </button>
  );
}
