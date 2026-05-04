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
  meta?: Record<string, any>;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read'>) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), read: false },
      ...prev.slice(0, 49) // keep max 50
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  useEffect(() => {
    // Connect to backend notification-service via STOMP over SockJS
    const client = new Client({
      webSocketFactory: () => new SockJS('/notifications/ws/notifications'),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[Notifications] STOMP connected');

        // Subscribe to the general notifications topic
        client.subscribe('/topic/notifications', (message) => {
          try {
            const payload = JSON.parse(message.body);
            addNotification({
              type: payload.type || 'system',
              title: payload.title || 'Notification',
              message: payload.message || '',
              timestamp: payload.timestamp || new Date().toISOString(),
              meta: payload.meta,
            });
          } catch (e) {
            console.error('[Notifications] Failed to parse message', e);
          }
        });
      },
      onDisconnect: () => {
        console.log('[Notifications] STOMP disconnected');
      },
      onStompError: (frame) => {
        console.warn('[Notifications] STOMP error', frame);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, clearAll };
}
