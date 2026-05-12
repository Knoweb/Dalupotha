import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, ServicesAPI, apiGet, apiPatch, apiPost } from "../../services/api";
import { getOfflineCollections, syncQueuedCollections } from "./collectionData";
import { getTranslation } from "../smallholder/SupplierScreens";

type ApiCollectionHistory = {
  collectionId: string;
  supplierId: string;
  supplierName: string;
  passbookNo: string;
  grossWeight: number;
  netWeight?: number;
  collectedAt: string;
  syncStatus: "QUEUED" | "SYNCING" | "SYNCED" | "FAILED";
  gpsStatus: "GPS" | "NO_GPS" | "MANUAL";
  manualOverride: boolean;
};

type CollectionCardItem = {
  key: string;
  supplierId: string;
  supplierName: string;
  passbookNo?: string;
  grossWeight: number;
  netWeight?: number;
  collectedAt: string;
  syncStatus: "QUEUED" | "SYNCING" | "SYNCED" | "FAILED";
  gpsStatus: "GPS" | "NO_GPS" | "MANUAL";
  manualOverride: boolean;
};

// ─────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────

export const StatusBadge = ({ type, text }: any) => {
  let color = palette.accentGreen;
  let bg = "transparent";
  let icon = "checkmark";
  if (type === "gps")     { color = palette.accentGreen; icon = "location-outline"; bg = "transparent"; }
  if (type === "nogps")   { color = "#e74c3c"; icon = "alert-circle-outline"; bg = "transparent"; }
  if (type === "synced")  { color = palette.accentGreen; icon = "checkmark"; bg = "rgba(31,190,87,0.1)"; }
  if (type === "queued")  { color = "#f39c12"; icon = "time-outline"; bg = "rgba(243,156,18,0.1)"; }
  if (type === "failed")  { color = "#e74c3c"; icon = "alert-circle-outline"; bg = "rgba(231,76,60,0.1)"; }
  if (type === "manual")  { color = "#9b59b6"; icon = "alert-circle-outline"; bg = "rgba(155,89,182,0.1)"; }
  if (type === "syncing") { color = palette.accentBlue; icon = "sync-outline"; bg = "rgba(46,168,255,0.1)"; }

  return (
    <View style={[styles.badgeLine, { borderColor: color, backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[styles.badgeText, { color: color, marginLeft: 2 }]}>{text}</Text>
    </View>
  );
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  
  if (isToday) return `Today • ${timeStr}`;
  
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${dateStr} • ${timeStr}`;
};

const toStatusBadgeType = (status: CollectionCardItem["syncStatus"]) => {
  if (status === "SYNCED") return "synced";
  if (status === "SYNCING") return "syncing";
  if (status === "FAILED") return "failed";
  return "queued";
};

const toGpsBadgeType = (gps: CollectionCardItem["gpsStatus"]) => {
  if (gps === "GPS") return "gps";
  return "nogps";
};

// ─────────────────────────────────────────────────────────────
// Notification Types
// ─────────────────────────────────────────────────────────────

type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

// ─────────────────────────────────────────────────────────────
// Notifications Modal
// ─────────────────────────────────────────────────────────────

function NotificationsModal({ visible, onClose, notifications, onClearAll, onDismiss, onTap }: {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onTap: (n: AppNotification) => void;
}) {
  const getIcon = (type: string): { name: any; color: string; bg: string } => {
    if (type?.includes('transport') || type?.includes('TRANSPORT'))
      return { name: 'car-outline', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
    if (type?.includes('approved') || type?.includes('APPROVED'))
      return { name: 'checkmark-circle-outline', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    if (type?.includes('rejected') || type?.includes('REJECTED'))
      return { name: 'close-circle-outline', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (type?.includes('collection') || type?.includes('COLLECTION'))
      return { name: 'leaf-outline', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
    return { name: 'notifications-outline', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday) return `Today ${time}`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + time;
    } catch { return ts; }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: '#0f2035', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: 32, maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="notifications" size={20} color="#f59e0b" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {notifications.length > 0 && (
                <Pressable onPress={onClearAll}>
                  <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600' }}>Clear all</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          </View>

          {/* Tap hint */}
          {notifications.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Tap to open • Swipe X to dismiss</Text>
            </View>
          )}

          {/* List */}
          <ScrollView style={{ paddingHorizontal: 16, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="notifications-off-outline" size={28} color="rgba(255,255,255,0.25)" />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '600' }}>No notifications</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Approved requests will appear here</Text>
              </View>
            ) : (
              notifications.map(n => {
                const icon = getIcon(n.type);
                const isRead = n.read;
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => onTap(n)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                      backgroundColor: pressed
                        ? 'rgba(59,130,246,0.12)'
                        : isRead ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                      borderRadius: 14,
                      padding: 14, marginBottom: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: isRead ? 'rgba(255,255,255,0.12)' : icon.color,
                      opacity: isRead ? 0.65 : 1,
                    })}
                  >
                    {/* Icon */}
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isRead ? 'rgba(255,255,255,0.06)' : icon.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ionicons name={icon.name} size={18} color={isRead ? 'rgba(255,255,255,0.3)' : icon.color} />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Text style={{ color: isRead ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>{n.title}</Text>
                        {!isRead && (
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                        )}
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 17 }}>{n.message}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{formatTime(n.timestamp)}</Text>
                        {!isRead && (
                          <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600' }}>Tap to view →</Text>
                        )}
                      </View>
                    </View>

                    {/* Dismiss X */}
                    <Pressable
                      onPress={() => onDismiss(n.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 2 }}
                    >
                      <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.2)" />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Screen
// ─────────────────────────────────────────────────────────────

export function DashboardScreen({ user, role, navigation, token, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const initials = user?.fullName?.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const [historyItems, setHistoryItems] = useState<CollectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobCount, setJobCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevJobCount = useRef(0);

  const fetchJobCount = useCallback(async () => {
    if (!token || !user?.userId) return;
    try {
      const params = new URLSearchParams();
      params.set("assignedAgentId", String(user.userId || user.id));
      params.set("requestType", "TRANSPORT");
      params.set("status", "APPROVED_BY_EXT");
      const data = await apiGet<any[]>(`${ServicesAPI.createRequest}?${params.toString()}`, token);
      if (Array.isArray(data)) {
        const count = data.length;
        setJobCount(count);
        // Add a notification entry for each new approved transport request
        if (count > prevJobCount.current) {
          const newNotes: AppNotification[] = data.slice(0, count - prevJobCount.current).map((req: any) => ({
            id: req.requestId || String(Date.now() + Math.random()),
            type: 'service_request_approved_TRANSPORT',
            title: '🚛 Transport Request Approved',
            message: `Transport request for ${req.supplierName || 'a supplier'} has been approved${req.approverName ? ` by ${req.approverName}` : ''} and is ready for dispatch.`,
            timestamp: req.updatedAt || req.requestDate || new Date().toISOString(),
            read: false,
          }));
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const fresh = newNotes.filter(n => !existingIds.has(n.id));
            return [...fresh, ...prev];
          });
        }
        prevJobCount.current = count;
      }
    } catch (err) {
      console.log("Failed to fetch job count", err);
    }
  }, [token, user?.userId]);

  const loadData = useCallback(async () => {
    if (!token || !user?.userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch queue only for THIS agent
      const offlineQueue = await getOfflineCollections(user.userId);
      
      let serverHistory: ApiCollectionHistory[] = [];
      try {
        const data = await apiGet<ApiCollectionHistory[]>(`${CollectionAPI.agentHistory(user.userId)}?limit=60`, token);
        serverHistory = Array.isArray(data) ? data : [];
      } catch (e) {
        console.log("Server sync unreachable, showing local queue only.");
      }

      const serverItems: CollectionCardItem[] = serverHistory.map((item) => ({
        key: item.collectionId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        passbookNo: item.passbookNo,
        grossWeight: Number(item.grossWeight || 0),
        netWeight: item.netWeight !== undefined ? Number(item.netWeight) : undefined,
        collectedAt: item.collectedAt,
        syncStatus: item.syncStatus,
        gpsStatus: item.gpsStatus,
        manualOverride: !!item.manualOverride,
      }));

      const queuedItems: CollectionCardItem[] = offlineQueue.map((item) => ({
        key: item.clientRef,
        supplierId: item.supplierId,
        supplierName: item.supplierName || "Unknown Supplier",
        passbookNo: item.passbookNo,
        grossWeight: Number(item.grossWeight || 0),
        collectedAt: item.collectedAt,
        syncStatus: item.syncStatus,
        gpsStatus: item.gpsStatus,
        manualOverride: item.manualOverride,
      }));

      const merged = [...queuedItems, ...serverItems].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );
      setHistoryItems(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      fetchJobCount();
    }, [loadData, fetchJobCount])
  );

  useEffect(() => {
    fetchJobCount();
    const interval = setInterval(fetchJobCount, 30000);
    return () => clearInterval(interval);
  }, [fetchJobCount]);

  const pendingSync = useMemo(
    () => historyItems.filter((item) => item.syncStatus === "QUEUED" || item.syncStatus === "FAILED" || item.syncStatus === "SYNCING").length,
    [historyItems]
  );

  const todayKg = useMemo(() => {
    const now = new Date();
    const val = historyItems
      .filter((item) => {
        const d = new Date(item.collectedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      })
      .reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
    return Math.round(val * 1000) / 1000;
  }, [historyItems]);

  const monthKg = useMemo(() => {
    const now = new Date();
    const val = historyItems
      .filter((item) => {
        const d = new Date(item.collectedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
    return Math.round(val * 1000) / 1000;
  }, [historyItems]);

  const supplierCount = useMemo(() => new Set(historyItems.map((item) => item.supplierId)).size, [historyItems]);

  const kpis = [
    { label: "KG Today", value: `${todayKg} kg`, icon: "leaf-outline" as const, color: palette.accentGreen },
    { label: "Suppliers", value: `${supplierCount}`, icon: "people-outline" as const, color: palette.accentBlue },
    { label: "Pending Sync", value: `${pendingSync}`, icon: "cloud-upload-outline" as const, color: "#f39c12" },
    { label: "This Month", value: `${monthKg} kg`, icon: "stats-chart-outline" as const, color: "#9b59b6" },
  ];

  const recent = historyItems.slice(0, 3);

  const todayItems = useMemo(() => {
    const now = new Date();
    return historyItems.filter((item) => {
      const d = new Date(item.collectedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
  }, [historyItems]);

  const todaySuppliersCount = useMemo(() => new Set(todayItems.map((i) => i.supplierId)).size, [todayItems]);

  const avatarColors = ["#3498db", "#2ecc71", "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c", "#f39c12", "#2980b9"];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  // ── Mock data for screenshots / documentation (set false to use real data) ──
  const MOCK_MODE = false;
  const mockCollections: CollectionCardItem[] = [
    { key: "m1", supplierId: "s1", supplierName: "Jayasekara Ranjith",  passbookNo: "SH-0142", grossWeight: 87.5,  collectedAt: new Date(Date.now() - 1*60*60*1000).toISOString(), syncStatus: "SYNCED",  gpsStatus: "GPS",    manualOverride: false },
    { key: "m2", supplierId: "s2", supplierName: "Perera Dhammika",     passbookNo: "SH-0089", grossWeight: 124.0, collectedAt: new Date(Date.now() - 2*60*60*1000).toISOString(), syncStatus: "QUEUED", gpsStatus: "GPS",    manualOverride: false },
    { key: "m3", supplierId: "s3", supplierName: "Silva Mahinda",       passbookNo: "SH-0056", grossWeight: 62.0,  collectedAt: new Date(Date.now() - 3*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "NO_GPS", manualOverride: true  },
    { key: "m4", supplierId: "s4", supplierName: "Kumari Nilanthi",     passbookNo: "SH-0203", grossWeight: 95.5,  collectedAt: new Date(Date.now() - 4*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "GPS",    manualOverride: false },
  ];

  const displayItems  = MOCK_MODE ? mockCollections : todayItems;
  const displayKgToday      = MOCK_MODE ? 369.0 : todayKg;
  const displayPendingSync  = MOCK_MODE ? 1      : pendingSync;
  const displaySupToday     = MOCK_MODE ? 4      : todaySuppliersCount;
  const displaySupTotal     = MOCK_MODE ? 20     : supplierCount;

  const lastSyncText = displayPendingSync === 0 ? "just now" : `${displayPendingSync} pending`;

  return (
    <View style={styles.dashboardWrap}>
      {/* ── Header ── */}
      <SafeAreaView style={{ backgroundColor: "#0b1a30" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 }}>
          {/* Avatar */}
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "#1fbe57", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 17 }}>{initials}</Text>
          </View>
          {/* Title */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>{_("Transport Agent")}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{user?.fullName || "Agent"}</Text>
          </View>
          {/* Icons */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="wifi-outline" size={20} color={palette.muted} />
            </View>
            <Pressable 
              onPress={() => setShowNotifications(true)}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: showNotifications ? 'rgba(245,158,11,0.2)' : "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name={notifications.some(n => !n.read) ? 'notifications' : 'notifications-outline'} size={20} color={notifications.some(n => !n.read) ? '#f59e0b' : palette.muted} />
              {notifications.some(n => !n.read) && (
                <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0b1a30' }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{notifications.filter(n => !n.read).length}</Text>
                </View>
              )}
            </Pressable>

            {/* Notifications Modal */}
            <NotificationsModal
              visible={showNotifications}
              onClose={() => setShowNotifications(false)}
              notifications={notifications}
              onClearAll={() => setNotifications([])}
              onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
              onTap={(n) => {
                // Mark as read
                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                // Navigate based on type
                setShowNotifications(false);
                if (n.type?.includes('TRANSPORT') || n.type?.includes('transport')) {
                  navigation.navigate('Requests', { tab: 'Transport' });
                }
              }}
            />
            <Pressable onPress={() => navigation.navigate("Login")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out-outline" size={20} color={palette.muted} />
            </Pressable>
          </View>
        </View>

        {/* Online / Sync bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(31,190,87,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(31,190,87,0.25)" }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#1fbe57" }} />
            <Text style={{ color: "#1fbe57", fontSize: 12, fontWeight: "700" }}>{_("Online")}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="checkmark" size={14} color={palette.accentBlue} />
            <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{_("Synced")}</Text>
          </View>
          <Text style={{ color: palette.muted, fontSize: 12, marginLeft: "auto" }}>{_("Last sync")}: {lastSyncText}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ── KPI Cards ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {/* Today's Leaf */}
          <Pressable 
            onPress={() => navigation.navigate("Collections")}
            style={({pressed}) => [{ 
              flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: "#1fbe57", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
              opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }]
            }]}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(31,190,87,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <MaterialCommunityIcons name="leaf" size={18} color="#1fbe57" />
            </View>
            <Text style={{ color: "#fff", fontSize: 21, fontWeight: "800" }}>{displayKgToday} kg</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>{_("TODAY'S LEAF")}</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{displaySupToday} {_("suppliers")}</Text>
          </Pressable>

          {/* Pending Sync */}
          <Pressable 
            onPress={() => navigation.navigate("Collections")}
            style={({pressed}) => [{ 
              flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: "#f39c12", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
              opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }]
            }]}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(243,156,18,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ionicons name="time-outline" size={18} color="#f39c12" />
            </View>
            <Text style={{ color: "#fff", fontSize: 21, fontWeight: "800" }}>{displayPendingSync}</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>{_("PENDING SYNC")}</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{_("records queued")}</Text>
          </Pressable>

          {/* Route Progress */}
          <Pressable 
            onPress={() => navigation.navigate("SupplierList", { user, token, lang })}
            style={({pressed}) => [{ 
              flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: palette.accentBlue, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
              opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }]
            }]}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(46,168,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ionicons name="location-outline" size={18} color={palette.accentBlue} />
            </View>
            <Text style={{ color: "#fff", fontSize: 21, fontWeight: "800" }}>{displaySupToday}/{displaySupTotal || "—"}</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>{_("ROUTE PROGRESS")}</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{displaySupTotal > 0 ? `${Math.round((displaySupToday / displaySupTotal) * 100)}% ${_("complete")}` : _("No data")}</Text>
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>{_("QUICK ACTIONS")}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <Pressable
            onPress={() => navigation.navigate("CollectionInput", { token, user, lang })}
            style={{ flex: 1, backgroundColor: "#1fbe57", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0px 6px 10px rgba(31, 190, 87, 0.35)", elevation: 8 }}
          >
            <Ionicons name="add" size={26} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{_("New Collection")}</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Collections")}
            style={{ flex: 1, backgroundColor: "#2563eb", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0px 6px 10px rgba(37, 99, 235, 0.35)", elevation: 8 }}
          >
            <Ionicons name="search-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{_("View History")}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => navigation.navigate("SupplierList", { user, token, lang })}
            style={{ flex: 1, backgroundColor: "#7c3aed", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0px 6px 10px rgba(124, 58, 237, 0.35)", elevation: 8 }}
          >
            <Ionicons name="list-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{_("Supplier List")}</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Requests")}
            style={{ flex: 1, backgroundColor: "#d97706", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0px 6px 10px rgba(217, 119, 6, 0.35)", elevation: 8 }}
          >
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{_("Requests")}</Text>
          </Pressable>
        </View>

        {/* ── Today's Collections ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.sectionHeader}>{_("Today's Collections")}</Text>
          <Pressable onPress={() => navigation.navigate("Collections")}>
            <Text style={{ color: palette.accentBlue, fontSize: 13, fontWeight: "600" }}>{_("See All")} →</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={palette.accentBlue} />
          </View>
        )}

        {!loading && displayItems.length === 0 && (
          <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <MaterialCommunityIcons name="leaf-off" size={28} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 8 }}>{_("No collections today yet")}</Text>
          </View>
        )}

        {!loading && displayItems.map((item, idx) => {
          const initial = (item.supplierName || "?").charAt(0).toUpperCase();
          const avatarBg = getAvatarColor(item.supplierName || "A");
          const isSynced = item.syncStatus === "SYNCED";
          const isGPS = item.gpsStatus === "GPS";
          // Format name as "Surname, Initial."
          const nameParts = (item.supplierName || "").split(" ");
          const displayName = nameParts.length >= 2
            ? `${nameParts[nameParts.length - 1]}, ${nameParts[0].charAt(0)}.`
            : item.supplierName;
          return (
            <Pressable key={item.key || idx}
              onPress={() => navigation.navigate("CollectionDetail", { item, token, lang })}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", opacity: pressed ? 0.75 : 1 }]}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: avatarBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{displayName}</Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 5 }}>{item.passbookNo || "—"}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isGPS ? "rgba(31,190,87,0.12)" : "rgba(255,255,255,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Ionicons name="location" size={10} color={isGPS ? "#1fbe57" : palette.muted} />
                    <Text style={{ color: isGPS ? "#1fbe57" : palette.muted, fontSize: 10, fontWeight: "600" }}>GPS</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isSynced ? "rgba(31,190,87,0.12)" : "rgba(243,156,18,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Ionicons name={isSynced ? "checkmark" : "time-outline"} size={10} color={isSynced ? "#1fbe57" : "#f39c12"} />
                    <Text style={{ color: isSynced ? "#1fbe57" : "#f39c12", fontSize: 10, fontWeight: "600" }}>{isSynced ? "Synced" : "Queued"}</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: isSynced ? "#1fbe57" : "#fff", fontSize: 15, fontWeight: "800" }}>{Number(item.grossWeight)} kg</Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{formatDateTime(item.collectedAt)}</Text>
              </View>
            </Pressable>
          );
        })}

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Collections Screen
// ─────────────────────────────────────────────────────────────

export function CollectionsScreen({ navigation, user, token, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [historyItems, setHistoryItems] = useState<CollectionCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !user?.userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Always get offline queue only for THIS agent
      const offlineQueue = await getOfflineCollections(user.userId);
      
      let serverHistory: ApiCollectionHistory[] = [];
      try {
        const data = await apiGet<ApiCollectionHistory[]>(`${CollectionAPI.agentHistory(user.userId)}?limit=250`, token);
        serverHistory = Array.isArray(data) ? data : [];
      } catch (e) {
        console.log("Server sync unreachable for Collections tab. Showing local queue.");
      }

      const serverItems: CollectionCardItem[] = serverHistory.map((item) => ({
        key: item.collectionId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        passbookNo: item.passbookNo,
        grossWeight: Number(item.grossWeight || 0),
        netWeight: item.netWeight !== undefined ? Number(item.netWeight) : undefined,
        collectedAt: item.collectedAt,
        syncStatus: item.syncStatus,
        gpsStatus: item.gpsStatus,
        manualOverride: !!item.manualOverride,
      }));

      const queuedItems: CollectionCardItem[] = offlineQueue.map((item) => ({
        key: item.clientRef,
        supplierId: item.supplierId,
        supplierName: item.supplierName || "Unknown Supplier",
        passbookNo: item.passbookNo,
        grossWeight: Number(item.grossWeight || 0),
        collectedAt: item.collectedAt,
        syncStatus: item.syncStatus,
        gpsStatus: item.gpsStatus,
        manualOverride: item.manualOverride,
      }));

      const merged = [...queuedItems, ...serverItems].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );
      setHistoryItems(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pendingCount = useMemo(
    () => historyItems.filter((item) => item.syncStatus === "QUEUED" || item.syncStatus === "FAILED" || item.syncStatus === "SYNCING").length,
    [historyItems]
  );

  const filtered = useMemo(() => {
    return historyItems.filter((item) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Synced" && item.syncStatus === "SYNCED") ||
        (activeTab === "Queued" && (item.syncStatus === "QUEUED" || item.syncStatus === "SYNCING")) ||
        (activeTab === "Failed" && item.syncStatus === "FAILED");

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.supplierName.toLowerCase().includes(q) ||
        (item.passbookNo || "").toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, search, historyItems]);

  const handleSync = async () => {
    if (!token) {
      Alert.alert("Session Error", "Please login again.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncQueuedCollections(token, user.userId);
      await loadData();
      Alert.alert("Sync Complete", `Synced: ${result.synced}  Failed: ${result.failed}`);
    } catch (err: any) {
      Alert.alert("Sync Error", err?.message ?? "Failed to sync queued collections.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Collections")}</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="qr-code-outline" size={20} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={palette.muted} />
          <TextInput
            placeholder={_("Search by name or passbook...")}
            placeholderTextColor={palette.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.cardItemSub}>{_("Pending sync")}: {pendingCount}</Text>
          <Pressable
            style={[styles.filterChip, { borderColor: palette.accentBlue }]}
            onPress={handleSync}
            disabled={isSyncing || pendingCount === 0}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={palette.accentBlue} />
            ) : (
              <Text style={[styles.filterChipText, { color: pendingCount > 0 ? palette.accentBlue : palette.muted }]}>{_("Sync Queue")}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {["All", "Synced", "Queued", "Failed"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActive]}>{_(tab)}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {isLoading && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color={palette.accentBlue} />
            </View>
          )}

          {!isLoading && filtered.length === 0 && (
            <View style={styles.collectionItemCard}>
              <Text style={styles.cardItemSub}>{_("No collections found")}</Text>
            </View>
          )}

          {!isLoading && filtered.map((item, idx) => (
            <Pressable key={idx} style={styles.collectionItemCard} onPress={() => navigation.navigate("CollectionDetail", { item, token, lang })}>
              <View style={[styles.collectionAvatarCompact, { backgroundColor: "#2ea8ff" }]}>
                <Text style={styles.collectionAvatarText}>{(item.supplierName || "?").substring(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>{item.supplierName}</Text>
                <Text style={styles.cardItemSub}>{item.passbookNo || _("Passbook unavailable")}</Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <StatusBadge type={toGpsBadgeType(item.gpsStatus)} text={item.gpsStatus === "GPS" ? "GPS" : "No GPS"} />
                  <StatusBadge type={toStatusBadgeType(item.syncStatus)} text={item.syncStatus.charAt(0) + item.syncStatus.slice(1).toLowerCase()} />
                  {item.manualOverride && <StatusBadge type="manual" text={_("Manual")} />}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardWeight}>{item.grossWeight} kg</Text>
                <Text style={styles.cardTime}>{formatDateTime(item.collectedAt)}</Text>
              </View>
            </Pressable>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Requests Screen
// ─────────────────────────────────────────────────────────────

export function RequestsScreen({ navigation, route, user, token, role, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Advance");

  // Switch to tab if navigated with a tab param (e.g. from notification tap)
  useFocusEffect(
    useCallback(() => {
      const tabParam = route?.params?.tab;
      if (tabParam) setActiveTab(tabParam);
    }, [route?.params?.tab])
  );
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Request Form State
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formSupplier, setFormSupplier] = useState<any>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formItemType, setFormItemType] = useState("");
  const [formItemId, setFormItemId] = useState("");
  const [fertilizerItems, setFertilizerItems] = useState<Array<{ type: string; quantity: string; itemId?: string }>>([]);
  const [toolItems, setToolItems] = useState<Array<{ type: string; quantity: string; itemId?: string }>>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formDays, setFormDays] = useState("");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const addItemBlink = useRef(new Animated.Value(1)).current;
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const [toolViewMode, setToolViewMode] = useState<"TOOL_PURCHASE" | "TOOL_RENT">("TOOL_PURCHASE");

  let requestType = "ADVANCE";
  if (activeTab === "Fertilizer") requestType = "FERTILIZER";
  if (activeTab === "Transport") requestType = "TRANSPORT";
  if (activeTab === "Tools") requestType = toolViewMode;
  if (activeTab === "Leaf Bags") requestType = "LEAF_BAG";
  if (activeTab === "Advisory") requestType = "ADVISORY";

  useEffect(() => {
    const shouldBlink =
      activeTab === "Fertilizer" &&
      (formItemType.trim() !== "" || formQuantity.trim() !== "");

    if (!shouldBlink) {
      addItemBlink.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(addItemBlink, {
          toValue: 0.35,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(addItemBlink, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [activeTab, addItemBlink, formItemType, formQuantity]);

  const loadRequests = useCallback(async () => {
    if (!token || !user?.userId) return;
    setLoading(true);
    try {
      if (role === 'supplier') {
        // Suppliers: fetch by their supplierId
        const params = new URLSearchParams();
        const sid = user.supplierId || user.userId || user.id;
        params.set("supplierId", String(sid));
        if (user.passbookNo) params.set("passbookNo", user.passbookNo);
        params.set("requestType", requestType);
        params.set("size", "120");
        const data = await apiGet<any[]>(`${ServicesAPI.createRequest}?${params.toString()}`, token);
        const sorted = Array.isArray(data) ? data.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()) : [];
        setItems(sorted);
      } else {
        // Agents: fetch BOTH requests assigned to them AND requests they created themselves
        // This ensures self-submitted pending requests appear alongside approved assigned ones
        // Fetch requests without type filter and filter on frontend to bypass backend query limitations
        const agentId = String(user.userId || user.id);
        const url = `${ServicesAPI.createRequest}?limit=200`;
        console.log("[Agent Requests] Fetching:", url);
        
        let allData: any[] = [];
        try {
          const result = await apiGet<any[]>(url, token);
          allData = Array.isArray(result) ? result : [];
          console.log("[Agent Requests] Got", allData.length, "records");
          if (allData.length > 0) console.log("[Agent Requests] Sample:", JSON.stringify(allData[0]));
        } catch (fetchErr: any) {
          console.error("[Agent Requests] Fetch FAILED:", fetchErr?.message);
        }

        // Merge and deduplicate by requestId
        const seen = new Set<string>();
        const merged = (allData || [])
          .filter(item => {
            if (seen.has(item.requestId)) return false;
            seen.add(item.requestId);
            // Filter by active tab's request type!
            if (item.requestType !== requestType) return false;
            
            // Unified rule for ALL categories:
            // If THIS agent created the request → show regardless of status (they track their own submissions)
            if (String(item.createdById) === agentId) return true;
            
            // Otherwise (supplier/direct request) → only show when approved and assigned to this agent
            const isApproved = item.status === 'APPROVED' || item.status === 'APPROVED_BY_EXT' || item.status === 'DISPATCHED' || item.status === 'COMPLETED';
            const isAssignedToMe = String(item.assignedAgentId) === agentId;
            return isApproved && isAssignedToMe;
          })
          .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

        setItems(merged);
      }
    } catch (err: any) {
      Alert.alert("Request Error", err?.message || "Failed to load requests.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [requestType, token, user?.userId, role]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  useEffect(() => {
    loadRequests();
  }, [requestType]);

  const fetchSuppliers = async (query: string) => {
    setSuppliersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (query.trim()) params.set("search", query.trim());
      if (user?.estateId) params.set("estateId", String(user.estateId));
      
      const data = await apiGet<any[]>(`${CollectionAPI.suppliers}?${params.toString()}`, token);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      // Background fail safe
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const data = await apiGet<any[]>(ServicesAPI.inventory, token);
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch {
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const openForm = () => {
    if (role === "supplier") {
      setFormSupplier({
        supplierId: user?.supplierId || user?.userId || user?.id,
        fullName: user?.fullName || "Supplier",
        passbookNo: user?.passbookNo || user?.passbook_no || "N/A",
        estateId: user?.estateId
      });
    } else {
      setFormSupplier(null);
    }
    setFormAmount("");
    setFormQuantity("");
    setFormItemType("");
    setFormItemId("");
    setFertilizerItems([]);
    setToolItems([]);
    setFormNotes("");
    setFormDays("");
    setSearchQuery("");
    setShowForm(true);
    if (role !== "supplier") fetchSuppliers("");
    fetchInventory();
  };

  const submitRequest = async () => {
    if (!formSupplier) {
      Alert.alert("Required", "Please select a supplier first.");
      return;
    }
    const amount = Number(formAmount.replace(/,/g, ""));
    if (activeTab === "Advance" && (Number.isNaN(amount) || amount <= 0)) {
      Alert.alert("Required", "Please enter a valid request amount.");
      return;
    }
    const normalizedFertilizerItems = fertilizerItems
      .map((item) => ({
        type: item.type.trim(),
        quantity: Number(item.quantity),
        itemId: item.itemId,
      }))
      .filter((item) => item.type && !Number.isNaN(item.quantity) && item.quantity > 0);

    const normalizedToolItems = toolItems
      .map((item) => ({
        type: item.type.trim(),
        quantity: Number(item.quantity),
        itemId: item.itemId,
      }))
      .filter((item) => item.type && !Number.isNaN(item.quantity) && item.quantity > 0);

    if (activeTab === "Fertilizer" && normalizedFertilizerItems.length === 0) {
      Alert.alert("Required", "Please save at least one fertilizer item.");
      return;
    }

    if (activeTab === "Fertilizer" && formItemType.trim() && formQuantity.trim()) {
      Alert.alert("Save Current Item", "You have an unsaved fertilizer item. Click 'Add Item' or clear the inputs before submitting.");
      return;
    }

    if (activeTab === "Tools" && normalizedToolItems.length === 0) {
      Alert.alert("Required", "Please save at least one tool item.");
      return;
    }

    if (activeTab === "Tools" && formItemType.trim() && formQuantity.trim()) {
      Alert.alert("Save Current Item", "You have an unsaved tool item. Click 'Add Item' or clear the inputs before submitting.");
      return;
    }

    const leafBagQty = Number(formQuantity);
    if (activeTab === "Leaf Bags" && (Number.isNaN(leafBagQty) || leafBagQty <= 0)) {
      Alert.alert("Required", "Please enter the number of leaf bags needed.");
      return;
    }

    setCreating(true);
    try {
      const totalFertilizerQuantity = normalizedFertilizerItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalToolQuantity = normalizedToolItems.reduce((sum, item) => sum + item.quantity, 0);
      const daysCount = activeTab === "Tools" && toolViewMode === "TOOL_RENT" ? Number(formDays) : (activeTab === "Advisory" ? 0 : null);
      
      await apiPost(
        ServicesAPI.createRequest,
        {
          supplierId: formSupplier.supplierId,
          supplierName: formSupplier.fullName || "Unknown Supplier",
          passbookNo: formSupplier.passbookNo || "No passbook",
          createdById: user.userId,
          requestType: requestType,
          requestedAmount: activeTab === "Advance" ? amount : 0,
          quantity: activeTab === "Fertilizer" ? totalFertilizerQuantity : (activeTab === "Tools" ? totalToolQuantity : (activeTab === "Leaf Bags" ? leafBagQty : null)),
          itemType: activeTab === "Fertilizer" ? (normalizedFertilizerItems[0]?.type || formItemType) : (activeTab === "Tools" ? (normalizedToolItems[0]?.type || formItemType) : (activeTab === "Leaf Bags" ? formItemType : formItemType)),
          itemId: activeTab === "Fertilizer" ? (normalizedFertilizerItems[0]?.itemId || formItemId || undefined) : (activeTab === "Tools" ? (normalizedToolItems[0]?.itemId || formItemId || undefined) : (activeTab === "Leaf Bags" ? formItemId || undefined : undefined)),
          itemDetails: activeTab === "Fertilizer" ? JSON.stringify(normalizedFertilizerItems) : (activeTab === "Tools" ? JSON.stringify(normalizedToolItems) : undefined),
          creatorName: user.fullName || "Agent",
          creatorId: user.employeeId || "No ID",
          days: daysCount,
          notes: formNotes.trim(),
        },
        token
      );
      setShowForm(false);
      loadRequests();
    } catch (err: any) {
      Alert.alert("Request Error", err?.message || "Failed to submit request.");
    } finally {
      setCreating(false);
    }
  };

  const saveFertilizerItem = () => {
    const type = formItemType.trim();
    const quantity = Number(formQuantity);
    if (!type || Number.isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Item", "Enter a valid fertilizer type and quantity, then save.");
      return;
    }
    setFertilizerItems((prev) => [...prev, { type, quantity: String(quantity), itemId: formItemId }]);
    setFormItemType("");
    setFormQuantity("");
    setFormItemId("");
  };

  const saveToolItem = () => {
    const type = formItemType.trim();
    const quantity = Number(formQuantity);
    if (!type || Number.isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Item", "Enter a valid tool type and quantity, then save.");
      return;
    }
    setToolItems((prev) => [...prev, { type, quantity: String(quantity), itemId: formItemId }]);
    setFormItemType("");
    setFormQuantity("");
    setFormItemId("");
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      "Remove Request",
      "Are you sure you want to remove this request?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              await apiPatch(
                ServicesAPI.updateStatus(requestId),
                { status: "CANCELLED", approverId: user.userId },
                token
              );
              loadRequests();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to cancel request.");
            }
          }
        }
      ]
    );
  };

  const statusColor = (status: string) => {
    if (status.startsWith("APPROVED") || status === "DISPATCHED") return palette.accentGreen;
    if (status === "PENDING") return "#f39c12";
    return "#e74c3c";
  };

  const parseItemDetails = (raw: any) => {
    if (!raw) return [] as Array<{ type?: string; quantity?: number | string }>;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getCleanCardNote = (request: any) => {
    const raw = String(request?.notes || "").trim();
    if (!raw) return "";

    const [leftPart] = raw.split(" | ");
    let note = (leftPart || "").trim();

    note = note
      .replace(/Requested via Mobile by .*$/i, "")
      .replace(/Requested via Mobile.*$/i, "")
      .trim();

    if (request?.requestType === "FERTILIZER" || String(request?.requestType || "").startsWith("TOOL_")) {
      const source = note || raw;
      note = source
        .replace(/\b[^,|()]+\(\s*\d+(?:\.\d+)?\s*(?:kg|units?)\s*\)/gi, "")
        .replace(/[|,]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    return note;
  };

  let placeholderTxt = "Specific request details...";
  if (activeTab === "Advance") placeholderTxt = "Reason for advance...";
  if (activeTab === "Fertilizer") placeholderTxt = "Specific fertilizer requirements...";
  if (activeTab === "Transport") placeholderTxt = "Destination, date, cargo...";
  if (activeTab === "Tools") {
    placeholderTxt = toolViewMode === "TOOL_PURCHASE" ? "Which tools to purchase, quantity..." : "Which tools to rent, duration...";
  }
  if (activeTab === "Leaf Bags") placeholderTxt = "Any specific bag requirements...";
  if (activeTab === "Advisory") placeholderTxt = "Describe your advisory request...";

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{role === 'supplier' ? _('Direct Requests') : _('Logistics & Requests')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>{_("REQUEST CATEGORY")}</Text>
        <View style={{ backgroundColor: "#0b192c", borderRadius: 16, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 8 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
                          { id: "Advance",    icon: "wallet-outline",      isMaterial: false, color: "#f39c12" },
              { id: "Fertilizer", icon: "leaf",                isMaterial: true,  color: "#1fbe57" },
              { id: "Transport",  icon: "truck-delivery",      isMaterial: true,  color: "#9b59b6" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const bgColor = isActive ? `${tab.color}30` : `${tab.color}14`;
              const borderColor = isActive ? `${tab.color}66` : `${tab.color}25`;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setActiveTab(tab.id);
                  }}
                  style={{ flex: 1, flexDirection: "column", height: 80, justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent", borderWidth: 1, borderColor: isActive ? `${tab.color}33` : "transparent" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}>
                    {tab.isMaterial
                      ? <MaterialCommunityIcons name={tab.icon as any} size={20} color={tab.color} />
                      : <Ionicons name={tab.icon as any} size={20} color={tab.color} />}
                  </View>
                  <Text style={{ color: isActive ? tab.color : palette.muted, fontSize: 11, fontWeight: isActive ? "700" : "500", textAlign: "center" }}>
                    {_(tab.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
                            { id: "Tools",     icon: "hammer-outline",              isMaterial: false, color: "#e67e22" },
              { id: "Leaf Bags", icon: "bag-handle-outline",          isMaterial: false, color: "#2ea8ff" },
              { id: "Advisory",  icon: "chatbubble-ellipses-outline", isMaterial: false, color: "#1abc9c" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const bgColor = isActive ? `${tab.color}30` : `${tab.color}14`;
              const borderColor = isActive ? `${tab.color}66` : `${tab.color}25`;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setActiveTab(tab.id);
                  }}
                  style={{ flex: 1, flexDirection: "column", height: 80, justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent", borderWidth: 1, borderColor: isActive ? `${tab.color}33` : "transparent" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={tab.icon as any} size={20} color={tab.color} />
                  </View>
                  <Text style={{ color: isActive ? tab.color : palette.muted, fontSize: 11, fontWeight: isActive ? "700" : "500", textAlign: "center" }}>
                    {_(tab.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {role === "supplier" && (
          <Pressable 
            onPress={openForm} 
            style={({ pressed }) => [
              {
                backgroundColor: palette.accentGreen,
                paddingVertical: 14,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 20,
                elevation: 4,
                boxShadow: "0px 4px 8px rgba(31, 190, 87, 0.3)",
              },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
          >
            <Ionicons name="add-circle" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }}>{_("Add new request")}</Text>
          </Pressable>
        )}

        {activeTab === "Tools" && (
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 4, marginBottom: 15 }}>
            <Pressable 
              style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: toolViewMode === "TOOL_PURCHASE" ? palette.accentBlue : "transparent", borderRadius: 6 }}
              onPress={() => setToolViewMode("TOOL_PURCHASE")}
            >
              <Text style={{ color: toolViewMode === "TOOL_PURCHASE" ? "white" : palette.muted, fontWeight: "bold", fontSize: 13 }}>{_("Purchase")}</Text>
            </Pressable>
            <Pressable 
              style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: toolViewMode === "TOOL_RENT" ? palette.accentBlue : "transparent", borderRadius: 6 }}
              onPress={() => setToolViewMode("TOOL_RENT")}
            >
              <Text style={{ color: toolViewMode === "TOOL_RENT" ? "white" : palette.muted, fontWeight: "bold", fontSize: 13 }}>{_("Rent")}</Text>
            </Pressable>
          </View>
        )}

        {role !== "supplier" && (
          <View style={{ marginBottom: 15, gap: 10 }}>
            <Pressable 
              style={{ flexDirection: "row", height: 52, backgroundColor: palette.accentGreen, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8 }}
              onPress={openForm}
            >
              <Ionicons name="add" size={24} color="#111" />
              <Text style={{ color: "#111", fontSize: 16, fontWeight: "bold" }}>{_("Create New Request")}</Text>
            </Pressable>
            <View style={[styles.warningBox, { marginTop: 0, paddingVertical: 10 }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#f39c12" />
              <Text style={styles.warningText}>{_("Only for suppliers under your assignment")}</Text>
            </View>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={palette.accentBlue} />
            </View>
          )}

          {!loading && items.length === 0 && (
            <View style={styles.reqCard}>
              <Text style={styles.cardItemSub}>{_("No requests found")}</Text>
            </View>
          )}

          {!loading && items.map((item) => {
            const fertilizerDetailItems = parseItemDetails(item.itemDetails);
            const hasFertilizerDetailItems = activeTab === "Fertilizer" && fertilizerDetailItems.length > 0;
            const toolDetailItems = parseItemDetails(item.itemDetails);
            const hasToolDetailItems = activeTab === "Tools" && toolDetailItems.length > 0;
            const submittedDate = item.requestDate ? new Date(item.requestDate) : null;
            const submittedTime = submittedDate ? submittedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
            const submittedDateStr = submittedDate ? submittedDate.toLocaleDateString() : "—";
            const toolTypeLabel = String(item.requestType || "").startsWith("TOOL_PURCHASE") ? "Purchase" : String(item.requestType || "").startsWith("TOOL_RENT") ? "Rent" : null;

            const isDirectRequest = item.createdById === item.supplierId || (item.creatorName && item.supplierName && item.creatorName.trim() === item.supplierName.trim());

            return (
            <TouchableOpacity 
              key={item.requestId} 
              style={styles.reqCard} 
              activeOpacity={0.7}
              onPress={() => setSelectedRequest(item)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                <View>
                  <Text style={styles.cardItemTitle}>{item.supplierName || "Supplier"}</Text>
                  <Text style={styles.cardItemSub}>{item.passbookNo || "No passbook"} · {submittedTime}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.requestType === 'TRANSPORT' && item.status === 'APPROVED_BY_EXT' ? 'rgba(31,190,87,0.2)' : "rgba(255,255,255,0.08)" }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(String(item.status || "PENDING")), fontWeight: item.requestType === 'TRANSPORT' && item.status === 'APPROVED_BY_EXT' ? '800' : 'normal' }]}>
                    {item.requestType === 'TRANSPORT' && item.status === 'APPROVED_BY_EXT' 
                      ? _('READY TO FULFILL')
                      : (activeTab === 'Advisory' && String(item.status || '').startsWith('APPROVED') 
                        ? _('RECEIVED') 
                        : _(String(item.status || "PENDING").startsWith('APPROVED') ? 'APPROVED' : String(item.status || "PENDING").replace(/_/g, ' ')))}
                  </Text>
                </View>
              </View>

              <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
                <Text style={{ fontSize: 9, color: palette.muted, fontStyle: 'italic' }}>{_("Tap for more info")}</Text>
              </View>
              {activeTab === "Advance" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.reqCardLabel}>{_("Amount")}</Text>
                  <Text style={styles.reqCardValue}>Rs. {Number(item.requestedAmount || 0).toLocaleString()}</Text>
                </View>
              )}
              {activeTab === "Fertilizer" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.reqCardLabel}>{_("Type")}</Text>
                    <Text style={styles.reqCardValue}>{item.itemType || "Standard"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.reqCardLabel}>{_("Total Quantity")}</Text>
                    <Text style={styles.reqCardValue}>{item.quantity || 0} kg</Text>
                  </View>
                </>
              )}
              {activeTab === "Tools" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.reqCardLabel}>{_("Item")}</Text>
                    <Text style={styles.reqCardValue}>{item.itemType || "Tool"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.reqCardLabel}>{String(item.requestType || "").startsWith("TOOL_RENT") ? _("Rent Days") : _("Units")}</Text>
                    <Text style={styles.reqCardValue}>{item.days || item.quantity || 1}</Text>
                  </View>
                </>
              )}
              {activeTab === "Leaf Bags" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.reqCardLabel}>{_("Bag Type")}</Text>
                    <Text style={styles.reqCardValue}>{item.itemType || "Standard 5kg"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.reqCardLabel}>{_("Quantity")}</Text>
                    <Text style={styles.reqCardValue}>{item.quantity || 0} bags</Text>
                  </View>
                </>
              )}
              {activeTab === "Advisory" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.reqCardLabel}>{_("Topic")}</Text>
                    <Text style={styles.reqCardValue}>{item.itemType || "General Advisory"}</Text>
                  </View>
                  {item.notes && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.reqCardLabel}>{_("Note")}</Text>
                      <Text style={[styles.reqCardValue, { flex: 1, textAlign: 'right', marginLeft: 10 }]} numberOfLines={1}>{item.notes}</Text>
                    </View>
                  )}
                </>
              )}

              {activeTab === "Transport" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.reqCardLabel}>{_("Note")}</Text>
                  <Text style={[styles.reqCardValue, { flex: 1, textAlign: 'right', marginLeft: 10 }]} numberOfLines={1}>{item.notes || _("Standard Transport")}</Text>
                </View>
              )}

              {item.status === "PENDING" && role !== "supplier" ? (
                <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 15 }}>
                  <Pressable 
                    onPress={() => handleCancelRequest(item.requestId)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(231,76,60,0.1)", borderWidth: 1, borderColor: "rgba(231,76,60,0.2)" }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    <Text style={{ color: "#e74c3c", fontSize: 13, fontWeight: "bold" }}>{_("Remove Request")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </TouchableOpacity>
          );})}
          <View style={{ height: 100 }} />
        </ScrollView>

        <Modal visible={!!selectedRequest} transparent animationType="fade" onRequestClose={() => setSelectedRequest(null)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 }}>
            <View style={{ backgroundColor: "#111f38", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{_("Request Info")}</Text>
                <Pressable onPress={() => setSelectedRequest(null)}>
                  <Ionicons name="close" size={24} color={palette.muted} />
                </Pressable>
              </View>

              {selectedRequest && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "bold", textTransform: "uppercase" }}>{_("Supplier Details")}</Text>
                      {/* Source badge: DIRECT if the creator is the supplier themselves */}
                      {(selectedRequest.creatorName && selectedRequest.supplierName && selectedRequest.creatorName.trim().toLowerCase() === selectedRequest.supplierName.trim().toLowerCase()) ? (
                        <View style={{ backgroundColor: "rgba(31,190,87,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(31,190,87,0.3)" }}>
                          <Text style={{ color: palette.accentGreen, fontSize: 10, fontWeight: "bold" }}>⬆ DIRECT REQUEST</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: "rgba(100,160,255,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(100,160,255,0.3)" }}>
                          <Text style={{ color: "#64a0ff", fontSize: 10, fontWeight: "bold" }}>👤 BY AGENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>{selectedRequest.supplierName}</Text>
                    <Text style={{ color: palette.muted, fontSize: 13 }}>PB: {selectedRequest.passbookNo}</Text>
                  </View>

                  <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "bold", textTransform: "uppercase", marginBottom: 8 }}>{_("Request Summary")}</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{_("Type")}</Text>
                      <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>{selectedRequest.requestType?.replace(/_/g, ' ')}</Text>
                    </View>
                    {String(selectedRequest.requestType || "").trim().toUpperCase() === 'TRANSPORT' && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{_("Note")}</Text>
                        <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>{selectedRequest.notes || "Standard Transport"}</Text>
                      </View>
                    )}
                    {!(String(selectedRequest.requestType || "").trim().toUpperCase() === 'TRANSPORT' || String(selectedRequest.requestType || "").trim().toUpperCase() === 'ADVANCE' || String(selectedRequest.requestType || "").trim().toUpperCase() === 'ADVISORY') && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                          {String(selectedRequest.requestType || "").startsWith("TOOL_RENT") ? _("Rent Duration") : _("Quantity/Units")}
                        </Text>
                        <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>
                          {selectedRequest.days || selectedRequest.quantity || 0} {selectedRequest.requestType === 'LEAF_BAG' ? 'bags' : (selectedRequest.requestType === 'FERTILIZER' ? 'kg' : (String(selectedRequest.requestType || "").startsWith("TOOL_RENT") ? 'days' : 'units'))}
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ color: selectedRequest.requestedAmount > 0 ? palette.accentGreen : "#f39c12", fontSize: 13, fontWeight: 'bold' }}>
                        {selectedRequest.requestType === 'ADVANCE' ? _('Requested Amount') : _('Total Deduction')}
                      </Text>
                      <Text style={{ color: selectedRequest.requestedAmount > 0 ? palette.accentGreen : "#f39c12", fontSize: 14, fontWeight: "bold" }}>
                        {selectedRequest.requestedAmount > 0 
                          ? `Rs. ${Number(selectedRequest.requestedAmount).toLocaleString()}`
                          : (selectedRequest.status === 'PENDING' ? _('Awaiting Review') : 'Rs. 0')}
                      </Text>
                    </View>
                    {(selectedRequest.itemType || selectedRequest.specification) && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{_("Specification")}</Text>
                        <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>{selectedRequest.itemType || selectedRequest.specification}</Text>
                      </View>
                    )}
                  </View>

                  {selectedRequest.approverComment && (
                    <View style={{ backgroundColor: `${palette.accentGreen}10`, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: `${palette.accentGreen}20` }}>
                      <Text style={{ color: palette.accentGreen, fontSize: 10, fontWeight: "bold", textTransform: "uppercase", marginBottom: 8 }}>{_("Manager Remarks")}</Text>
                      <Text style={{ color: "white", fontSize: 14, fontStyle: "italic", lineHeight: 22 }}>"{selectedRequest.approverComment}"</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <Text style={{ color: palette.muted, fontSize: 11 }}>{_("Status")}: {_(selectedRequest.status)}</Text>
                    <Text style={{ color: palette.muted, fontSize: 11 }}>{new Date(selectedRequest.requestDate).toLocaleDateString()}</Text>
                  </View>

                  <Pressable 
                    onPress={() => setSelectedRequest(null)}
                    style={{ backgroundColor: palette.accentGreen, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 }}
                  >
                    <Text style={{ color: "#111", fontWeight: "bold" }}>{_("Close Details")}</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* NEW REQUEST MODAL */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#111f38", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: "90%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{_("New")} {_(activeTab)} {_("Request")}</Text>
                <Pressable onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={24} color={palette.muted} />
                </Pressable>
              </View>

              {!formSupplier ? (
                // Step 1: Select Supplier
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>{_("Search Supplier")}</Text>
                  <View style={[styles.inputContainer, { marginBottom: 15 }]}>
                    <Ionicons name="search" size={18} color={palette.muted} style={{ marginLeft: 15 }} />
                    <TextInput
                      style={[styles.inputField, { paddingLeft: 10 }]}
                      placeholder="Name or Passbook (e.g. PB-0088)"
                      placeholderTextColor="#7d93b4"
                      value={searchQuery}
                      autoCapitalize="none"
                      onChangeText={(t) => {
                        setSearchQuery(t);
                        fetchSuppliers(t);
                      }}
                    />
                  </View>
                  
                  {suppliersLoading ? (
                    <ActivityIndicator color={palette.accentBlue} style={{ marginTop: 20 }} />
                  ) : (
                    <ScrollView style={{ maxHeight: 300 }}>
                      {suppliers.map(s => (
                        <Pressable 
                          key={s.supplierId}
                          style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
                          onPress={() => setFormSupplier(s)}
                        >
                          <Text style={{ color: "white", fontSize: 16 }}>{s.fullName}</Text>
                          <Text style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>{s.passbookNo} · {s.landName || "Estate"}</Text>
                        </Pressable>
                      ))}
                      {suppliers.length === 0 && (
                        <Text style={{ color: palette.muted, textAlign: "center", marginTop: 20 }}>{_("No suppliers found")}</Text>
                      )}
                    </ScrollView>
                  )}
                </View>
              ) : (
                // Step 2: Form Details
                <ScrollView>
                  <View style={{ backgroundColor: "rgba(31,190,87,0.1)", padding: 15, borderRadius: 10, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: "white", fontSize: 15, fontWeight: "600" }}>{formSupplier.fullName}</Text>
                      <Text style={{ color: palette.accentGreen, fontSize: 13, marginTop: 4 }}>{formSupplier.passbookNo}</Text>
                    </View>
                    {role !== "supplier" && (
                      <Pressable onPress={() => setFormSupplier(null)} style={{ padding: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6 }}>
                        <Text style={{ color: "white", fontSize: 11 }}>Change</Text>
                      </Pressable>
                    )}
                  </View>

                  {activeTab === "Fertilizer" && (
                    <View style={{ gap: 14, marginBottom: 25 }}>
                      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "bold" }}>Fertilizer Items</Text>

                      <View style={{ gap: 12, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "bold" }}>New Item</Text>
                          <Animated.View style={{ opacity: addItemBlink }}>
                            <Pressable
                              onPress={saveFertilizerItem}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 999,
                                backgroundColor: "rgba(31,190,87,0.2)",
                                borderWidth: 1,
                                borderColor: "rgba(31,190,87,0.45)",
                              }}
                            >
                              <Text style={{ color: palette.accentGreen, fontSize: 12, fontWeight: "bold" }}>Add Item</Text>
                            </Pressable>
                          </Animated.View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1.5 }}>
                            <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Fertilizer Type</Text>
                            <Pressable 
                              style={[styles.inputContainer, { height: 52, paddingHorizontal: 15, justifyContent: "center" }]}
                              onPress={() => setShowItemPicker(true)}
                            > 
                              <Text style={{ color: formItemType ? "white" : "#7d93b4", fontSize: 15, fontWeight: "bold" }}>
                                {formItemType || "Select Type"}
                              </Text>
                              <Ionicons name="chevron-down" size={18} color={palette.muted} style={{ position: "absolute", right: 15 }} />
                            </Pressable>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Quantity (kg)</Text>
                            <View style={[styles.inputContainer, { height: 52 }]}> 
                              <TextInput
                                style={[styles.inputField, { paddingLeft: 15, fontSize: 15, fontWeight: "bold" }]}
                                placeholder="kg"
                                placeholderTextColor="#7d93b4"
                                keyboardType="number-pad"
                                value={formQuantity}
                                onChangeText={setFormQuantity}
                              />
                            </View>
                          </View>
                        </View>
                      </View>

                      {fertilizerItems.length > 0 && (
                        <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                          <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                            <Text style={{ flex: 2, color: palette.muted, fontSize: 11, fontWeight: "bold" }}>Fertilizer</Text>
                            <Text style={{ flex: 1, color: palette.muted, fontSize: 11, fontWeight: "bold", textAlign: "right" }}>Qty (kg)</Text>
                          </View>
                          {fertilizerItems.map((item, idx) => (
                            <View key={`saved-${idx}`} style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: idx === fertilizerItems.length - 1 ? 0 : 1, borderBottomColor: "rgba(255,255,255,0.06)", alignItems: "center" }}>
                              <Text style={{ flex: 2, color: "white", fontSize: 13, fontWeight: "600" }}>{item.type}</Text>
                              <Text style={{ flex: 1, color: palette.accentGreen, fontSize: 13, fontWeight: "700", textAlign: "right" }}>{item.quantity}</Text>
                              <Pressable onPress={() => setFertilizerItems((prev) => prev.filter((_, i) => i !== idx))} style={{ marginLeft: 10 }}>
                                <Ionicons name="trash-outline" size={14} color="#e74c3c" />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
 
                   {activeTab === "Tools" && (
                      <View style={{ gap: 14 }}>
                         <View style={{ backgroundColor: "rgba(243, 156, 18, 0.1)", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "rgba(243, 156, 18, 0.2)" }}>
                            <Text style={{ color: "#f39c12", fontSize: 12, fontWeight: "600", lineHeight: 18 }}>Note: {toolViewMode === "TOOL_PURCHASE" ? "Tool purchases will be billed as debt via the leaf bag deduction route." : "Tool rental charges will be processed separately."}</Text>
                         </View>

                         <View style={{ gap: 14 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                               <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "bold" }}>Tool Items</Text>
                               <Animated.View style={{ opacity: addItemBlink }}>
                                  <Pressable onPress={saveToolItem} style={{ backgroundColor: palette.accentGreen, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                     <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>Add Item</Text>
                                  </Pressable>
                               </Animated.View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 10 }}>
                               <View style={{ flex: 1 }}>
                                  <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Tool Type</Text>
                                  <Pressable 
                                    style={[styles.inputContainer, { height: 48, paddingHorizontal: 12, justifyContent: "center" }]}
                                    onPress={() => setShowItemPicker(true)}
                                  >
                                    <Text style={{ color: formItemType ? "white" : "#7d93b4", fontSize: 14, fontWeight: "600" }}>
                                      {formItemType || "Select Tool"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={palette.muted} style={{ position: "absolute", right: 12 }} />
                                  </Pressable>
                               </View>
                               <View style={{ flex: 0.6 }}>
                                  <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Qty</Text>
                                  <View style={[styles.inputContainer, { height: 48 }]}>
                                     <TextInput
                                     style={[styles.inputField, { paddingLeft: 12, fontSize: 14, fontWeight: "600" }]}
                                     placeholder="5"
                                     placeholderTextColor="#7d93b4"
                                     keyboardType="number-pad"
                                     value={formQuantity}
                                     onChangeText={setFormQuantity}
                                   />
                                 </View>
                               </View>
                             </View>
                             {toolViewMode === "TOOL_RENT" && (
                               <View style={{ marginBottom: 15, marginTop: 10 }}>
                                 <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Rent Duration (Days)</Text>
                                 <View style={[styles.inputContainer, { height: 48 }]}>
                                   <TextInput
                                     style={[styles.inputField, { paddingLeft: 12, fontSize: 14, fontWeight: "600" }]}
                                     placeholder="e.g. 2"
                                     placeholderTextColor="#7d93b4"
                                     keyboardType="number-pad"
                                     value={formDays}
                                     onChangeText={setFormDays}
                                   />
                                 </View>
                               </View>
                             )}

                             {toolItems.length > 0 && (
                               <View style={{ gap: 8, marginTop: 8 }}>
                                 {toolItems.map((item, index) => (
                                   <View
                                    key={index}
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      backgroundColor: "rgba(46, 168, 255, 0.1)",
                                      padding: 12,
                                      borderRadius: 10,
                                      borderWidth: 1,
                                      borderColor: palette.accentBlue + "30",
                                    }}
                                   >
                                     <View style={{ flex: 1 }}>
                                       <Text style={{ fontSize: 11, color: palette.muted, fontWeight: "bold", marginBottom: 3 }}>Item {index + 1}</Text>
                                           <Text style={{ fontSize: 13, fontWeight: "bold", color: "white" }}>{item.type}</Text>
                                     </View>
                                     <Text style={{ fontSize: 13, fontWeight: "bold", color: palette.accentBlue, marginRight: 10 }}>{Number(item.quantity).toLocaleString()} units</Text>
                                     <Pressable onPress={() => setToolItems((prev) => prev.filter((_, i) => i !== index))} style={{ padding: 6 }}>
                                       <MaterialCommunityIcons name="delete-outline" size={18} color="#e74c3c" />
                                     </Pressable>
                                   </View>
                                 ))}
                               </View>
                             )}
                           </View>
                         </View>
                       )}
                  {activeTab === "Advance" && (
                     <>
                      <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Requested Amount (Rs.)</Text>
                      <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                        <Text style={{ color: "white", fontSize: 18, marginLeft: 15, fontWeight: "bold" }}>Rs.</Text>
                        <TextInput
                          style={[styles.inputField, { fontSize: 18, fontWeight: "bold", paddingLeft: 10 }]}
                          placeholder="0"
                          placeholderTextColor="#7d93b4"
                          keyboardType="number-pad"
                          value={formAmount}
                          onChangeText={setFormAmount}
                        />
                      </View>
                    </>
                  )}

                  {activeTab === "Leaf Bags" && (
                    <>
                      <View style={{ backgroundColor: "rgba(46,168,255,0.08)", padding: 12, borderRadius: 10, marginBottom: 18, borderWidth: 1, borderColor: "rgba(46,168,255,0.2)" }}>
                        <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>Leaf bags are factory-issued and will be billed as a debt deducted from your balance payment.</Text>
                      </View>
                      
                      <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Bag Type</Text>
                      <Pressable 
                        style={[styles.inputContainer, { height: 52, paddingHorizontal: 15, justifyContent: "center", marginBottom: 15 }]}
                        onPress={() => setShowItemPicker(true)}
                      > 
                        <Text style={{ color: formItemType ? "white" : "#7d93b4", fontSize: 15, fontWeight: "bold" }}>
                          {formItemType || "Select Bag Type"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={palette.muted} style={{ position: "absolute", right: 15 }} />
                      </Pressable>

                      <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Number of Bags Needed</Text>
                      <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                        <Ionicons name="bag-handle-outline" size={20} color={palette.muted} style={{ marginLeft: 15 }} />
                        <TextInput
                          style={[styles.inputField, { fontSize: 18, fontWeight: "bold", paddingLeft: 10 }]}
                          placeholder="e.g. 5"
                          placeholderTextColor="#7d93b4"
                          keyboardType="number-pad"
                          value={formQuantity}
                          onChangeText={setFormQuantity}
                        />
                      </View>
                    </>
                  )}

                  {activeTab === "Advisory" && (
                    <>
                      <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Query Topic</Text>
                      <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={palette.muted} style={{ marginLeft: 15 }} />
                        <TextInput
                          style={[styles.inputField, { fontSize: 16, fontWeight: "600", paddingLeft: 10 }]}
                          placeholder="e.g. Soil query, Plant disease"
                          placeholderTextColor="#7d93b4"
                          value={formItemType}
                          onChangeText={setFormItemType}
                        />
                      </View>
                    </>
                  )}

                  <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Additional Notes</Text>
                  <View style={[styles.inputContainer, { height: 100, alignItems: "flex-start", paddingTop: 10 }]}>
                    <TextInput
                      style={[styles.inputField, { paddingLeft: 15, height: "100%", width: "100%", textAlignVertical: "top" }]}
                      placeholder={placeholderTxt}
                      placeholderTextColor="#7d93b4"
                      multiline
                      value={formNotes}
                      onChangeText={setFormNotes}
                    />
                  </View>

                  <Pressable 
                    onPress={submitRequest} 
                    disabled={creating}
                    style={({ pressed }) => [
                      styles.primaryBtn, 
                      { marginTop: 30, marginBottom: 20 },
                      pressed && { opacity: 0.8 },
                      creating && { opacity: 0.6 }
                    ]}
                  >
                    {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit {activeTab} Request</Text>}
                  </Pressable>
                </ScrollView>
              )}
            </View>

            {/* ITEM PICKER MODAL */}
            <Modal visible={showItemPicker} animationType="fade" transparent>
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 }}>
                <View style={{ backgroundColor: "#111f38", borderRadius: 20, padding: 20, maxHeight: "70%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>Select {activeTab === "Fertilizer" ? "Fertilizer" : (activeTab === "Tools" ? "Tool" : "Bag")}</Text>
                    <Pressable onPress={() => setShowItemPicker(false)}>
                      <Ionicons name="close" size={22} color={palette.muted} />
                    </Pressable>
                  </View>
                  
                  {inventoryLoading ? (
                    <ActivityIndicator color={palette.accentBlue} style={{ marginVertical: 30 }} />
                  ) : (
                    <ScrollView>
                      {inventoryItems
                        .filter(item => {
                          if (activeTab === "Fertilizer") return item.itemCategory === "FERTILIZER";
                          if (activeTab === "Tools") return item.itemCategory === "TOOLS";
                          if (activeTab === "Leaf Bags") return item.itemCategory === "LEAF_BAG";
                          return false;
                        })
                        .map((item, idx) => (
                          <Pressable 
                            key={idx}
                            onPress={() => {
                              setFormItemType(item.itemName);
                              setFormItemId(item.itemId);
                              setShowItemPicker(false);
                            }}
                            style={{ 
                              paddingVertical: 15, 
                              borderBottomWidth: 1, 
                              borderBottomColor: "rgba(255,255,255,0.05)",
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: "white", fontSize: 15, fontWeight: "600" }}>{item.itemName}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                          </Pressable>
                        ))}
                      {inventoryItems.filter(item => {
                          if (activeTab === "Fertilizer") return item.itemCategory === "FERTILIZER";
                          if (activeTab === "Tools") return item.itemCategory === "TOOLS";
                          if (activeTab === "Leaf Bags") return item.itemCategory === "LEAF_BAG";
                          return false;
                        }).length === 0 && (
                        <Text style={{ color: palette.muted, textAlign: "center", marginTop: 20 }}>No items available in inventory.</Text>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {role !== 'supplier' && (
        <Pressable style={styles.fab} onPress={openForm}>
          <Ionicons name="add" size={30} color="white" />
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile Screen
// ─────────────────────────────────────────────────────────────

export function ProfileScreen({ user, navigation, lang, setLang, token }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const initials = user?.fullName?.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <View style={styles.dashboardWrap}>
      <PinChangeModal 
        visible={showPinModal} 
        onClose={() => setShowPinModal(false)} 
        user={user}
        token={token}
        _={_}
      />
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>{_("Profile")}</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarBig}>
            <Text style={styles.profileAvatarBigText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.fullName || "Agent"}</Text>
          <Text style={styles.profileRole}>Transport Agent · {user?.routeName || "No route assigned"}</Text>
          <View style={styles.profileIdBadge}>
            <Text style={styles.profileIdText}>{user?.employeeId || "TA-XXX"}</Text>
          </View>
        </View>

        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatBox}>
            <Text style={styles.profileStatValue}>1,240</Text>
            <Text style={styles.profileStatLabel}>KG TODAY</Text>
          </View>
          <View style={[styles.profileStatBox, { marginHorizontal: 10 }]}>
            <Text style={styles.profileStatValue}>14</Text>
            <Text style={styles.profileStatLabel}>SUPPLIERS</Text>
          </View>
          <View style={styles.profileStatBox}>
            <Text style={styles.profileStatValue}>22,450</Text>
            <Text style={styles.profileStatLabel}>KG MONTH</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>{_("SETTINGS")}</Text>

        <View style={{ gap: 12 }}>
          {/* Language Preference */}
          <Pressable 
            style={[styles.settingItem, { borderColor: palette.accentBlue, borderWidth: 1 }]} 
            onPress={() => setLang && setLang(lang === 'en' ? 'si' : 'en')}
          >
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="language" size={20} color={palette.accentBlue} /></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.settingItemTitle}>{_("Language Preference")}</Text>
              <Text style={styles.settingItemSub}>{_("Switch between Sinhala and English")}</Text>
            </View>
            <Text style={{ color: palette.accentBlue, fontWeight: "800", fontSize: 13, marginRight: 8 }}>{lang === 'si' ? 'SINHALA' : 'ENGLISH'}</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.accentBlue} />
          </Pressable>

          {[
            { icon: "bluetooth" as const,           bg: "rgba(46,168,255,0.15)",  color: palette.accentBlue,  title: _("Bluetooth Scale"),  sub: _("DL-7200 · Connected") },
            { icon: "location-outline" as const,    bg: "rgba(31,190,87,0.15)",   color: palette.accentGreen, title: _("GPS Accuracy"),      sub: _("High accuracy mode · ON") },
            { icon: "sync" as const,                bg: "rgba(155,89,182,0.15)",  color: "#9b59b6",           title: _("Sync Settings"),     sub: _("Auto-sync on WiFi · ON") },
            { icon: "notifications-outline" as const,bg: "rgba(243,156,18,0.15)", color: "#f39c12",           title: _("Notifications"),     sub: _("All alerts enabled") },
            { icon: "time-outline" as const,        bg: "rgba(231,76,60,0.15)",   color: "#e74c3c",           title: _("My Collections"),    sub: _("View full history") },
          ].map((item, i) => (
            <View key={i} style={styles.settingItem}>
              <View style={[styles.settingIconBg, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingItemTitle}>{item.title}</Text>
                <Text style={styles.settingItemSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </View>
          ))}

          <Pressable style={styles.settingItem} onPress={() => setShowPinModal(true)}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}><Ionicons name="lock-closed-outline" size={20} color="#e74c3c" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Change PIN")}</Text><Text style={styles.settingItemSub}>{_("Update security access code")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => navigation.navigate("Login")}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Ionicons name="log-out-outline" size={20} color={palette.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>{_("Sign Out")}</Text>
              <Text style={styles.settingItemSub}>{user?.fullName} · {user?.employeeId}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Supplier List Screen
// ─────────────────────────────────────────────────────────────

const MOCK_SUPPLIERS = [
  { supplierId: "s1", supplierName: "Jayasekara Ranjith",  passbookNo: "SH-0142", lastWeight: 87.5,  lastDate: new Date(Date.now() - 1*60*60*1000).toISOString(), syncStatus: "SYNCED",  gpsStatus: "GPS" },
  { supplierId: "s2", supplierName: "Perera Dhammika",     passbookNo: "SH-0089", lastWeight: 124.0, lastDate: new Date(Date.now() - 2*60*60*1000).toISOString(), syncStatus: "QUEUED", gpsStatus: "GPS" },
  { supplierId: "s3", supplierName: "Silva Mahinda",       passbookNo: "SH-0056", lastWeight: 62.0,  lastDate: new Date(Date.now() - 3*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "NO_GPS" },
  { supplierId: "s4", supplierName: "Kumari Nilanthi",     passbookNo: "SH-0203", lastWeight: 95.5,  lastDate: new Date(Date.now() - 4*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "GPS" },
  { supplierId: "s5", supplierName: "Fernando Chaminda",   passbookNo: "SH-0117", lastWeight: 0,     lastDate: "",                                                  syncStatus: "QUEUED", gpsStatus: "NO_GPS" },
  { supplierId: "s6", supplierName: "Bandara Sunil",       passbookNo: "SH-0031", lastWeight: 110.0, lastDate: new Date(Date.now() - 5*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "GPS" },
  { supplierId: "s7", supplierName: "Rajapaksha Nimal",    passbookNo: "SH-0078", lastWeight: 0,     lastDate: "",                                                  syncStatus: "QUEUED", gpsStatus: "NO_GPS" },
  { supplierId: "s8", supplierName: "Wickramasinghe Tissa",passbookNo: "SH-0155", lastWeight: 73.5,  lastDate: new Date(Date.now() - 6*60*60*1000).toISOString(), syncStatus: "SYNCED", gpsStatus: "GPS" },
];

const avatarPalette = ["#3498db","#2ecc71","#9b59b6","#e67e22","#1abc9c","#e74c3c","#f39c12","#2980b9"];
const getBgColor = (name: string) => avatarPalette[name.charCodeAt(0) % avatarPalette.length];

export function SupplierListScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [search, setSearch] = useState("");
  const [historyItems, setHistoryItems] = useState<ApiCollectionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!token || !user?.userId) { setLoading(false); return; }
      try {
        const data = await apiGet<ApiCollectionHistory[]>(`${CollectionAPI.agentHistory(user.userId)}?limit=250`, token);
        setHistoryItems(Array.isArray(data) ? data : []);
      } catch { /* offline — will use mock */ }
      finally { setLoading(false); }
    })();
  }, [token, user?.userId]);

  // Build per-supplier summary from real data
  const supplierMap = useMemo(() => {
    const map = new Map<string, { supplierName: string; passbookNo: string; lastWeight: number; lastDate: string; syncStatus: string; gpsStatus: string }>();
    [...historyItems].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
      .forEach((item) => {
        if (!map.has(item.supplierId)) {
          map.set(item.supplierId, {
            supplierName: item.supplierName,
            passbookNo: item.passbookNo,
            lastWeight: Number(item.grossWeight || 0),
            lastDate: item.collectedAt,
            syncStatus: item.syncStatus,
            gpsStatus: item.gpsStatus,
          });
        }
      });
    return map;
  }, [historyItems]);

  const useMock = !loading && historyItems.length === 0;
  const suppliers = useMock
    ? MOCK_SUPPLIERS
    : Array.from(supplierMap.entries()).map(([supplierId, v]) => ({ supplierId, ...v }));

  const filtered = suppliers.filter((s) =>
    s.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    s.passbookNo.toLowerCase().includes(search.toLowerCase())
  );

  const collected = suppliers.filter((s) => s.lastWeight > 0).length;

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#0b1a30" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 }}>
          {/* Back button */}
          <Pressable onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{_("Supplier List")}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{suppliers.length} {_("suppliers")} · {collected} {_("collected today")}</Text>
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="filter-outline" size={20} color={palette.muted} />
          </View>
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 18, marginBottom: 14, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Ionicons name="search-outline" size={18} color={palette.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or passbook..."
            placeholderTextColor={palette.muted}
            style={{ flex: 1, color: "#fff", paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </Pressable>
          )}
        </View>

        {/* Summary strip */}
        <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingBottom: 14, gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(31,190,87,0.1)", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(31,190,87,0.2)" }}>
            <Text style={{ color: "#1fbe57", fontSize: 18, fontWeight: "800" }}>{collected}</Text>
            <Text style={{ color: palette.muted, fontSize: 10 }}>Collected</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(243,156,18,0.1)", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(243,156,18,0.2)" }}>
            <Text style={{ color: "#f39c12", fontSize: 18, fontWeight: "800" }}>{suppliers.length - collected}</Text>
            <Text style={{ color: palette.muted, fontSize: 10 }}>{_("Pending")}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(46,168,255,0.1)", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(46,168,255,0.2)" }}>
            <Text style={{ color: palette.accentBlue, fontSize: 18, fontWeight: "800" }}>{suppliers.length}</Text>
            <Text style={{ color: palette.muted, fontSize: 10 }}>{_("Total")}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={palette.accentBlue} style={{ marginTop: 40 }} />}

        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Ionicons name="people-outline" size={40} color={palette.muted} />
            <Text style={{ color: palette.muted, marginTop: 12, fontSize: 14 }}>{_("No suppliers found")}</Text>
          </View>
        )}

        {!loading && filtered.map((s, idx) => {
          const initial = s.supplierName.charAt(0).toUpperCase();
          const bg = getBgColor(s.supplierName);
          const hasCollection = s.lastWeight > 0;
          const isSynced = s.syncStatus === "SYNCED";
          const isGPS = s.gpsStatus === "GPS";
          const nameParts = s.supplierName.split(" ");
          const displayName = nameParts.length >= 2
            ? `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`
            : s.supplierName;
          const timeStr = s.lastDate ? new Date(s.lastDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) : null;

          return (
            <Pressable key={s.supplierId} onPress={() => setSelectedSupplier(s)}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: hasCollection ? "rgba(31,190,87,0.15)" : "rgba(255,255,255,0.06)", borderLeftWidth: 3, borderLeftColor: hasCollection ? "#1fbe57" : "#f39c12" }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{displayName}</Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginBottom: 5 }}>{s.passbookNo}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {hasCollection ? (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(31,190,87,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <MaterialCommunityIcons name="leaf" size={10} color="#1fbe57" />
                        <Text style={{ color: "#1fbe57", fontSize: 10, fontWeight: "600" }}>{s.lastWeight} kg</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isGPS ? "rgba(31,190,87,0.12)" : "rgba(255,255,255,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Ionicons name="location" size={10} color={isGPS ? "#1fbe57" : palette.muted} />
                        <Text style={{ color: isGPS ? "#1fbe57" : palette.muted, fontSize: 10, fontWeight: "600" }}>GPS</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: isSynced ? "rgba(31,190,87,0.12)" : "rgba(243,156,18,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Ionicons name={isSynced ? "checkmark" : "time-outline"} size={10} color={isSynced ? "#1fbe57" : "#f39c12"} />
                        <Text style={{ color: isSynced ? "#1fbe57" : "#f39c12", fontSize: 10, fontWeight: "600" }}>{isSynced ? _("Synced") : _("Queued")}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(243,156,18,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Ionicons name="time-outline" size={10} color="#f39c12" />
                      <Text style={{ color: "#f39c12", fontSize: 10, fontWeight: "600" }}>{_("Not yet collected")}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {timeStr && <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{timeStr}</Text>}
                <Ionicons name="chevron-forward" size={18} color={palette.muted} style={{ marginTop: 4 }} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Supplier Profile Modal */}
      {selectedSupplier && (
        <Modal visible={!!selectedSupplier} transparent animationType="slide" onRequestClose={() => setSelectedSupplier(null)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setSelectedSupplier(null)}>
            <Pressable
              onPress={e => e.stopPropagation()}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0f2035', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}
            >
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>

              {/* Avatar + Name */}
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: getBgColor(selectedSupplier.supplierName), alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: selectedSupplier.lastWeight > 0 ? '#1fbe57' : '#f39c12' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 26 }}>{selectedSupplier.supplierName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{selectedSupplier.supplierName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="book-outline" size={13} color={palette.muted} />
                  <Text style={{ color: palette.muted, fontSize: 13 }}>{selectedSupplier.passbookNo}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, marginBottom: 20 }} />

              {/* Stats grid */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(31,190,87,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(31,190,87,0.2)' }}>
                  <MaterialCommunityIcons name="leaf" size={20} color="#1fbe57" />
                  <Text style={{ color: '#1fbe57', fontSize: 18, fontWeight: '800', marginTop: 6 }}>{selectedSupplier.lastWeight > 0 ? `${selectedSupplier.lastWeight} kg` : '—'}</Text>
                  <Text style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>Last Collection</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: selectedSupplier.gpsStatus === 'GPS' ? 'rgba(31,190,87,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedSupplier.gpsStatus === 'GPS' ? 'rgba(31,190,87,0.2)' : 'rgba(255,255,255,0.08)' }}>
                  <Ionicons name="location-outline" size={20} color={selectedSupplier.gpsStatus === 'GPS' ? '#1fbe57' : palette.muted} />
                  <Text style={{ color: selectedSupplier.gpsStatus === 'GPS' ? '#1fbe57' : palette.muted, fontSize: 14, fontWeight: '800', marginTop: 6 }}>{selectedSupplier.gpsStatus === 'GPS' ? 'GPS' : 'No GPS'}</Text>
                  <Text style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>Location</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: selectedSupplier.syncStatus === 'SYNCED' ? 'rgba(31,190,87,0.1)' : 'rgba(243,156,18,0.1)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedSupplier.syncStatus === 'SYNCED' ? 'rgba(31,190,87,0.2)' : 'rgba(243,156,18,0.2)' }}>
                  <Ionicons name={selectedSupplier.syncStatus === 'SYNCED' ? 'checkmark-circle-outline' : 'time-outline'} size={20} color={selectedSupplier.syncStatus === 'SYNCED' ? '#1fbe57' : '#f39c12'} />
                  <Text style={{ color: selectedSupplier.syncStatus === 'SYNCED' ? '#1fbe57' : '#f39c12', fontSize: 13, fontWeight: '800', marginTop: 6 }}>{selectedSupplier.syncStatus === 'SYNCED' ? 'Synced' : 'Queued'}</Text>
                  <Text style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>Sync Status</Text>
                </View>
              </View>

              {/* Last collected time */}
              {selectedSupplier.lastDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 20, borderRadius: 12, marginBottom: 20 }}>
                  <Ionicons name="time-outline" size={16} color={palette.accentBlue} />
                  <Text style={{ color: palette.muted, fontSize: 13 }}>Last collected at </Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {new Date(selectedSupplier.lastDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    {' · '}
                    {new Date(selectedSupplier.lastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              )}

              {/* Close button */}
              <Pressable
                onPress={() => setSelectedSupplier(null)}
                style={{ marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}


export function CollectionDetailScreen({ route, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const { item, token } = route.params;
  const [notes, setNotes] = useState(item.supervisorNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  // Fallback: If it's a locally queued item (no collectionId) or just load local override
  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(m => {
      const AsyncStorage = m.default;
      AsyncStorage.getItem(`notes_${item.key || item.collectionId}`).then(val => {
        if (val) setNotes(val);
      });
    });
  }, [item]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem(`notes_${item.key || item.collectionId}`, notes);
      
      // Attempt API sync if it's already a server-synced item
      if (item.collectionId && item.syncStatus !== "QUEUED") {
         await apiPatch(CollectionAPI.updateNotes(item.collectionId), { notes }, token);
      }
      
      Alert.alert("Success", "Supervisor notes saved.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Saved locally, but failed to sync to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    return timeStr.toUpperCase();
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.substring(0, 1).toUpperCase();
  };

  // A collection is only "processed" when factory staff has set a real netWeight (> 0)
  // OR explicitly set processedByName. netWeight=0 or null means it's still pending.
  const isProcessed = (
    item.processedByName != null ||
    (item.netWeight != null && Number(item.netWeight) > 0)
  );

  const actualNetWeight = isProcessed ? Number(item.netWeight) : null;
  const deductionKg = isProcessed && actualNetWeight !== null
    ? Math.max(0, Number(item.grossWeight) - actualNetWeight)
    : null;
  const deductionDisplay = deductionKg !== null && deductionKg > 0
    ? `-${deductionKg.toFixed(2)} kg`
    : deductionKg === 0 ? "None" : "Pending";
  const netWeightDisplay = actualNetWeight !== null ? `${actualNetWeight.toFixed(2)} kg` : "Pending";

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#0b1a30" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Collection Detail</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 20 }}>
        
        {/* Main Details Card */}
        <View style={[styles.collectionItemCard, { flexDirection: "column", padding: 24, paddingBottom: 20, alignItems: "flex-start", marginBottom: 15 }]}>
          <View style={{ flexDirection: "column", width: "100%", marginBottom: 15 }}>
            <Text style={[styles.cardItemTitle, { fontSize: 22 }]}>{item.supplierName}</Text>
            <Text style={[styles.cardItemSub, { fontSize: 13, marginTop: 4 }]}>{item.passbookNo || "Unknown"} • C001</Text>
          </View>
          
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 42, fontWeight: "900", color: palette.accentGreen, letterSpacing: -1 }}>{item.grossWeight} kg</Text>
            <Text style={[styles.cardItemSub, { marginTop: 2 }]}>Gross green leaf weight</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {item.syncStatus === "SYNCED" ? (
              <View style={[styles.badgeLine, { backgroundColor: "rgba(31,190,87,0.1)", borderColor: palette.accentGreen }]}>
                <Ionicons name="checkmark" size={12} color={palette.accentGreen} />
                <Text style={{ color: palette.accentGreen, fontSize: 12, fontWeight: "600", marginLeft: 4 }}>Synced</Text>
              </View>
            ) : (
              <View style={[styles.badgeLine, { backgroundColor: "rgba(243,156,18,0.1)", borderColor: "#f39c12" }]}>
                <Ionicons name="time-outline" size={12} color="#f39c12" />
                <Text style={{ color: "#f39c12", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>Queued</Text>
              </View>
            )}

            {item.gpsStatus === "GPS" ? (
              <View style={[styles.badgeLine, { backgroundColor: "transparent", borderColor: palette.accentGreen }]}>
                <Ionicons name="location-outline" size={12} color={palette.accentGreen} />
                <Text style={{ color: palette.accentGreen, fontSize: 12, fontWeight: "600", marginLeft: 4 }}>GPS</Text>
              </View>
            ) : (
              <View style={[styles.badgeLine, { backgroundColor: "transparent", borderColor: "#e74c3c" }]}>
                <Ionicons name="alert-circle-outline" size={12} color="#e74c3c" />
                <Text style={{ color: "#e74c3c", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>No GPS</Text>
              </View>
            )}
          </View>
        </View>

        {/* Factory Processing Status Banner */}
        {!isProcessed && (
          <View style={{ backgroundColor: 'rgba(243,156,18,0.1)', borderRadius: 14, padding: 14, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(243,156,18,0.3)' }}>
            <Ionicons name="time-outline" size={20} color="#f39c12" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: '#f39c12', fontSize: 13, fontWeight: '700' }}>Awaiting Factory Processing</Text>
              <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Net weight and deductions will be set by factory staff after quality assessment.</Text>
            </View>
          </View>
        )}
        {isProcessed && item.processedByName && (
          <View style={{ backgroundColor: 'rgba(31,190,87,0.08)', borderRadius: 14, padding: 14, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(31,190,87,0.25)' }}>
            <Ionicons name="checkmark-circle-outline" size={20} color={palette.accentGreen} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: palette.accentGreen, fontSize: 13, fontWeight: '700' }}>Processed</Text>
              <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Quality assessed by {item.processedByName}</Text>
            </View>
          </View>
        )}

        {/* Info Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 15 }}>
          
          <View style={[styles.collectionItemCard, { width: "48%", padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "column" }]}>
            <Text style={[styles.cardItemSub, { fontSize: 11, marginBottom: 6, letterSpacing: 1 }]}>TIME</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{formatDate(item.collectedAt)}</Text>
          </View>

          <View style={[styles.collectionItemCard, { width: "48%", padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "column" }]}>
             <Text style={[styles.cardItemSub, { fontSize: 11, marginBottom: 6, letterSpacing: 1 }]}>DEDUCTION</Text>
             <Text style={{ 
               color: !isProcessed ? '#f39c12' : (deductionDisplay === "None" ? palette.muted : "#ff6b6b"), 
               fontSize: 18, fontWeight: "800" 
             }}>{deductionDisplay}</Text>
          </View>

          <View style={[styles.collectionItemCard, { width: "48%", padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "column" }]}>
             <Text style={[styles.cardItemSub, { fontSize: 11, marginBottom: 6, letterSpacing: 1 }]}>NET WEIGHT</Text>
             <Text style={{ 
               color: !isProcessed ? '#f39c12' : palette.accentGreen, 
               fontSize: 18, fontWeight: "800" 
             }}>{netWeightDisplay}</Text>
          </View>

          <View style={[styles.collectionItemCard, { width: "48%", padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "column" }]}>
             <Text style={[styles.cardItemSub, { fontSize: 11, marginBottom: 6, letterSpacing: 1 }]}>MANUAL</Text>
             <Text style={{ color: item.manualOverride ? "#f39c12" : palette.muted, fontSize: 18, fontWeight: "800" }}>{item.manualOverride ? "Yes" : "No"}</Text>
          </View>

        </View>

        {/* GPS Location explicitly shown */}
        <View style={[styles.collectionItemCard, { padding: 20, alignItems: "center", marginBottom: 15, flexDirection: "column" }]}>
          <Ionicons name="location-outline" size={32} color={palette.accentBlue} style={{ marginBottom: 10 }} />
          {item.gpsStatus === "GPS" ? (
            <>
              <Text style={{ color: palette.accentGreen, fontSize: 16, fontWeight: "700", marginBottom: 4 }}>GPS: 7.3012, 80.6417</Text>
              <Text style={styles.cardItemSub}>Accuracy: ±4m</Text>
            </>
          ) : (
            <>
               <Text style={{ color: "#e74c3c", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>Location Unavailable</Text>
               <Text style={styles.cardItemSub}>GPS was disabled during collection</Text>
            </>
          )}
        </View>

        {/* Notes Area */}
        <View style={[styles.collectionItemCard, { padding: 20, marginBottom: 30, flexDirection: "column", alignItems: "flex-start" }]}>
           <Text style={[styles.cardItemSub, { fontSize: 12, marginBottom: 15, letterSpacing: 1, fontWeight: "700" }]}>SUPERVISOR NOTES</Text>
           <View style={{ backgroundColor: "#0b1a30", borderRadius: 8, padding: 15, minHeight: 100, width: "100%" }}>
             <TextInput 
               placeholder="Add notes (optional)..." 
               placeholderTextColor={palette.muted}
               style={{ color: "#fff", fontSize: 15, textAlignVertical: "top" }}
               multiline
               value={notes}
               onChangeText={setNotes}
             />
           </View>

           {/* Save Button */}
           <Pressable 
             style={[styles.mainBtn, { width: "100%", marginTop: 15, marginBottom: 0 }]}
             onPress={handleSaveNotes}
             disabled={isSaving}
           >
             {isSaving ? (
               <ActivityIndicator color="#fff" />
             ) : (
               <Text style={styles.mainBtnText}>Save Notes</Text>
             )}
           </Pressable>
        </View>

        <View style={{ height: 100 }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PinChangeModal({ visible, onClose, user, token, _ }: any) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1);
    setOtp("");
    setNewPin("");
    setLoading(false);
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      // Mocking OTP send
      await new Promise(r => setTimeout(r, 1500));
      setStep(2);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) return Alert.alert("Wait", "Please enter the OTP code");
    setLoading(true);
    try {
      // Mocking OTP verify
      await new Promise(r => setTimeout(r, 1200));
      setStep(3);
    } catch (err: any) {
      Alert.alert("Error", "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePIN = async () => {
    if (newPin.length !== 4) return Alert.alert("Wait", "PIN must be 4 digits");
    setLoading(true);
    try {
      // Mocking PIN update
      await new Promise(r => setTimeout(r, 1800));
      Alert.alert("Success", "Security PIN updated successfully!");
      onClose();
      reset();
    } catch (err: any) {
      Alert.alert("Error", "Failed to update PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: '#111f38', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
              <View>
                <Text style={{ color: palette.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{_("Security Center")}</Text>
                <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{_("Update PIN")}</Text>
              </View>
              <Pressable onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Step 1: Request OTP */}
            {step === 1 && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(46, 168, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Ionicons name="shield-checkmark" size={32} color={palette.accentBlue} />
                </View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>{_("Identity Verification")}</Text>
                <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 30 }}>{_("We will send a one-time verification code to your registered mobile number to confirm it's you.")}</Text>
                <Pressable style={[styles.mainBtn, { width: '100%', marginBottom: 0 }]} onPress={handleSendOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Send Verification Code")}</Text>}
                </Pressable>
              </View>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 15 }}>{_("Enter the 6-digit code sent to your phone")}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TextInput 
                    style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 10, textAlign: 'center' }}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    autoFocus
                  />
                </View>
                <Pressable style={[styles.mainBtn, { width: '100%', marginBottom: 0 }]} onPress={handleVerifyOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Verify Code")}</Text>}
                </Pressable>
                <Pressable onPress={() => setStep(1)} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <Text style={{ color: palette.accentBlue, fontSize: 13, fontWeight: 'bold' }}>{_("Didn't receive code? Resend")}</Text>
                </Pressable>
              </View>
            )}

            {/* Step 3: Set New PIN */}
            {step === 3 && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 15 }}>{_("Set your new 4-digit security PIN")}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TextInput 
                    style={{ color: palette.accentGreen, fontSize: 32, fontWeight: 'bold', letterSpacing: 15, textAlign: 'center' }}
                    placeholder="0000"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={newPin}
                    onChangeText={setNewPin}
                    autoFocus
                  />
                </View>
                <Pressable style={[styles.mainBtn, { width: '100%', backgroundColor: palette.accentGreen, marginBottom: 0 }]} onPress={handleUpdatePIN} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Update Security PIN")}</Text>}
                </Pressable>
              </View>
            )}

          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
