import { useState, useEffect, useCallback, useMemo } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AppNotification {
  id: string;
  type: 'new_collection' | 'service_request' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;           // true = user explicitly dismissed OR collection was processed
  collectionId?: string;        // for new_collection events - used to match when processed
  meta?: Record<string, any>;
}

function getStorageKey(): string {
  const role = sessionStorage.getItem('user_role') || 'guest';
  return `dalupotha_persistent_alerts_${role}`;
}

function loadPersisted(): AppNotification[] {
  try {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePersisted(alerts: AppNotification[]) {
  // Only persist relevant types; keep max 100
  const toSave = alerts.filter(n => n.type === 'new_collection' || n.type === 'service_request' || n.type === 'system').slice(0, 100);
  const serialized = JSON.stringify(toSave);
  const key = getStorageKey();
  if (localStorage.getItem(key) !== serialized) {
    localStorage.setItem(key, serialized);
  }
}

/** Callable from ANY component — marks the alert dismissed in localStorage and fires a storage event */
export function dismissCollectionAlertById(collectionId: string) {
  try {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const alerts: AppNotification[] = JSON.parse(raw);
    const updated = alerts.map(n =>
      n.collectionId === collectionId ? { ...n, dismissed: true, read: true } : n
    );
    localStorage.setItem(key, JSON.stringify(updated));
    // Notify other hook instances in the same tab
    window.dispatchEvent(new StorageEvent('storage', { key: key, newValue: JSON.stringify(updated) }));
  } catch {}
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadPersisted());

  const currentRole = sessionStorage.getItem('user_role') || '';
  useEffect(() => {
    setNotifications(loadPersisted());
  }, [currentRole]);

  // Persist whenever new_collection alerts change
  useEffect(() => {
    savePersisted(notifications);
  }, [notifications]);

  // Re-sync if another component calls dismissCollectionAlertById
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const key = getStorageKey();
      if (e.key === key) {
        setNotifications(prev => {
          const fromStorage = loadPersisted();
          // Merge: keep in-memory non-persisted notifications, update persisted ones
          const nonPersisted = prev.filter(n => n.type !== 'new_collection' && n.type !== 'service_request' && n.type !== 'system');
          return [...fromStorage, ...nonPersisted];
        });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'dismissed'>) => {
    setNotifications(prev => {
      // Deduplicate by collectionId for new_collection events
      if (n.type === 'new_collection' && n.collectionId) {
        const exists = prev.some(p => p.collectionId === n.collectionId);
        if (exists) return prev;
      }
      return [
        { ...n, id: safeRandomUUID(), read: false, dismissed: false },
        ...prev.slice(0, 49),
      ];
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(prev => prev.filter(n => (n.type === 'new_collection' || n.type === 'service_request') && !n.dismissed));
  }, []);

  /** Called when factory staff processes a collection — permanently clears that alert */
  const dismissCollectionAlert = useCallback((collectionId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.collectionId === collectionId ? { ...n, dismissed: true, read: true } : n
      )
    );
  }, []);

  /** Manually dismiss a single alert (by the user, not by processing) */
  const dismissAlert = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true, read: true } : n));
  }, []);

  /** Seed a notification from an API poll — no-op if collectionId already tracked */
  const addFromApi = useCallback((c: {
    collectionId: string; supplierName: string; grossWeight: number;
    agentName: string; collectedAt: string;
  }) => {
    setNotifications(prev => {
      const alreadyTracked = prev.some(n => n.collectionId === c.collectionId);
      if (alreadyTracked) return prev;
      const alert: AppNotification = {
        id: safeRandomUUID(),
        type: 'new_collection',
        title: 'Pending Collection',
        message: `${c.supplierName} — ${c.grossWeight} kg (Agent: ${c.agentName})`,
        timestamp: c.collectedAt,
        read: false,
        dismissed: false,
        collectionId: c.collectionId,
        meta: { fromApi: true }
      };
      return [alert, ...prev];
    });
  }, []);
  
  /** Seed a request notification from an API poll */
  const addRequestFromApi = useCallback((r: {
    requestId: string; supplierName: string; requestType: string;
    amountOrQty: string; timestamp: string;
  }) => {
    setNotifications(prev => {
      const existingIdx = prev.findIndex(n => n.meta?.requestId === r.requestId);
      if (existingIdx > -1) {
        if (prev[existingIdx].dismissed) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], dismissed: false };
          return updated;
        }
        return prev;
      }
      const alert: AppNotification = {
        id: safeRandomUUID(),
        type: 'service_request',
        title: 'New Service Request',
        message: `New ${r.requestType} from ${r.supplierName} (${r.amountOrQty})`,
        timestamp: r.timestamp,
        read: false,
        dismissed: false,
        meta: { requestId: r.requestId, fromApi: true }
      };
      return [alert, ...prev];
    });
  }, []);

  /** Seed a payout notification from an API poll */
  const addPayoutFromApi = useCallback((p: {
    transactionId: string; supplierName: string; amount: number; timestamp: string;
  }) => {
    setNotifications(prev => {
      const existingIdx = prev.findIndex(n => n.meta?.transactionId === p.transactionId);
      if (existingIdx > -1) {
        if (prev[existingIdx].dismissed) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], dismissed: false };
          return updated;
        }
        return prev;
      }
      const alert: AppNotification = {
        id: safeRandomUUID(),
        type: 'service_request',
        title: 'Pending Payout Approval',
        message: `Payout of Rs. ${p.amount} for ${p.supplierName} requires approval`,
        timestamp: p.timestamp,
        read: false,
        dismissed: false,
        meta: { transactionId: p.transactionId, fromApi: true }
      };
      return [alert, ...prev];
    });
  }, []);


  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/notifications/ws/notifications'),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[Notifications] STOMP connected');
        client.subscribe('/topic/notifications', (message) => {
          try {
            const payload = JSON.parse(message.body);
            addNotification({
              type: payload.type || 'system',
              title: payload.title || 'Notification',
              message: payload.message || '',
              timestamp: payload.timestamp || new Date().toISOString(),
              collectionId: payload.meta?.collectionId,
              meta: { ...payload.meta, targetRole: payload.targetRole || payload.meta?.targetRole },
            });
          } catch (e) {
            console.error('[Notifications] Failed to parse message', e);
          }
        });
      },
      onDisconnect: () => console.log('[Notifications] STOMP disconnected'),
      onStompError: (frame) => console.warn('[Notifications] STOMP error', frame),
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [addNotification]);

  const filteredNotifications = useMemo(() => {
    const role = sessionStorage.getItem('user_role') || '';
    return notifications.filter(n => {
      if (n.meta?.targetRole && n.meta.targetRole !== role) return false;
      return !n.dismissed;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    const role = sessionStorage.getItem('user_role') || '';
    return notifications.filter(n => {
      if (n.meta?.targetRole && n.meta.targetRole !== role) return false;
      return !n.read && !n.dismissed;
    }).length;
  }, [notifications]);

  /** Active (undismissed) new_collection alerts that haven't been processed yet */
  const pendingCollectionAlerts = useMemo(() => {
    const role = sessionStorage.getItem('user_role') || '';
    return notifications.filter(n => {
      if (n.meta?.targetRole && n.meta.targetRole !== role) return false;
      return n.type === 'new_collection' && !n.dismissed;
    });
  }, [notifications]);

  /** Active (undismissed) service_request alerts */
  const pendingRequestAlerts = useMemo(() => {
    const role = sessionStorage.getItem('user_role') || '';
    return notifications.filter(n => {
      if (n.meta?.targetRole && n.meta.targetRole !== role) return false;
      return n.type === 'service_request' && !n.dismissed;
    });
  }, [notifications]);

  return {
    notifications: filteredNotifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
    dismissAlert,
    dismissCollectionAlert,
    pendingCollectionAlerts,
    pendingRequestAlerts,
    addFromApi,
    addRequestFromApi,
    addPayoutFromApi,
  };
}
