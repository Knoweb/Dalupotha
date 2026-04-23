import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  Text, TextInput, View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, ServicesAPI, apiGet, apiPost } from "../../services/api";
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

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={[styles.cardItemSub, { fontSize: 11, marginTop: 2 }]}>{today}</Text>
          </View>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Agent Info Card */}
        <View style={[styles.supCard, { marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 15 }]}>
          <View style={[styles.profileAvatarBig, { width: 50, height: 50 }]}>
            <Text style={[styles.profileAvatarBigText, { fontSize: 18 }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardItemTitle}>{user?.fullName || "Agent"}</Text>
            <Text style={styles.cardItemSub}>{user?.employeeId || "TA-XXX"} · {user?.routeName || "No route assigned"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "rgba(31,190,87,0.15)" }]}>
            <Text style={[styles.statusBadgeText, { color: palette.accentGreen }]}>ON DUTY</Text>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {kpis.map((kpi, i) => (
            <View key={i} style={[styles.supCard, { flex: 1, minWidth: "44%", padding: 16, alignItems: "center" }]}>
              <Ionicons name={kpi.icon} size={24} color={kpi.color} style={{ marginBottom: 8 }} />
              <Text style={[styles.cardWeight, { fontSize: 18, color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.cardItemSub, { fontSize: 10, marginTop: 4, textAlign: "center" }]}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Primary Quick Actions */}
        <Pressable
          style={[styles.primaryBtn, { 
            backgroundColor: palette.accentBlue, 
            marginBottom: 25, 
            flexDirection: "row", 
            gap: 12,
            height: 60,
            borderRadius: 16,
            shadowColor: palette.accentBlue,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)"
          }]}
          onPress={() => navigation.navigate("CollectionInput", { token, user })}
        >
          <Ionicons name="add-circle" size={26} color="white" />
          <Text style={[styles.primaryBtnText, { fontSize: 17, fontWeight: "800", letterSpacing: 0.5, color: "white" }]}>ADD NEW COLLECTION</Text>
        </Pressable>

        {/* Recent Collections */}
        <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>Recent Collections</Text>
        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={palette.accentBlue} />
          </View>
        )}

        {!loading && recent.length === 0 && (
          <View style={styles.collectionItemCard}>
            <Text style={styles.cardItemSub}>No collections yet.</Text>
          </View>
        )}

        {!loading && recent.map((item, idx) => (
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

export function RequestsScreen({ navigation, user, token }: any) {
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
  const [formNotes, setFormNotes] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  const [toolViewMode, setToolViewMode] = useState<"TOOL_PURCHASE" | "TOOL_RENT">("TOOL_PURCHASE");

  let requestType = "ADVANCE";
  if (activeTab === "Fertilizer") requestType = "FERTILIZER";
  if (activeTab === "Transport") requestType = "TRANSPORT";
  if (activeTab === "Tools") requestType = toolViewMode;
  if (activeTab === "Other") requestType = "OTHER";

  const loadRequests = useCallback(async () => {
    if (!token || !user?.userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("createdById", String(user.userId));
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

    setCreating(true);
    try {
      await apiPost(
        ServicesAPI.createRequest,
        {
          supplierId: formSupplier.supplierId,
          supplierName: formSupplier.fullName || "Unknown Supplier",
          passbookNo: formSupplier.passbookNo || "No passbook",
          createdById: user.userId,
          requestType: requestType,
          requestedAmount: activeTab === "Advance" ? amount : 0,
          notes: formNotes || `Requested via Mobile by ${user.fullName || "Agent"}`,
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

  const statusColor = (status: string) => {
    if (status === "APPROVED_BY_EXT" || status === "DISPATCHED") return palette.accentGreen;
    if (status === "PENDING") return "#f39c12";
    return "#e74c3c";
  };

  let placeholderTxt = "Specific request details...";
  if (activeTab === "Advance") placeholderTxt = "Reason for advance...";
  if (activeTab === "Fertilizer") placeholderTxt = "Specific fertilizer requirements...";
  if (activeTab === "Transport") placeholderTxt = "Destination, date, cargo...";
  if (activeTab === "Tools") {
    placeholderTxt = toolViewMode === "TOOL_PURCHASE" ? "Which tools to purchase, quantity..." : "Which tools to rent, duration...";
  }
  if (activeTab === "Other") placeholderTxt = "Describe what you need...";

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
              { id: "Advance", icon: "wallet-outline" },
              { id: "Fertilizer", icon: "leaf", isMaterial: true },
              { id: "Transport", icon: "car-outline" },
            ].map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.reqTab,
                  { flex: 1, flexDirection: "column", height: 75, paddingHorizontal: 0, justifyContent: "center", alignItems: "center", gap: 6 },
                  activeTab === tab.id ? styles.reqTabActive : { backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" }
                ]}
              >
                {tab.isMaterial ? (
                  <MaterialCommunityIcons name={tab.icon as any} size={22} color={activeTab === tab.id ? palette.accentBlue : palette.muted} />
                ) : (
                  <Ionicons name={tab.icon as any} size={22} color={activeTab === tab.id ? palette.accentBlue : palette.muted} />
                )}
                <Text style={[styles.reqTabText, { fontSize: 11, letterSpacing: 0, textAlign: "center" }, activeTab === tab.id && styles.reqTabTextActive]}>
                  {tab.id}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { id: "Tools", icon: "hammer-outline" },
              { id: "Other", icon: "ellipsis-horizontal" },
              { id: "phantom", icon: "" }
            ].map((tab) => {
              if (tab.id === "phantom") return <View key="phantom" style={{ flex: 1 }} />;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.reqTab,
                    { flex: 1, flexDirection: "column", height: 75, paddingHorizontal: 0, justifyContent: "center", alignItems: "center", gap: 6 },
                    activeTab === tab.id ? styles.reqTabActive : { backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" }
                  ]}
                >
                  { (tab as any).isMaterial ? (
                    <MaterialCommunityIcons name={tab.icon as any} size={22} color={activeTab === tab.id ? palette.accentBlue : palette.muted} />
                  ) : (
                    <Ionicons name={tab.icon as any} size={22} color={activeTab === tab.id ? palette.accentBlue : palette.muted} />
                  )}
                  <Text style={[styles.reqTabText, { fontSize: 11, letterSpacing: 0, textAlign: "center" }, activeTab === tab.id && styles.reqTabTextActive]}>
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

          {!loading && items.map((item) => (
            <View key={item.requestId} style={styles.reqCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                <View>
                  <Text style={styles.cardItemTitle}>{item.supplierName || "Supplier"}</Text>
                  <Text style={styles.cardItemSub}>{item.passbookNo || "No passbook"} · {String(item.requestId).slice(0, 8)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(String(item.status || "PENDING")) }]}>{String(item.status || "PENDING")}</Text>
                </View>
              </View>
              {activeTab === "Advance" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={styles.reqCardLabel}>Amount</Text>
                  <Text style={styles.reqCardValue}>Rs. {Number(item.requestedAmount || 0).toLocaleString()}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                <Text style={styles.reqCardLabel}>Date</Text>
                <Text style={styles.reqCardValue}>{item.requestDate ? new Date(item.requestDate).toLocaleDateString() : "-"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.reqCardLabel}>Notes</Text>
                <Text style={[styles.reqCardValue, { color: palette.muted, flex: 1, textAlign: "right" }]} numberOfLines={1}>{item.notes || "-"}</Text>
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <View style={styles.floatingBottom}>
        <Pressable style={styles.newReqBtn} onPress={openForm}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.newReqBtnText}>Create New Request</Text>
        </Pressable>
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#f39c12" />
          <Text style={styles.warningText}>Only for suppliers under your tracking assignment</Text>
        </View>
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

                  {activeTab === "Buy Tools" && (
                    <View style={{ backgroundColor: "rgba(243, 156, 18, 0.1)", padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: "rgba(243, 156, 18, 0.3)" }}>
                      <Text style={{ color: "#f39c12", fontSize: 12 }}>Note: Tool purchases will be billed as debt via the leaf bag deduction route.</Text>
                    </View>
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
