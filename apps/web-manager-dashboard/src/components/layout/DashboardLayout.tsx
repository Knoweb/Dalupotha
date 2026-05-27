import { ReactNode, useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { UserRole } from '../../App'
import { useNotifications, AppNotification } from '../../hooks/useNotifications'
import { X, Leaf, CheckSquare, AlertTriangle } from 'lucide-react'
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
    dismissAlert, pendingCollectionAlerts, pendingRequestAlerts, addFromApi, addRequestFromApi, addPayoutFromApi,
  } = useNotifications();

  // ── Fetch actual pending (unprocessed) collections from API on mount ──────
  const [apiPending, setApiPending] = useState<PendingApiCollection[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
  const [pendingPayoutCount, setPendingPayoutCount] = useState<number>(0);
  const isAlertRole = ['manager', 'factory-staff', 'extension-officer', 'store-keeper'].includes(userRole || '');

  const fetchPending = useCallback(async () => {
    if (!isAlertRole) return;
    try {
      const estateId = sessionStorage.getItem('estate_id');
      const estateParam = estateId ? `&estateId=${estateId}` : '';
      const res = await fetch(`/api/collection/recent?limit=200${estateParam}`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      // A collection is "pending" if netWeight is null
      const pending = data.filter(c => c.netWeight === null || c.netWeight === undefined);
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
      
      // 2. Fetch pending service requests count (ONLY for roles that handle requests)
      if (['manager', 'extension-officer', 'store-keeper'].includes(userRole || '')) {
        const reqStatus = userRole === 'store-keeper' ? 'APPROVED_BY_EXT' : 'PENDING';
        const estateId = sessionStorage.getItem('estate_id');
        const estateParam = estateId ? `&estateId=${estateId}` : '';
        const reqRes = await fetch(`/api/services/request?status=${reqStatus}&limit=200${estateParam}`);
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

         // 3. Fetch pending payouts count
         let activePayoutIds = new Set<string>();
         try {
           const estateId = sessionStorage.getItem('estate_id');
           const usersRes = await fetch(`/api/auth/users${estateId ? `?estateId=${estateId}` : ''}`);
           if (usersRes.ok) {
             const allUsers: any[] = await usersRes.json();
             const suppliers = allUsers.filter((u: any) => u.role === 'SH' || u.role === 'SMALL_HOLDER' || u.role === 'SUPPLIER');
             
             let pendingPayoutsCount = 0;
             await Promise.all(suppliers.map(async (s: any) => {
               try {
                 const targetId = s.supplierId || s.userId;
                 const txRes = await fetch(`/api/finance/ledger/${targetId}/transactions`);
                 if (txRes.ok) {
                   const transactions: any[] = await txRes.json();
                   const pendingTxs = transactions.filter((t: any) => t.transactionType === 'PAYOUT' && t.status === 'AWAITING_APPROVAL');
                   pendingPayoutsCount += pendingTxs.length;

                   pendingTxs.forEach((pt: any) => {
                     const txId = pt.transactionId || pt.id || `${targetId}_payout_${pt.transactionDate}`;
                     activePayoutIds.add(txId);
                     addPayoutFromApi({
                       transactionId: txId,
                       supplierName: s.fullName || 'Supplier',
                       amount: pt.amount,
                       timestamp: pt.transactionDate || new Date().toISOString()
                     });
                   });
                 }
               } catch (e) { /* ignore */ }
             }));
             setPendingPayoutCount(pendingPayoutsCount);
           }
         } catch (e) { console.error("[AlertSync] Payout fetch error:", e); }
         
         // Sync persisted alerts
         const activeIds = new Set(filtered.map(r => r.requestId));
         
         // Clear stale alerts
         notifications.forEach(alert => {
           // Clear stale service requests
           const rid = alert.meta?.requestId;
           if (rid && !activeIds.has(rid) && alert.type === 'service_request' && alert.meta?.requestId) {
             dismissAlert(alert.id);
           }
           // Clear stale payouts
           const txId = alert.meta?.transactionId;
           if (txId && !activePayoutIds.has(txId) && alert.type === 'service_request' && alert.meta?.transactionId) {
             dismissAlert(alert.id);
           }
         });

         // Seed notifications for CURRENT items only
         filtered.forEach((r: any) => {
           addRequestFromApi({
             requestId: r.requestId,
             supplierName: r.supplierName || 'Supplier',
             requestType: r.requestType,
             amountOrQty: r.requestedAmount > 0 ? `Rs. ${r.requestedAmount}` : `${r.quantity || 1} units`,
             timestamp: r.requestDate
           });
         });
      }
      } else {
        setPendingRequestCount(0);
      }
    } catch (err) { console.error("[AlertSync] Fetch error:", err); }
  }, [isAlertRole, addFromApi, userRole, notifications, dismissAlert, addRequestFromApi, addPayoutFromApi]);

  // ── Auto-sync Estate Name from Backend ───────────────────────────────────
  useEffect(() => {
    const syncEstateName = async () => {
      try {
        const estateId = sessionStorage.getItem('estate_id');
        const res = await fetch('/api/auth/estates');
        if (res.ok) {
          const estates: any[] = await res.json();
          const current = estates.find(e => e.estateId === estateId);
          if (current && current.name !== userInfo.estateName) {
            sessionStorage.setItem('estate_name', current.name);
            // We can't easily update the parent state here, but the reload next time will fix it.
            // For immediate effect, we'll use a local override if we were in a stateful store,
            // but since we are reloading on save, this is mainly for other users/tabs.
          }
        }
      } catch (e) { /* ignore */ }
    };
    syncEstateName();
  }, [userInfo.estateName]);

  useEffect(() => {
    if (!isAlertRole) return;
    fetchPending();
    // Re-check every 60 seconds to catch any new collections that arrive
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [isAlertRole]);

  // Listen for manual refresh requests from other components (e.g. Approvals page)
  useEffect(() => {
    const handleRefresh = () => {
      fetchPending();
    };
    window.addEventListener('refresh-alerts', handleRefresh);
    return () => window.removeEventListener('refresh-alerts', handleRefresh);
  }, [fetchPending]);

  // ── Auto-sync Estate Name from Backend ───────────────────────────────────
  useEffect(() => {
    const syncEstateName = async () => {
      try {
        const estateId = sessionStorage.getItem('estate_id');
        const res = await fetch('/api/auth/estates');
        if (res.ok) {
          const estates: any[] = await res.json();
          const current = estates.find(e => e.estateId === estateId);
          if (current && current.name !== sessionStorage.getItem('estate_name')) {
            sessionStorage.setItem('estate_name', current.name);
          }
        }
      } catch (e) { /* ignore */ }
    };
    syncEstateName();
  }, []);

  const prevLengthRef = useRef(notifications.length);
  // Re-fetch counts when a new notification arrives (Real-time update)
  useEffect(() => {
    if (!isAlertRole) return;
    
    // Check if the latest notification is a service request
    const latest = notifications[0];
    if (latest && latest.type === 'service_request' && !latest.read && !latest.meta?.fromApi && notifications.length > prevLengthRef.current) {
      fetchPending();
    }
    prevLengthRef.current = notifications.length;
  }, [notifications.length, isAlertRole]);

  const handleNotificationClick = (notification: any) => {
    if (notification.meta?.transactionId) {
      sessionStorage.setItem('financials_active_tab', 'approvals');
      onTabChange('financials');
      window.dispatchEvent(new CustomEvent('financials-tab-redirect', { detail: 'approvals' }));
    } else if (notification.meta?.requestId) {
      onTabChange('approvals');
      window.dispatchEvent(new CustomEvent('approvals-tab-redirect'));
    }
  };

  const showBanner = pendingCollectionAlerts.length > 0 && isAlertRole;
  const pendingSystemAlerts = notifications.filter(n => n.type === 'system' && !n.dismissed);

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
        pendingPayoutCount={pendingPayoutCount}
        pendingCollectionCount={apiPending.length}
      />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          activeTab={activeTab}
          userInfo={userInfo}
          onLogout={onLogout}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onClearAll={clearAll}
          onDismiss={dismissAlert}
          pendingRequestCount={pendingRequestCount}
          pendingCollectionCount={apiPending.length}
          pendingPayoutCount={pendingPayoutCount}
          onNotificationClick={handleNotificationClick}
        />

        {/* ── Persistent Service Request Alert Banner (Summarized) ─────────────────── */}
        {['manager', 'extension-officer', 'store-keeper'].includes(userRole || '') && pendingRequestCount > 0 && pendingRequestAlerts.length > 0 && (
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

        {/* ── Persistent System Alert Banner (e.g. Refill) ─────────────────── */}
        {userRole === 'manager' && pendingSystemAlerts.length > 0 && (
          <div className="flex-shrink-0 bg-amber-50 border-b-2 border-amber-200 px-6 py-2.5 flex items-center gap-3 shadow-sm">
            <span className="relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="flex-1 text-sm font-bold text-amber-950">
              <span className="font-bold italic">{t('Refill Alert')}:</span>
              <span className="font-bold ml-1 text-amber-900">
                {pendingSystemAlerts[0].message}
                {pendingSystemAlerts.length > 1 && ` (+${pendingSystemAlerts.length - 1} more)`}
              </span>
            </p>
            <button
              onClick={() => onTabChange('inventory')}
              className="px-3 py-1 bg-amber-600 text-white text-[10px] font-black rounded-lg hover:bg-amber-700 transition-all uppercase tracking-wide shadow-sm"
            >
              {t('Go to Inventory')}
            </button>
            <button
              onClick={() => pendingSystemAlerts.forEach(a => dismissAlert(a.id))}
              className="p-1 text-amber-400 hover:text-amber-700 rounded transition-colors"
              title={t("Dismiss all refill alerts")}
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

        <main className="flex-1 p-4 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
