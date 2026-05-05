import { useState, useEffect, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

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

const STORAGE_KEY = 'dalupotha_persistent_alerts';

function loadPersisted(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePersisted(alerts: AppNotification[]) {
  // Only persist relevant types; keep max 100
  const toSave = alerts.filter(n => n.type === 'new_collection' || n.type === 'service_request').slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

/** Callable from ANY component — marks the alert dismissed in localStorage and fires a storage event */
export function dismissCollectionAlertById(collectionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const alerts: AppNotification[] = JSON.parse(raw);
    const updated = alerts.map(n =>
      n.collectionId === collectionId ? { ...n, dismissed: true, read: true } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Notify other hook instances in the same tab
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(updated) }));
  } catch {}
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadPersisted());

  // Persist whenever new_collection alerts change
  useEffect(() => {
    savePersisted(notifications);
  }, [notifications]);

  // Re-sync if another component calls dismissCollectionAlertById
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setNotifications(prev => {
          const fromStorage = loadPersisted();
          // Merge: keep in-memory non-persisted notifications, update persisted ones
          const nonPersisted = prev.filter(n => n.type !== 'new_collection' && n.type !== 'service_request');
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
        { ...n, id: crypto.randomUUID(), read: false, dismissed: false },
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
        id: crypto.randomUUID(),
        type: 'new_collection',
        title: 'Pending Collection',
        message: `${c.supplierName} — ${c.grossWeight} kg (Agent: ${c.agentName})`,
        timestamp: c.collectedAt,
        read: false,
        dismissed: false,
        collectionId: c.collectionId,
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
      const alreadyTracked = prev.some(n => n.meta?.requestId === r.requestId);
      if (alreadyTracked) return prev;
      const alert: AppNotification = {
        id: crypto.randomUUID(),
        type: 'service_request',
        title: 'New Service Request',
        message: `New ${r.requestType} from ${r.supplierName} (${r.amountOrQty})`,
        timestamp: r.timestamp,
        read: false,
        dismissed: false,
        meta: { requestId: r.requestId }
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
              meta: payload.meta,
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

  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  /** Active (undismissed) new_collection alerts that haven't been processed yet */
  const pendingCollectionAlerts = notifications.filter(
    n => n.type === 'new_collection' && !n.dismissed
  );

  /** Active (undismissed) service_request alerts */
  const pendingRequestAlerts = notifications.filter(
    n => n.type === 'service_request' && !n.dismissed
  );

  return {
    notifications: notifications.filter(n => !n.dismissed),
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
  };
}
