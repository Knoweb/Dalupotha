import { ReactNode, useEffect, useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { UserRole } from '../../App'
import { useNotifications, AppNotification } from '../../hooks/useNotifications'
import { X, Leaf, CheckSquare } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userInfo: { fullName: string; estateName: string; employeeId?: string; role?: string };
  userRole: UserRole;
  onLogout: () => void;
}

interface PendingApiCollection {
  collectionId: string;
  supplierName: string;
  passbookNo: string;
  transportAgentName?: string;
  grossWeight: number;
  collectedAt: string;
}

export default function DashboardLayout({ children, activeTab, onTabChange, userInfo, userRole, onLogout }: DashboardLayoutProps) {
  const { t } = useLanguage();
  const {
    notifications, unreadCount, markRead, markAllRead, clearAll,
    dismissAlert, pendingCollectionAlerts, pendingRequestAlerts, addFromApi, addRequestFromApi,
  } = useNotifications();

  // ── Fetch actual pending (unprocessed) collections from API on mount ──────
  const [apiPending, setApiPending] = useState<PendingApiCollection[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
  const isAlertRole = ['manager', 'factory-staff', 'extension-officer', 'store-keeper'].includes(userRole || '');

  const fetchPending = useCallback(async () => {
    if (!isAlertRole) return;
    try {
      const res = await fetch('/api/collection/recent?limit=200');
      if (!res.ok) return;
      const data: any[] = await res.json();
      // A collection is "pending" if netWeight is null OR netWeight === grossWeight
      const pending = data.filter(c =>
        c.netWeight === null ||
        c.netWeight === undefined ||
        parseFloat(c.netWeight) >= parseFloat(c.grossWeight)
      );
      setApiPending(pending.map(c => ({
        collectionId: c.collectionId,
        supplierName: c.supplierName || 'Unknown',
        passbookNo: c.passbookNo || '—',
        transportAgentName: c.transportAgentName,
        grossWeight: parseFloat(c.grossWeight),
        collectedAt: c.collectedAt,
      })));
      // Seed localStorage notifications for any pending collections not yet tracked
      pending.forEach(c => {
        addFromApi({
          collectionId: c.collectionId,
          supplierName: c.supplierName,
          grossWeight: c.grossWeight,
          agentName: c.transportAgentName || 'Unknown Agent',
          collectedAt: c.collectedAt,
        });
      });
      
      // 2. Fetch pending service requests count
      const reqStatus = userRole === 'store-keeper' ? 'APPROVED_BY_EXT' : 'PENDING';
      const reqRes = await fetch(`/api/services/request?status=${reqStatus}&limit=200`);
      if (reqRes.ok) {
         const reqData: any[] = await reqRes.json();
         
         // Filter data on client side to be absolutely sure it matches the role AND item types
         const filtered = Array.isArray(reqData) ? reqData.filter(r => {
           const matchesStatus = r.status === reqStatus;
           if (userRole === 'store-keeper') {
             // Store Keepers only care about physical items
             return matchesStatus && ["FERTILIZER", "LEAF_BAG", "TOOL_PURCHASE", "TOOL_RENT"].includes(r.requestType);
           }
           return matchesStatus;
         }) : [];
         
         const count = filtered.length;
         console.log(`[AlertSync] Role: ${userRole}, Status: ${reqStatus}, Filtered Count: ${count}`);
         setPendingRequestCount(count);
         
         // Sync persisted alerts
         const activeIds = new Set(filtered.map(r => r.requestId));
         
         // Clear stale alerts
         pendingRequestAlerts.forEach(alert => {
           const rid = alert.meta?.requestId;
           if (rid && !activeIds.has(rid)) {
             dismissAlert(alert.id);
           }
         });

         // Seed notifications for CURRENT items only
         filtered.forEach(r => {
           addRequestFromApi({
             requestId: r.requestId,
             supplierName: r.supplierName || 'Supplier',
             requestType: r.requestType,
             amountOrQty: r.requestedAmount > 0 ? `Rs. ${r.requestedAmount}` : `${r.quantity || 1} units`,
             timestamp: r.requestDate
           });
         });
      }
    } catch (err) { console.error("[AlertSync] Fetch error:", err); }
  }, [isAlertRole, addFromApi, userRole, pendingRequestAlerts, dismissAlert, addRequestFromApi]);

  useEffect(() => {
    if (!isAlertRole) return;
    fetchPending();
    // Re-check every 60 seconds to catch any new collections that arrive
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [isAlertRole, fetchPending]);

  // Listen for manual refresh requests from other components (e.g. Approvals page)
  useEffect(() => {
    const handleRefresh = () => {
      fetchPending();
    };
    window.addEventListener('refresh-alerts', handleRefresh);
    return () => window.removeEventListener('refresh-alerts', handleRefresh);
  }, [fetchPending]);

  // Re-fetch counts when a new notification arrives (Real-time update)
  useEffect(() => {
    if (!isAlertRole) return;
    
    // Check if the latest notification is a service request
    const latest = notifications[0];
    if (latest && latest.type === 'service_request' && !latest.read) {
      fetchPending();
    }
  }, [notifications.length, isAlertRole]);

  const showBanner = pendingCollectionAlerts.length > 0 && isAlertRole;

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        userInfo={userInfo}
        userRole={userRole}
        onLogout={onLogout}
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        pendingRequestCount={pendingRequestCount}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          userInfo={userInfo}
          onLogout={onLogout}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onClearAll={clearAll}
          pendingRequestCount={pendingRequestCount}
        />

        {/* ── Persistent Service Request Alert Banner (Summarized) ─────────────────── */}
        {pendingRequestCount > 0 && (
          <div className="flex-shrink-0 bg-indigo-50 border-b-2 border-indigo-200 px-6 py-2.5 flex items-center gap-3 shadow-sm">
            <span className="relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <CheckSquare size={14} className="text-indigo-600 flex-shrink-0" />
            <p className="flex-1 text-sm font-bold text-indigo-900">
              <span className="font-bold italic">{t('Attention Needed')}:</span>
              <span className="font-bold ml-1 text-indigo-900">
                {t('You have')} <span className="font-bold text-indigo-900 underline decoration-indigo-300">{pendingRequestCount}</span> {userRole === 'store-keeper' ? t('item') : t('pending service request')}{pendingRequestCount > 1 ? (userRole === 'store-keeper' ? t('s ready for dispatch') : t('s')) : (userRole === 'store-keeper' ? t(' ready for dispatch') : '')} {t('that need review.')}
              </span>
            </p>
            <button
              onClick={() => onTabChange('approvals')}
              className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all uppercase tracking-wide shadow-sm"
            >
              {t('Review All')}
            </button>
            <button
              onClick={() => pendingRequestAlerts.forEach(a => dismissAlert(a.id))}
              className="p-1 text-indigo-400 hover:text-indigo-700 rounded transition-colors"
              title={t("Dismiss all request alerts")}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Persistent Collection Alert Banner ─────────────────── */}
        {pendingCollectionAlerts.length > 0 && isAlertRole && (
          <div className="flex-shrink-0 bg-amber-50 border-b-2 border-amber-300 px-6 py-0 divide-y divide-amber-100">
            {pendingCollectionAlerts.map((alert: AppNotification) => (
              <div key={alert.id} className="flex items-center gap-3 py-2.5">
                <span className="relative flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <Leaf size={14} className="text-amber-600 flex-shrink-0" />
                <p className="flex-1 text-sm font-bold text-amber-950">
                  <span className="font-bold">{t(alert.title)}</span>
                  {alert.message && (
                    <span className="font-bold ml-1 text-amber-900">— {t(alert.message)}</span>
                  )}
                </p>
                <span className="text-[9px] text-amber-500 font-mono whitespace-nowrap">
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {userRole === 'factory-staff' && (
                  <button
                    onClick={() => onTabChange('quality')}
                    className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg hover:bg-amber-600 transition-all uppercase tracking-wide shadow-sm"
                  >
                    {t('Process Now')}
                  </button>
                )}
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 text-amber-400 hover:text-amber-700 rounded transition-colors"
                  title={t("Snooze this alert")}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
