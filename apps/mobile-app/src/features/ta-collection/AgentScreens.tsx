import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  Text, TextInput, View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, ServicesAPI, apiGet, apiPatch, apiPost } from "../../services/api";
import { getOfflineCollections, syncQueuedCollections } from "./collectionData";

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

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
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
// Dashboard Screen
// ─────────────────────────────────────────────────────────────

export function DashboardScreen({ user, role, navigation, token }: any) {
  const initials = user?.fullName?.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const [historyItems, setHistoryItems] = useState<CollectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    }, [loadData])
  );

  const pendingSync = useMemo(
    () => historyItems.filter((item) => item.syncStatus === "QUEUED" || item.syncStatus === "FAILED" || item.syncStatus === "SYNCING").length,
    [historyItems]
  );

  const todayKg = useMemo(() => {
    const now = new Date();
    return historyItems
      .filter((item) => {
        const d = new Date(item.collectedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      })
      .reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  }, [historyItems]);

  const monthKg = useMemo(() => {
    const now = new Date();
    return historyItems
      .filter((item) => {
        const d = new Date(item.collectedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  }, [historyItems]);

  const supplierCount = useMemo(() => new Set(historyItems.map((item) => item.supplierId)).size, [historyItems]);

  const kpis = [
    { label: "KG Today", value: `${todayKg.toFixed(1)} kg`, icon: "leaf-outline" as const, color: palette.accentGreen },
    { label: "Suppliers", value: `${supplierCount}`, icon: "people-outline" as const, color: palette.accentBlue },
    { label: "Pending Sync", value: `${pendingSync}`, icon: "cloud-upload-outline" as const, color: "#f39c12" },
    { label: "This Month", value: `${monthKg.toFixed(1)} kg`, icon: "stats-chart-outline" as const, color: "#9b59b6" },
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
  const MOCK_MODE = true;
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
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>Transport Agent</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{user?.fullName || "Agent"}</Text>
          </View>
          {/* Icons */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="wifi-outline" size={20} color={palette.muted} />
            </View>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="notifications-outline" size={20} color={palette.muted} />
            </View>
            <Pressable onPress={() => navigation.navigate("Login")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out-outline" size={20} color={palette.muted} />
            </Pressable>
          </View>
        </View>

        {/* Online / Sync bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(31,190,87,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(31,190,87,0.25)" }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#1fbe57" }} />
            <Text style={{ color: "#1fbe57", fontSize: 12, fontWeight: "700" }}>Online</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="checkmark" size={14} color={palette.accentBlue} />
            <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>Synced</Text>
          </View>
          <Text style={{ color: palette.muted, fontSize: 12, marginLeft: "auto" }}>Last sync: {lastSyncText}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ── KPI Cards ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {/* Today's Leaf */}
          <View style={{ flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: "#1fbe57", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(31,190,87,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <MaterialCommunityIcons name="leaf" size={18} color="#1fbe57" />
            </View>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{displayKgToday.toFixed(1)} kg</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>TODAY'S LEAF</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{displaySupToday} suppliers</Text>
          </View>

          {/* Pending Sync */}
          <View style={{ flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: "#f39c12", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(243,156,18,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ionicons name="time-outline" size={18} color="#f39c12" />
            </View>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{displayPendingSync}</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>PENDING SYNC</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>records queued</Text>
          </View>

          {/* Route Progress */}
          <View style={{ flex: 1, backgroundColor: "#0d1f36", borderRadius: 16, padding: 14, borderTopWidth: 3, borderTopColor: palette.accentBlue, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(46,168,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ionicons name="location-outline" size={18} color={palette.accentBlue} />
            </View>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{displaySupToday}/{displaySupTotal || "—"}</Text>
            <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>ROUTE PROGRESS</Text>
            <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{displaySupTotal > 0 ? `${Math.round((displaySupToday / displaySupTotal) * 100)}% complete` : "No data"}</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>QUICK ACTIONS</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <Pressable
            onPress={() => navigation.navigate("CollectionInput", { token, user })}
            style={{ flex: 1, backgroundColor: "#1fbe57", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              shadowColor: "#1fbe57", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}
          >
            <Ionicons name="add" size={26} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>New Collection</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Collections")}
            style={{ flex: 1, backgroundColor: "#2563eb", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}
          >
            <Ionicons name="search-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>View History</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => navigation.navigate("SupplierList", { user, token })}
            style={{ flex: 1, backgroundColor: "#7c3aed", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}
          >
            <Ionicons name="list-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Supplier List</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Requests")}
            style={{ flex: 1, backgroundColor: "#d97706", borderRadius: 16, height: 70, alignItems: "center", justifyContent: "center", gap: 6,
              shadowColor: "#d97706", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }}
          >
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Requests</Text>
          </Pressable>
        </View>

        {/* ── Today's Collections ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.sectionHeader}>TODAY'S COLLECTIONS</Text>
          <Pressable onPress={() => navigation.navigate("Collections")}>
            <Text style={{ color: palette.accentBlue, fontSize: 13, fontWeight: "600" }}>See All →</Text>
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
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 8 }}>No collections today yet</Text>
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
            <View key={item.key || idx} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
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
                <Text style={{ color: isSynced ? "#1fbe57" : "#fff", fontSize: 15, fontWeight: "800" }}>{Number(item.grossWeight).toFixed(1)} kg</Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{formatTime(item.collectedAt)}</Text>
              </View>
            </View>
          );
        })}

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Collections Screen
// ─────────────────────────────────────────────────────────────

export function CollectionsScreen({ navigation, user, token }: any) {
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
          <Text style={styles.headerTitle}>Collections</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="qr-code-outline" size={20} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={palette.muted} />
          <TextInput
            placeholder="Search by name or passbook..."
            placeholderTextColor={palette.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.cardItemSub}>Pending sync: {pendingCount}</Text>
          <Pressable
            style={[styles.filterChip, { borderColor: palette.accentBlue }]}
            onPress={handleSync}
            disabled={isSyncing || pendingCount === 0}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={palette.accentBlue} />
            ) : (
              <Text style={[styles.filterChipText, { color: pendingCount > 0 ? palette.accentBlue : palette.muted }]}>Sync Queue</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {["All", "Synced", "Queued", "Failed"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActive]}>{tab}</Text>
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
              <Text style={styles.cardItemSub}>No collections found.</Text>
            </View>
          )}

          {!isLoading && filtered.map((item, idx) => (
            <View key={idx} style={styles.collectionItemCard}>
              <View style={[styles.collectionAvatarCompact, { backgroundColor: "#2ea8ff" }]}>
                <Text style={styles.collectionAvatarText}>{(item.supplierName || "?").substring(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>{item.supplierName}</Text>
                <Text style={styles.cardItemSub}>{item.passbookNo || "Passbook unavailable"}</Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <StatusBadge type={toGpsBadgeType(item.gpsStatus)} text={item.gpsStatus === "GPS" ? "GPS" : "No GPS"} />
                  <StatusBadge type={toStatusBadgeType(item.syncStatus)} text={item.syncStatus.charAt(0) + item.syncStatus.slice(1).toLowerCase()} />
                  {item.manualOverride && <StatusBadge type="manual" text="Manual" />}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardWeight}>{item.grossWeight.toFixed(1)} kg</Text>
                <Text style={styles.cardTime}>{formatTime(item.collectedAt)}</Text>
              </View>
            </View>
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

export function RequestsScreen({ navigation, user, token, role }: any) {
  const [activeTab, setActiveTab] = useState("Advance");
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
  const [fertilizerItems, setFertilizerItems] = useState<Array<{ type: string; quantity: string }>>([]);
  const [toolItems, setToolItems] = useState<Array<{ type: string; quantity: string }>>([]);
  const [formNotes, setFormNotes] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const addItemBlink = useRef(new Animated.Value(1)).current;

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
      const params = new URLSearchParams();
      if (user?.supplierId) {
        params.set("supplierId", String(user.supplierId));
      } else {
        params.set("createdById", String(user.userId));
      }
      params.set("requestType", requestType);
      params.set("limit", "120");
      const data = await apiGet<any[]>(`${ServicesAPI.createRequest}?${params.toString()}`, token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      Alert.alert("Request Error", err?.message || "Failed to load requests.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [requestType, token, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

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

  const openForm = () => {
    setFormSupplier(null);
    setFormAmount("");
    setFormQuantity("");
    setFormItemType("");
    setFertilizerItems([]);
    setToolItems([]);
    setFormNotes("");
    setSearchQuery("");
    setShowForm(true);
    fetchSuppliers("");
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
      }))
      .filter((item) => item.type && !Number.isNaN(item.quantity) && item.quantity > 0);

    const normalizedToolItems = toolItems
      .map((item) => ({
        type: item.type.trim(),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.type && !Number.isNaN(item.quantity) && item.quantity > 0);

    if (activeTab === "Fertilizer" && normalizedFertilizerItems.length === 0) {
      Alert.alert("Required", "Please save at least one fertilizer item.");
      return;
    }

    if (activeTab === "Fertilizer" && (formItemType.trim() || formQuantity.trim())) {
      Alert.alert("Save Current Item", "You have an unsaved fertilizer item. Save it before submitting.");
      return;
    }

    if (activeTab === "Tools" && normalizedToolItems.length === 0) {
      Alert.alert("Required", "Please save at least one tool item.");
      return;
    }

    if (activeTab === "Tools" && (formItemType.trim() || formQuantity.trim())) {
      Alert.alert("Save Current Item", "You have an unsaved tool item. Save it before submitting.");
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
          itemType: activeTab === "Fertilizer" ? (normalizedFertilizerItems[0]?.type || formItemType) : (activeTab === "Tools" ? (normalizedToolItems[0]?.type || formItemType) : (activeTab === "Leaf Bags" ? "Leaf Bag" : formItemType)),
          itemDetails: activeTab === "Fertilizer" ? JSON.stringify(normalizedFertilizerItems) : (activeTab === "Tools" ? JSON.stringify(normalizedToolItems) : undefined),
          creatorName: user.fullName || "Agent",
          creatorId: user.employeeId || "No ID",
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
    setFertilizerItems((prev) => [...prev, { type, quantity: String(quantity) }]);
    setFormItemType("");
    setFormQuantity("");
  };

  const saveToolItem = () => {
    const type = formItemType.trim();
    const quantity = Number(formQuantity);
    if (!type || Number.isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Item", "Enter a valid tool type and quantity, then save.");
      return;
    }
    setToolItems((prev) => [...prev, { type, quantity: String(quantity) }]);
    setFormItemType("");
    setFormQuantity("");
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
    if (status === "APPROVED_BY_EXT" || status === "DISPATCHED") return palette.accentGreen;
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
          <Text style={styles.headerTitle}>Supplier Requests</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>Request Category</Text>
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
                  onPress={() => setActiveTab(tab.id)}
                  style={{ flex: 1, flexDirection: "column", height: 80, justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent", borderWidth: 1, borderColor: isActive ? `${tab.color}33` : "transparent" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}>
                    {tab.isMaterial
                      ? <MaterialCommunityIcons name={tab.icon as any} size={20} color={tab.color} />
                      : <Ionicons name={tab.icon as any} size={20} color={tab.color} />}
                  </View>
                  <Text style={{ color: isActive ? tab.color : palette.muted, fontSize: 11, fontWeight: isActive ? "700" : "500", textAlign: "center" }}>
                    {tab.id}
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
                  onPress={() => setActiveTab(tab.id)}
                  style={{ flex: 1, flexDirection: "column", height: 80, justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent", borderWidth: 1, borderColor: isActive ? `${tab.color}33` : "transparent" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={tab.icon as any} size={20} color={tab.color} />
                  </View>
                  <Text style={{ color: isActive ? tab.color : palette.muted, fontSize: 11, fontWeight: isActive ? "700" : "500", textAlign: "center" }}>
                    {tab.id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === "Tools" && (
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 4, marginBottom: 15 }}>
            <Pressable 
              style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: toolViewMode === "TOOL_PURCHASE" ? palette.accentBlue : "transparent", borderRadius: 6 }}
              onPress={() => setToolViewMode("TOOL_PURCHASE")}
            >
              <Text style={{ color: toolViewMode === "TOOL_PURCHASE" ? "white" : palette.muted, fontWeight: "bold", fontSize: 13 }}>Purchase</Text>
            </Pressable>
            <Pressable 
              style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: toolViewMode === "TOOL_RENT" ? palette.accentBlue : "transparent", borderRadius: 6 }}
              onPress={() => setToolViewMode("TOOL_RENT")}
            >
              <Text style={{ color: toolViewMode === "TOOL_RENT" ? "white" : palette.muted, fontWeight: "bold", fontSize: 13 }}>Rent</Text>
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
              <Text style={{ color: "#111", fontSize: 16, fontWeight: "bold" }}>Create New Request</Text>
            </Pressable>
            <View style={[styles.warningBox, { marginTop: 0, paddingVertical: 10 }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#f39c12" />
              <Text style={styles.warningText}>Only for suppliers under your assignment</Text>
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
              <Text style={styles.cardItemSub}>No {activeTab.toLowerCase()} requests found.</Text>
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

            return (
            <View key={item.requestId} style={styles.reqCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                <View>
                  <Text style={styles.cardItemTitle}>{item.supplierName || "Supplier"}</Text>
                  <Text style={styles.cardItemSub}>{item.passbookNo || "No passbook"} · {submittedTime}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(String(item.status || "PENDING")) }]}>
                    {String(item.status || "PENDING").startsWith('APPROVED') ? 'APPROVED' : String(item.status || "PENDING").replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              {activeTab === "Advance" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={styles.reqCardLabel}>Amount</Text>
                  <Text style={styles.reqCardValue}>Rs. {Number(item.requestedAmount || 0).toLocaleString()}</Text>
                </View>
              )}
              {activeTab === "Fertilizer" && (
                <>
                  {!hasFertilizerDetailItems && (
                    <>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text style={styles.reqCardLabel}>Type</Text>
                        <Text style={styles.reqCardValue} numberOfLines={1}>{item.itemType || "Standard"}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text style={styles.reqCardLabel}>Quantity</Text>
                        <Text style={styles.reqCardValue}>{item.quantity || 0} kg</Text>
                      </View>
                    </>
                  )}
                  {hasFertilizerDetailItems && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={styles.reqCardLabel}>Items</Text>
                      <Text style={[styles.reqCardValue, { flex: 1, textAlign: "right" }]} numberOfLines={1}>
                        {fertilizerDetailItems.map((entry: any) => `${entry.type} (${entry.quantity}kg)`).join(", ")}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {activeTab === "Tools" && (
                <>
                  {toolTypeLabel && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={styles.reqCardLabel}>Type</Text>
                      <Text style={styles.reqCardValue}>{toolTypeLabel}</Text>
                    </View>
                  )}
                  {!hasToolDetailItems && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={styles.reqCardLabel}>Units</Text>
                      <Text style={styles.reqCardValue}>{item.quantity || 1}</Text>
                    </View>
                  )}
                  {hasToolDetailItems && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={styles.reqCardLabel}>Items</Text>
                      <Text style={[styles.reqCardValue, { flex: 1, textAlign: "right" }]} numberOfLines={1}>
                        {toolDetailItems.map((entry: any) => `${entry.type} (${entry.quantity}units)`).join(", ")}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {activeTab === "Leaf Bags" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={styles.reqCardLabel}>Bags Requested</Text>
                  <Text style={styles.reqCardValue}>{item.quantity || 0} bags</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                <Text style={styles.reqCardLabel}>Submitted</Text>
                <Text style={styles.reqCardValue}>{submittedDateStr}{submittedDate ? ` · ${submittedTime}` : ""}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.reqCardLabel}>Add notes</Text>
                <Text style={[styles.reqCardValue, { color: palette.muted, flex: 1, textAlign: "right" }]} numberOfLines={1}>{getCleanCardNote(item)}</Text>
              </View>

              {item.status === "PENDING" && role !== "supplier" && (
                <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 15 }}>
                  <Pressable 
                    onPress={() => handleCancelRequest(item.requestId)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(231,76,60,0.1)", borderWidth: 1, borderColor: "rgba(231,76,60,0.2)" }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    <Text style={{ color: "#e74c3c", fontSize: 13, fontWeight: "bold" }}>Remove Request</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );})}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* NEW REQUEST MODAL */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#111f38", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: "90%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>New {activeTab} Request</Text>
                <Pressable onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={24} color={palette.muted} />
                </Pressable>
              </View>

              {!formSupplier ? (
                // Step 1: Select Supplier
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ color: palette.muted, fontSize: 13, marginBottom: 8 }}>Search Supplier</Text>
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
                        <Text style={{ color: palette.muted, textAlign: "center", marginTop: 20 }}>No suppliers found.</Text>
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
                    <Pressable onPress={() => setFormSupplier(null)} style={{ padding: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6 }}>
                      <Text style={{ color: "white", fontSize: 11 }}>Change</Text>
                    </Pressable>
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
                               <View style={[styles.inputContainer, { height: 52 }]}> 
                                 <TextInput
                                   style={[styles.inputField, { paddingLeft: 15, fontSize: 15, fontWeight: "bold" }]}
                                   placeholder="e.g. U709"
                                   placeholderTextColor="#7d93b4"
                                   value={formItemType}
                                   onChangeText={setFormItemType}
                                 />
                               </View>
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
                                  <View style={[styles.inputContainer, { height: 48 }]}>
                                     <TextInput
                                        style={[styles.inputField, { paddingLeft: 12, fontSize: 14, fontWeight: "600" }]}
                                        placeholder="e.g. Shovel"
                                        placeholderTextColor="#7d93b4"
                                        value={formItemType}
                                        onChangeText={setFormItemType}
                                     />
                                  </View>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile Screen
// ─────────────────────────────────────────────────────────────

export function ProfileScreen({ user, navigation }: any) {
  const initials = user?.fullName?.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Profile</Text>
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

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>SETTINGS</Text>

        <View style={{ gap: 12 }}>
          {[
            { icon: "bluetooth" as const,           bg: "rgba(46,168,255,0.15)",  color: palette.accentBlue,  title: "Bluetooth Scale",  sub: "DL-7200 · Connected" },
            { icon: "location-outline" as const,    bg: "rgba(31,190,87,0.15)",   color: palette.accentGreen, title: "GPS Accuracy",      sub: "High accuracy mode · ON" },
            { icon: "sync" as const,                bg: "rgba(155,89,182,0.15)",  color: "#9b59b6",           title: "Sync Settings",     sub: "Auto-sync on WiFi · ON" },
            { icon: "notifications-outline" as const,bg: "rgba(243,156,18,0.15)", color: "#f39c12",           title: "Notifications",     sub: "All alerts enabled" },
            { icon: "time-outline" as const,        bg: "rgba(231,76,60,0.15)",   color: "#e74c3c",           title: "My Collections",    sub: "View full history" },
            { icon: "lock-closed-outline" as const, bg: "rgba(231,76,60,0.15)",   color: "#e74c3c",           title: "Change PIN",        sub: "Last changed 30 days ago" },
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

          <Pressable style={styles.settingItem} onPress={() => navigation.navigate("Login")}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Ionicons name="log-out-outline" size={20} color={palette.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Sign Out</Text>
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

export function SupplierListScreen({ user, token, navigation }: any) {
  const [search, setSearch] = useState("");
  const [historyItems, setHistoryItems] = useState<ApiCollectionHistory[]>([]);
  const [loading, setLoading] = useState(true);

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
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>Supplier List</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{suppliers.length} suppliers · {collected} collected today</Text>
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
            <Text style={{ color: palette.muted, fontSize: 10 }}>Pending</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(46,168,255,0.1)", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(46,168,255,0.2)" }}>
            <Text style={{ color: palette.accentBlue, fontSize: 18, fontWeight: "800" }}>{suppliers.length}</Text>
            <Text style={{ color: palette.muted, fontSize: 10 }}>Total</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={palette.accentBlue} style={{ marginTop: 40 }} />}

        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Ionicons name="people-outline" size={40} color={palette.muted} />
            <Text style={{ color: palette.muted, marginTop: 12, fontSize: 14 }}>No suppliers found</Text>
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
            <Pressable key={s.supplierId} onPress={() => navigation.navigate("CollectionInput", { token, user, prefillSupplier: s })}
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
                        <Text style={{ color: isSynced ? "#1fbe57" : "#f39c12", fontSize: 10, fontWeight: "600" }}>{isSynced ? "Synced" : "Queued"}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(243,156,18,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Ionicons name="time-outline" size={10} color="#f39c12" />
                      <Text style={{ color: "#f39c12", fontSize: 10, fontWeight: "600" }}>Not yet collected</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {timeStr && <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{timeStr}</Text>}
                <Ionicons name="add-circle-outline" size={22} color={palette.accentGreen} style={{ marginTop: 4 }} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
