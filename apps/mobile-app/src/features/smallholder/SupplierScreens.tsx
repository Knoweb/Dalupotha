import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, FinanceAPI, ServicesAPI, apiGet } from "../../services/api";

type SupplierHistoryItem = {
  collectionId: string;
  supplierId: string;
  supplierName: string;
  passbookNo: string;
  grossWeight: number;
  netWeight: number | null;
  collectedAt: string;
  syncStatus: string;
  gpsStatus: string;
  manualOverride: boolean;
};

type SupplierLedger = {
  currentDebt: number;
  estimatedBalance: number;
  advanceTaken: number;
};

type SupplierIdentity = {
  supplierId: string;
  fullName: string;
  passbookNo: string;
  estateId?: string;
};

// ── Detail Modal Component ───────────────────────────────────────────────────
function CollectionDetailModal({ visible, item, onClose, _ }: any) {
  if (!item) return null;
  const d = new Date(item.collectedAt);
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', day: "2-digit", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isSynced = String(item.syncStatus).toUpperCase() === "SYNCED";
  const gross = Number(Number(item.grossWeight || 0).toFixed(2));
  const net = Number(Number(item.netWeight ?? item.grossWeight ?? 0).toFixed(2));
  const deduction = Number(Math.max(0, gross - net).toFixed(2));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        
        <View style={{ backgroundColor: '#111f38', borderRadius: 32, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <View>
              <Text style={{ color: palette.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Collection Receipt</Text>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Delivery Details</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Pressable>
          </View>

          {/* Main Weight Stats */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' }}>
              <Text style={{ color: palette.muted, fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>GROSS</Text>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '900' }}>{gross.toFixed(2)}<Text style={{ fontSize: 12, fontWeight: '600' }}> kg</Text></Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: palette.accentGreen, fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>NET YIELD</Text>
              <Text style={{ color: palette.accentGreen, fontSize: 22, fontWeight: '900' }}>{net.toFixed(2)}<Text style={{ fontSize: 12, fontWeight: '600' }}> kg</Text></Text>
            </View>
          </View>

          {/* Detail Rows */}
          <View style={{ gap: 18 }}>
            <DetailRow label="Date & Time" value={`${dateStr}\n${timeStr}`} icon="calendar-outline" />
            <DetailRow label="Transport Agent" value={item.transportAgentName || "Assigned Agent"} icon="bus-outline" />
            <DetailRow 
              label="Quality Deduction" 
              value={deduction > 0.001 ? `-${deduction.toFixed(2)} kg` : "No deductions"} 
              valueColor={deduction > 0.001 ? '#e74c3c' : palette.muted} 
              icon="analytics-outline" 
            />
            {item.processedByName && (
              <DetailRow label="Processed By" value={item.processedByName} icon="shield-checkmark-outline" />
            )}
            <DetailRow label="Sync Status" value={isSynced ? "Fully Synced" : "Pending Sync"} valueColor={isSynced ? palette.accentGreen : '#f39c12'} icon="cloud-done-outline" />
          </View>

          {/* Footer Info */}
          <View style={{ marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 'bold' }}>ID: {item.collectionId || "REC-000000"}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, icon, valueColor = 'white' }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
        <Ionicons name={icon} size={18} color={palette.accentBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.muted, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: valueColor, fontSize: 14, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}


const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatKg = (value: number) => `${value} kg`;
const formatLKR = (value: number) => `Rs. ${Math.round(value).toLocaleString()}`;

const getSupplierId = (user: any) => user?.supplierId || user?.userId;
const getPassbookNo = (user: any) => user?.passbookNo || user?.passbook_no || null;

const normalizeLedger = (raw: any): SupplierLedger => {
  if (!raw || typeof raw !== "object") {
    return { currentDebt: 0, estimatedBalance: 0, advanceTaken: 0 };
  }

  return {
    currentDebt: toNumber(raw.currentDebt ?? raw.totalDebt ?? raw.outstanding ?? raw.deductions),
    estimatedBalance: toNumber(raw.estimatedBalance ?? raw.netBalance ?? raw.availableBalance ?? raw.netAmount),
    advanceTaken: toNumber(raw.advanceTaken ?? raw.totalAdvance ?? raw.advances),
  };
};

const fetchSupplierHistory = async (token: string, supplierId: string): Promise<SupplierHistoryItem[]> => {
  const data = await apiGet<SupplierHistoryItem[]>(`${CollectionAPI.history(supplierId)}?limit=250`, token);
  return Array.isArray(data) ? data : [];
};

const resolveSupplierIdentity = async (token: string, user: any): Promise<SupplierIdentity | null> => {
  const passbookNo = getPassbookNo(user);
  if (!token || !passbookNo) return null;

  const estateId = user?.estateId ? String(user.estateId) : undefined;
  const params = new URLSearchParams();
  params.set("search", passbookNo);
  params.set("limit", "20");
  if (estateId) params.set("estateId", estateId);

  const suppliers = await apiGet<any[]>(`${CollectionAPI.suppliers}?${params.toString()}`, token);
  const exactMatch = Array.isArray(suppliers)
    ? suppliers.find((item) => String(item?.passbookNo || "").trim().toLowerCase() === passbookNo.trim().toLowerCase())
    : null;

  if (!exactMatch?.supplierId) return null;

  return {
    supplierId: String(exactMatch.supplierId),
    fullName: String(exactMatch.fullName || user?.fullName || "Supplier"),
    passbookNo: String(exactMatch.passbookNo || passbookNo),
    estateId: exactMatch.estateId ? String(exactMatch.estateId) : undefined,
  };
};

export const getTranslation = (key: string, lang: 'en' | 'si' | string) => {
  const dict: any = {
    si: {
      "Hello": "ආයුබෝවන්",
      "Weekly Supply": "සතියේ දළු සැපයුම",
      "Current Debt": "දැනට ණය",
      "Advance": "ඇත්තිකාරම්",
      "Advances": "අත්තිකාරම්",
      "Estimated Balance": "ඇස්තමේන්තු ගත ඉතිරිය",
      "Fertilizer": "පොහොර",
      "Leaf Bags": "දළු බෑග්",
      "Tools": "මෙවලම්",
      "Transport": "ප්‍රවාහන",
      "Advisory": "උපදේශන",
      "Financial Overview": "මුල්‍ය දළ විශ්ලේෂණය",
      "Services & Support": "සේවාවන් සහ සහාය",
      "Online Status": "සබැඳි තත්ත්වය",
      "Recent History": "මෑත ඉතිහාසය",
      "View All →": "සියල්ල පෙන්වන්න →",
      "Loading history...": "පූරණය වෙමින්...",
      "No delivery history yet": "තවමත් බෙදාහැරීමේ ඉතිහාසයක් නොමැත",
      "Delivered": "ලබාදුන්",
      "Synced": "සමමුහුර්තයි",
      "Pending": "පොරොත්තු",
      "Net:": "ශුද්ධ:",
      "Supply History": "සැපයුම් ඉතිහාසය",
      "TOTAL GROSS": "මුළු දළ",
      "TOTAL NET": "මුළු ශුද්ධ",
      "DELIVERIES": "බෙදාහැරීම්",
      "Today": "අද",
      "Week": "සතිය",
      "Month": "මාසය",
      "All": "සියල්ල",
      "Payments": "ගෙවීම්",
      "Balance Payments": "ශේෂ ගෙවීම්",
      "Next Pay:": "මීළඟ ගෙවීම:",
      "Est.": "ඇස්තමේන්තු",
      "available": "ලබා ගත හැකිය",
      "Gross Earnings": "දළ ආදායම",
      "Deductions": "අඩු කිරීම්",
      "Net Amount": "ශුද්ධ මුදල",
      "Upcoming": "ඉදිරි",
      "Paid": "ගෙවන ලදී",
      "Debts & Deductions": "ණය සහ අඩු කිරීම්",
      "Current Outstanding": "දැනට ගෙවිය යුතු",
      "Estimated for next payout": "ඊළඟ ගෙවීම සඳහා ඇස්තමේන්තු කර ඇත",
      "How it works": "එය ක්‍රියා කරන ආකාරය",
      "Debts for services (fertilizer, tools) are deducted automatically.": "සේවාවන් සඳහා වූ ණය (පොහොර, මෙවලම්) නිරායාසයෙන්ම අඩු කරනු ලැබේ.",
      "DETAILED BREAKDOWN": "සවිස්තරාත්මක සාරාංශය",
      "Need clarification?": "පැහැදිලි කිරීමක් අවශ්‍යද?",
      "Speak to your Extension Officer about these charges.": "මෙම ගාස්තු පිළිබඳව ඔබේ ව්‍යාප්ති නිලධාරියා අමතන්න.",
      "My Profile": "මගේ ගිණුම",
      "Verified Supplier": "තහවුරු කළ සැපයුම්කරු",
      "Land Name": "ඉඩමෙහි නම",
      "In-Charge": "භාරකරු",
      "Pending Assignment": "පැවරීමට නියමිතයි",
      "Passbook No.": "පාස්පොත් අංකය",
      "Supplier ID": "සැපයුම්කරු අංකය",
      "ACCOUNT": "ගිණුම",
      "Language Preference": "භාෂා තේරීම",
      "Switch between Sinhala and English": "සිංහල සහ ඉංග්‍රීසි අතර මාරු වන්න",
      "Notifications": "දැනුම්දීම්",
      "All alerts enabled": "සියලුම දැනුම්දීම් සක්‍රීයයි",
      "Change Password": "මුරපදය වෙනස් කරන්න",
      "Direct Requests": "සෘජු ඉල්ලීම්",
      "Logistics & Requests": "ප්‍රවාහන සහ ඉල්ලීම්",
      "REQUEST CATEGORY": "ඉල්ලුම් වර්ගය",
      "Add new request": "නව ඉල්ලීමක්",
      "APPROVED": "අනුමතයි",
      "Amount": "මුදල",
      "Submitted": "ඉදිරිපත් කළා",
      "Supplier Note": "සැපයුම්කරුගේ සටහන",
      "Last changed 45 days ago": "අවසන් වරට වෙනස් කළේ දින 45 කට පෙර",
      "Contact Support": "සහාය අමතන්න",
      "Extension Officer": "ව්‍යාප්ති නිලධාරී",
      "Sign Out": "ඉවත් වන්න"
    }
  };
  return (lang === 'si' && dict.si[key]) ? dict.si[key] : key;
};

export function SupplierHomeScreen({ user, token, navigation, lang }: any) {
  const getPassbook = (u: any) => u?.passbookNo || u?.passbook_no || "N/A";
  const initials = user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SH";
  const fallbackSupplierId = getSupplierId(user);
  const passbookNo = getPassbookNo(user);

  const [history, setHistory] = useState<SupplierHistoryItem[]>([]);
  const [ledger, setLedger] = useState<SupplierLedger>({ currentDebt: 0, estimatedBalance: 0, advanceTaken: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(fallbackSupplierId || null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SupplierHistoryItem | null>(null);

  const _ = (key: string) => getTranslation(key, lang);


  useEffect(() => {
    const load = async () => {
      if (!token || !passbookNo) {
        setError("Missing supplier session data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const identity = await resolveSupplierIdentity(token, user).catch(() => null);
        const supplierId = identity?.supplierId || fallbackSupplierId;

        if (!supplierId) {
          setError("Unable to resolve supplier record. Please re-login.");
          setLoading(false);
          return;
        }

        setResolvedSupplierId(supplierId);
        setResolvedLabel(identity?.fullName || user?.fullName || null);

        const historyData = await fetchSupplierHistory(token, supplierId);
        setHistory(historyData);

        try {
          const ledgerData = await apiGet<any>(FinanceAPI.ledger(supplierId), token);
          setLedger(normalizeLedger(ledgerData));
        } catch {
          setLedger({ currentDebt: 0, estimatedBalance: 0, advanceTaken: 0 });
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load supplier dashboard data.");
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fallbackSupplierId, passbookNo, token, user]);

  const weekStats = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekItems = history.filter((item) => new Date(item.collectedAt).getTime() >= cutoff);
    const grossRaw = weekItems.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
    const gross = Math.round(grossRaw * 1000) / 1000;
    const syncedCount = weekItems.filter((item) => String(item.syncStatus).toUpperCase() === "SYNCED").length;

    return { gross, syncedCount };
  }, [history]);

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: "#5b61f2" }]}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{initials}</Text>
          </View>
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>{lang === 'si' ? 'ආයුබෝවන්' : 'Hello'}, {user?.fullName || "Supplier"} 👋</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: palette.muted, fontSize: 13 }}>SH-{user?.userId?.slice(-4) || "0000"} · {getPassbook(user)}</Text>
              <Text style={{ color: palette.accentGreen, fontSize: 13, fontWeight: "600", marginLeft: 8 }}>✓ Verified</Text>
            </View>
          </View>
          <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 15 }}>
            <Ionicons name="notifications-outline" size={24} color={palette.muted} />
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Ionicons name="log-out-outline" size={24} color={palette.muted} />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={styles.onlineBadge}><Ionicons name="globe-outline" size={14} color={palette.accentGreen} /><Text style={styles.onlineBadgeText}> {_("Online Status")}</Text></View>
          <Text style={{ color: palette.muted, fontSize: 12 }}>
            Last update: {loading ? "Syncing..." : error ? "Offline" : "Live"}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!!error && (
          <View style={[styles.infoBox, { marginBottom: 14, borderColor: "rgba(231,76,60,0.35)", borderWidth: 1 }]}> 
            <Ionicons name="warning-outline" size={18} color="#e74c3c" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#ff8b8b", fontSize: 12 }}>Could not refresh all backend data: {error}</Text>
              {!!resolvedSupplierId && <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Supplier record: {resolvedSupplierId}</Text>}
            </View>
          </View>
        )}

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Financial Overview").toUpperCase()}</Text>
        
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <View style={[styles.supCard, { borderTopColor: palette.accentGreen }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(31,190,87,0.1)" }]}><MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} /></View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Weekly Supply")}</Text>
            <Text style={styles.supCardValue}>{formatKg(weekStats.gross)}</Text>
            <Text style={styles.supCardSub}>{weekStats.syncedCount} deliveries synced</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: "#e74c3c" }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(231,76,60,0.1)" }]}><Ionicons name="clipboard-outline" size={20} color="#e74c3c" /></View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Current Debt")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.currentDebt)}</Text>
            <Text style={styles.supCardSub}>From finance ledger</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 25 }}>
          <View style={[styles.supCard, { borderTopColor: "#f39c12" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(243,156,18,0.1)" }]}><Ionicons name="wallet-outline" size={20} color="#f39c12" /></View>
              <View style={{ backgroundColor: palette.accentGreen, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>+ REQ</Text></View>
            </View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Advance")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.advanceTaken)}</Text>
            <Text style={styles.supCardSub}>From finance ledger</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: palette.accentBlue }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(46,168,255,0.1)" }]}><Ionicons name="cash-outline" size={20} color={palette.accentBlue} /></View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center" }}><Ionicons name="time-outline" size={10} color={palette.muted} /><Text style={{ color: palette.muted, fontSize: 10 }}> Pending</Text></View>
            </View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Estimated Balance")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.estimatedBalance)}</Text>
            <Text style={styles.supCardSub}>Live estimate</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Services & Support").toUpperCase()}</Text>
        
        {(() => {
          const services = [
            { title: _("Fertilizer"),     icon: { lib: "mc",  name: "sprout" },                      color: "#1fbe57", status: "Approved", statusIcon: "checkmark-circle-outline", hideStatus: false },
            { title: _("Leaf Bags"),  icon: { lib: "ion", name: "bag-handle-outline" },           color: "#00d2d3", status: "Pending",  statusIcon: "time-outline",             hideStatus: false },
            { title: "Circulars", icon: { lib: "ion", name: "document-text-outline" },        color: "#9b59b6", status: "New",      statusIcon: "notifications-outline",    hideStatus: false },
            { title: _("Transport"), icon: { lib: "mc",  name: "truck-delivery-outline" },       color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true  },
            { title: _("Advisory"),   icon: { lib: "ion", name: "chatbox-outline" },              color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true  },
            { title: "Settings",  icon: { lib: "ion", name: "settings-outline" },             color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true  },
          ];
          const renderCard = (item: typeof services[0], idx: number) => {
            const isColored = !item.hideStatus;
            return (
              <View key={idx} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: isColored ? `${item.color}20` : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: isColored ? `${item.color}35` : "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  {item.icon.lib === "mc"
                    ? <MaterialCommunityIcons name={item.icon.name as any} size={26} color={item.color} />
                    : <Ionicons name={item.icon.name as any} size={26} color={item.color} />}
                </View>
                <Text style={{ color: isColored ? item.color : "#c0cfe0", fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>{item.title}</Text>
                {!item.hideStatus && (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: `${item.color}15`, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 }}>
                    <Ionicons name={item.statusIcon as any} size={10} color={item.color} />
                    <Text style={{ color: item.color, fontSize: 9, marginLeft: 2 }}>{item.status}</Text>
                  </View>
                )}
              </View>
            );
          };
          return (
            <>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                {services.slice(0, 3).map(renderCard)}
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {services.slice(3, 6).map((item, idx) => renderCard(item, idx + 3))}
              </View>
            </>
          );
        })()}
        {/* RECENT HISTORY */}
        <View style={{ marginTop: 22, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Recent History").toUpperCase()}</Text>
            {history.length > 5 && (
              <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{_("View All →")}</Text>
            )}
          </View>

          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: palette.muted, fontSize: 13 }}>{_("Loading history...")}</Text>
            </View>
          )}

          {!loading && history.length === 0 && (
            <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
              <MaterialCommunityIcons name="leaf-off" size={28} color={palette.muted} />
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 8 }}>{_("No delivery history yet")}</Text>
            </View>
          )}

          {!loading && history.slice(0, 5).map((item, idx) => {
            const d = new Date(item.collectedAt);
            const dateStr = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
            const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
            const isSynced = String(item.syncStatus).toUpperCase() === "SYNCED";
            const isGPS = String(item.gpsStatus).toUpperCase() === "GPS";
            const netWt = item.netWeight ?? item.grossWeight;
            return (
              <Pressable 
                key={item.collectionId || idx} 
                onPress={() => setSelectedItem(item)}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderLeftWidth: 3, borderLeftColor: isSynced ? palette.accentGreen : "#f39c12" },
                  pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.08)" }
                ]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(31,190,87,0.12)", borderWidth: 1, borderColor: "rgba(31,190,87,0.25)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                    {_("Delivered")} {Number(item.grossWeight || 0).toFixed(2)} kg
                    {netWt && Math.abs(netWt - item.grossWeight) > 0.001 ? <Text style={{ color: palette.muted, fontWeight: "400", fontSize: 12 }}> ({_("Net:")} {Number(netWt).toFixed(2)} kg)</Text> : null}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 }}>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>{dateStr}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>·</Text>
                    <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{timeStr}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>·</Text>
                    <Ionicons name={isGPS ? "location" : "location-outline"} size={12} color={isGPS ? palette.accentGreen : palette.muted} />
                    <Text style={{ color: isSynced ? palette.accentGreen : "#f39c12", fontSize: 11, fontWeight: "600" }}>{isSynced ? _("Synced") : _("Pending")}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Pressable>
            );
          })}
        </View>

        <CollectionDetailModal 
          visible={!!selectedItem} 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          _={_} 
        />

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function SupplierSupplyScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Week");
  const [history, setHistory] = useState<SupplierHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fallbackSupplierId = getSupplierId(user);
  const passbookNo = getPassbookNo(user);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(fallbackSupplierId || null);
  const [selectedItem, setSelectedItem] = useState<SupplierHistoryItem | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token || !passbookNo) {
        setError("Missing supplier session data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const identity = await resolveSupplierIdentity(token, user).catch(() => null);
        const supplierId = identity?.supplierId || fallbackSupplierId;

        if (!supplierId) {
          setError("Unable to resolve supplier record. Please re-login.");
          setLoading(false);
          return;
        }

        setResolvedSupplierId(supplierId);

        const historyData = await fetchSupplierHistory(token, supplierId);
        setHistory(historyData);
      } catch (err: any) {
        setError(err?.message || "Failed to load supply history.");
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fallbackSupplierId, passbookNo, token, user]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return history.filter((item) => {
      const ts = new Date(item.collectedAt).getTime();
      if (activeTab === "Today") return ts >= startOfToday;
      if (activeTab === "Week") return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (activeTab === "Month") {
        const d = new Date(item.collectedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [activeTab, history]);

  const totals = useMemo(() => {
    const totalGross = filteredHistory.reduce((sum, item) => sum + toNumber(item.grossWeight), 0).toFixed(2);
    const totalNet = filteredHistory.reduce((sum, item) => sum + toNumber(item.netWeight ?? item.grossWeight), 0).toFixed(2);
    return {
      totalGross,
      totalNet,
      deliveries: filteredHistory.length,
    };
  }, [filteredHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Supply History")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        {!!error && (
          <View style={[styles.infoBox, { marginBottom: 12, borderColor: "rgba(231,76,60,0.35)", borderWidth: 1 }]}> 
            <Ionicons name="warning-outline" size={18} color="#e74c3c" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#ff8b8b", fontSize: 12 }}>Could not load supply history: {error}</Text>
              {!!resolvedSupplierId && <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Supplier record: {resolvedSupplierId}</Text>}
            </View>
          </View>
        )}

        <View style={styles.supplySummaryBox}>
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>{totals.totalGross}<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>{_("TOTAL GROSS")}</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>{totals.totalNet}<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>{_("TOTAL NET")}</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center", justifyContent: "center" }}>
             <Text style={styles.supplySummValue}>{totals.deliveries}</Text>
             <Text style={styles.supplySummLabel}>{_("DELIVERIES")}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {["Today", "Week", "Month", "All"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActiveSup]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActiveSup]}>{_(tab)}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.supplyHistItem}>
              <Text style={styles.supHistSub}>{_("Loading history...")}</Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={styles.supplyHistItem}>
              <Text style={styles.supHistSub}>{_("No delivery history yet")}</Text>
            </View>
          ) : filteredHistory.map((item) => (
            <Pressable 
              key={item.collectionId} 
              onPress={() => setSelectedItem(item)}
              style={({ pressed }) => [
                styles.supplyHistItem,
                pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.08)" }
              ]}
            >
              <View>
                <Text style={styles.supHistDate}>{formatDate(item.collectedAt)}</Text>
                <Text style={styles.supHistSub}>{formatTime(item.collectedAt)} · {String(item.gpsStatus || "NO_GPS") === "GPS" ? "GPS" : "No GPS"}</Text>
              </View>
              <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 10 }}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.supHistGross}>{Number(toNumber(item.grossWeight)).toFixed(2)} kg</Text>
                  <Text style={styles.supHistSub}>{_("Net:")} {Number(toNumber(item.netWeight ?? item.grossWeight)).toFixed(2)} kg</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} style={{ alignSelf: 'center' }} />
              </View>
            </Pressable>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      </View>

      <CollectionDetailModal 
        visible={!!selectedItem} 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        _={_} 
      />
    </View>
  );
}

export function SupplierPaymentsScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Balance Payments");
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supplierId = getSupplierId(user);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        setLoading(true);
        if (!supplierId) return;
        const [txRes, ledgerRes] = await Promise.all([
          apiGet<any[]>(FinanceAPI.ledgerTransactions(supplierId), token),
          apiGet<any>(FinanceAPI.ledger(supplierId), token)
        ]);
        setTransactions(txRes || []);
        setLedger(ledgerRes);
      } catch (err) {
        console.error("Failed to fetch payments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinances();
  }, [supplierId, token]);

  const payouts = transactions.filter((t) => t.transactionType === "PAYOUT");
  const advances = transactions.filter((t) => t.transactionType === "ADVANCE");

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getMonthName = (dateStr: string) => {
    if (!dateStr) return "Unknown Payout";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Payout`;
  };

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Payments")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.requestTabs}>
          <Pressable onPress={() => setActiveTab("Balance Payments")} style={[styles.reqTab, activeTab === "Balance Payments" && styles.reqTabActive]}>
            <Ionicons name="cash-outline" size={18} color={activeTab === "Balance Payments" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Balance Payments" && styles.reqTabTextActive]}>{_("Balance Payments")}</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab("Advances")} style={[styles.reqTab, activeTab === "Advances" && styles.reqTabActive]}>
            <Ionicons name="wallet-outline" size={18} color={activeTab === "Advances" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Advances" && styles.reqTabTextActive]}>{_("Advances")}</Text>
          </Pressable>
        </View>

        {activeTab === "Balance Payments" ? (
          <>
            <View style={styles.nextPayBox}>
              <Ionicons name="calendar-outline" size={24} color={palette.accentBlue} />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.nextPayTitle}>{_("Next Pay:")} 28 {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</Text>
                <Text style={styles.nextPaySub}>
                   {loading ? 'Calculating...' : `Est. Rs. ${(ledger?.estimatedBalance || 0).toLocaleString()} available`}
                </Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PENDING PAYOUT CARD (MATCHING MOCKUP) */}
              {!loading && payouts.length === 0 && ledger && (
                <View style={styles.paymentCard}>
                  <View style={styles.payCardHeader}>
                    <View>
                      <Text style={styles.payCardTitle}>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Payout</Text>
                      <Text style={styles.payCardId}>ID: PENDING</Text>
                    </View>
                    <View style={styles.statusBadgeGrey}>
                      <Ionicons name="time-outline" size={10} color="#f39c12" />
                      <Text style={[styles.statusBadgeTextGrey, { color: '#f39c12' }]}> {_("Pending")}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.payRow, { marginTop: 15 }]}>
                    <Text style={styles.payLabel}>{_("Gross Earnings")}</Text>
                    <Text style={styles.payVal}>Rs. {(ledger?.grossEarnings || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>{_("Deductions")}</Text>
                    <Text style={styles.payValRed}>-Rs. {((ledger?.currentDebt || 0) + (ledger?.advanceTaken || 0)).toLocaleString()}</Text>
                  </View>
                  
                  <View style={[styles.payDivider, { marginVertical: 15 }]} />
                  
                  <View style={styles.payRow}>
                    <Text style={[styles.payTotalLabel, { fontSize: 18 }]}>{_("Net Amount")}</Text>
                    <Text style={[styles.payTotalVal, { fontSize: 20, color: palette.accentGreen }]}>Rs. {(ledger?.estimatedBalance || 0).toLocaleString()}</Text>
                  </View>
                  
                  <Text style={[styles.payFooterTextYellow, { marginTop: 15, fontWeight: 'bold' }]}>
                    Upcoming: 28 {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </Text>
                </View>
              )}

              {payouts.map((t, idx) => (
                <View key={idx} style={styles.paymentCard}>
                  <View style={styles.payCardHeader}>
                    <View>
                      <Text style={styles.payCardTitle}>{getMonthName(t.transactionDate)}</Text>
                      <Text style={styles.payCardId}>ID: {t.transactionId?.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={styles.statusBadgeGrey}><Ionicons name={t.status === 'CLEARED' ? "layers-outline" : "time-outline"} size={10} color={palette.muted} /><Text style={styles.statusBadgeTextGrey}> {t.status === 'CLEARED' ? _("Paid") : _(t.status.charAt(0) + t.status.slice(1).toLowerCase())}</Text></View>
                  </View>
                  <View style={styles.payRow}><Text style={styles.payLabel}>{_("Gross Earnings")}</Text><Text style={styles.payVal}>Rs. {t.grossAmount || (t.amount + (t.deductions || 0))}</Text></View>
                  <View style={styles.payRow}><Text style={styles.payLabel}>{_("Deductions")}</Text><Text style={styles.payValRed}>-Rs. {t.deductions || 0}</Text></View>
                  <View style={styles.payDivider} />
                  <View style={styles.payRow}><Text style={styles.payTotalLabel}>{_("Net Amount")}</Text><Text style={styles.payTotalVal}>Rs. {t.amount}</Text></View>
                  <Text style={t.status === 'CLEARED' ? styles.payFooterTextDim : styles.payFooterTextYellow}>
                    {t.status === 'CLEARED' ? `Finalized on ${formatDate(t.transactionDate)}` : `Upcoming: 28 ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </Text>
                </View>
              ))}
              
              {payouts.length === 0 && !loading && !ledger && (
                <Text style={{color: palette.muted, textAlign: 'center', marginTop: 40}}>No payouts history available.</Text>
              )}
              <View style={{height: 100}} />
            </ScrollView>
          </>
        ) : (
          <>
            <Pressable style={[styles.mainBtn, {backgroundColor: palette.success}]} onPress={() => navigation.navigate('DirectRequests')}>
              <Text style={styles.mainBtnText}>+ {_("New Advance Request")}</Text>
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} style={{marginTop: 20}}>
              {advances.map((t, idx) => (
                <View key={idx} style={styles.paymentCard}>
                  <View style={styles.payCardHeader}>
                    <View>
                      <Text style={styles.payCardTitle}>Rs. {t.amount}</Text>
                      <Text style={styles.payCardId}>ADV-{t.transactionId?.slice(0, 4).toUpperCase()} · {formatDate(t.transactionDate)}</Text>
                    </View>
                    <View style={styles.statusBadgeGrey}><Ionicons name="checkmark-circle-outline" size={12} color={palette.muted} /><Text style={styles.statusBadgeTextGrey}> {t.status === 'CLEARED' ? _("Cleared") : _(t.status.charAt(0) + t.status.slice(1).toLowerCase())}</Text></View>
                  </View>
                  <View style={styles.payRow}><Text style={styles.payLabel}>{_("Approved by")}</Text><Text style={styles.payVal}>{t.approverName || "—"}</Text></View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>{_("Remaining")}</Text>
                    {t.status === 'CLEARED' ? (
                      <Text style={{color: palette.success, fontWeight: "600"}}>✓ Cleared</Text>
                    ) : (
                      <Text style={styles.payValRed}>Rs. {t.remaining || t.amount}</Text>
                    )}
                  </View>
                </View>
              ))}
              {advances.length === 0 && !loading && (
                <Text style={{color: palette.muted, textAlign: 'center', marginTop: 40}}>No advance history available.</Text>
              )}
              <View style={{height: 100}} />
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}


export function SupplierDebtsScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const supplierId = getSupplierId(user);
  const [ledger, setLedger] = useState<any>(null);
  const [debtItems, setDebtItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supplierId) return;
      try {
        const passbookNo = user?.passbookNo || user?.passbook_no;
        const qp = new URLSearchParams();
        if (supplierId) qp.set("supplierId", String(supplierId));
        if (passbookNo) qp.set("passbookNo", passbookNo);
        qp.set("limit", "120");

        const [ledgerData, txData, reqData] = await Promise.all([
          apiGet<any>(FinanceAPI.ledger(supplierId), token).catch(() => null),
          apiGet<any[]>(FinanceAPI.ledgerTransactions(supplierId), token).catch(() => []),
          apiGet<any[]>(`${ServicesAPI.history}?${qp.toString()}`, token).catch(() => []),
        ]);
        setLedger(ledgerData);

        // 1. Process Ledger Debts
        const ledgerDebts = (txData || []).filter((t: any) => 
          (t.transactionType === 'DEBT' || t.transactionType === 'ADVANCE') && 
          t.amount > 0 && 
          !t.description?.toUpperCase().includes('ADVISORY')
        );

        // 2. Process Approved/Dispatched Requests
        const pendingReqs = (reqData || []).filter((r: any) => 
          (r.status === 'APPROVED' || r.status === 'DISPATCHED' || r.status === 'APPROVED_BY_EXT' || r.status === 'COMPLETED') &&
          r.requestType !== 'ADVISORY'
        ).map(r => ({
          transactionDate: r.updatedAt || r.requestDate,
          description: r.requestType === 'FERTILIZER' ? `FERTILIZER: ${r.fertilizerItems?.map((f:any)=>f.type).join(', ') || 'Fertilizer'}` : r.requestType,
          // Extract amount from any field used by the system
          amount: Number(r.requestedAmount || r.totalDeduction || r.estimatedCost || r.amount || r.totalAmount || r.cost || 0), 
          isRequest: true,
          status: r.status,
          requestId: r.requestId
        }));

        // 3. Robust Deduplication: Prevent doubling by matching exact category and amount
        const finalItems: any[] = [];
        const seenItems = new Set<string>();

        // Step A: Load all Ledger items first (Source of Truth)
        ledgerDebts.forEach(ld => {
          const cat = getCategoryInfo(ld.description).label;
          const key = `${cat}_${Number(ld.amount)}`;
          seenItems.add(key);
          finalItems.push(ld);
        });

        // Step B: Only add requests if we haven't seen this exact category + amount combo
        pendingReqs.forEach(req => {
          const cat = getCategoryInfo(req.description).label;
          const key = `${cat}_${Number(req.amount)}`;
          
          // Always allow if we haven't seen this exact amount in this category yet
          if (!seenItems.has(key)) {
            finalItems.push(req);
            seenItems.add(key);
          }
        });

        setDebtItems(finalItems);

      } catch (err) {
        console.error('Debts load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supplierId, token]);

  const debtIconMap: Record<string, string> = {
    FERTILIZER: 'leaf', LEAF_BAG: 'bag-handle-outline', ADVANCE: 'wallet-outline',
    TRANSPORT: 'car-outline', TOOL_RENT: 'construct-outline', TOOL_PURCHASE: 'construct-outline',
  };
  const debtColorMap: Record<string, string> = {
    FERTILIZER: palette.accentGreen, LEAF_BAG: palette.accentBlue, ADVANCE: '#f39c12',
    TRANSPORT: '#607b96', TOOL_RENT: '#9b59b6', TOOL_PURCHASE: '#9b59b6',
  };

  const getCategoryInfo = (desc: string) => {
    const d = desc?.toUpperCase() || '';
    if (d.includes('FERTILIZER')) return { label: _("Fertilizer"), icon: 'leaf', color: '#2ecc71', sub: desc };
    if (d.includes('BAG')) return { label: _("Leaf Bags"), icon: 'bag-handle-outline', color: '#3498db', sub: desc };
    if (d.includes('ADVANCE')) return { label: _("Advance"), icon: 'wallet-outline', color: '#f39c12', sub: desc };
    if (d.includes('TOOL')) return { label: _("Tools"), icon: 'construct-outline', color: '#9b59b6', sub: desc };
    if (d.includes('TRANSPORT')) return { label: _("Transport"), icon: 'car-outline', color: '#e67e22', sub: desc };
    return { label: desc || _("Other"), icon: 'receipt-outline', color: '#95a5a6', sub: desc };
  };

  const totalOutstanding = debtItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={localStyles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={localStyles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={localStyles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={localStyles.headerTitle}>{_("Debts & Deductions")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* OUTSTANDING CARD (MOCKUP STYLE) */}
        <View style={localStyles.debtSummaryCard}>
          <Text style={localStyles.debtTitle}>{_("Current Outstanding")}</Text>
          <Text style={localStyles.debtAmount}>{loading ? '...' : `Rs. ${totalOutstanding.toLocaleString()}`}</Text>
          <Text style={localStyles.debtSubTitle}>{_("Estimated for next payout")}</Text>
        </View>

        {/* HOW IT WORKS (MOCKUP STYLE) */}
        <View style={localStyles.infoBox}>
          <Ionicons name="information-circle" size={24} color={palette.accentBlue} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={localStyles.infoBoxTitle}>{_("How it works")}</Text>
            <Text style={localStyles.infoBoxText}>{_("Debts for services (fertilizer, tools) are deducted automatically.")}</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 13, color: palette.muted, letterSpacing: 1, marginTop: 10, textTransform: 'uppercase' }]}>{_("Detailed Breakdown")}</Text>

        {loading ? (
          <ActivityIndicator color={palette.accentBlue} style={{ marginVertical: 30 }} />
        ) : debtItems.length === 0 ? (
          <View style={localStyles.debtItemRow}>
            <Text style={{ color: palette.muted, flex: 1, textAlign: 'center' }}>{_("No outstanding debts found.")}</Text>
          </View>
        ) : (
          (() => {
            // Group and sum debts
            const groups: Record<string, { label: string, icon: string, color: string, amount: number, date: Date, items: any[] }> = {};
            
            debtItems.forEach(item => {
              const info = getCategoryInfo(item.description);
              const key = info.label;
              if (!groups[key]) {
                groups[key] = { ...info, amount: 0, date: new Date(item.transactionDate), items: [] };
              }
              groups[key].amount += Number(item.amount || 0);
              groups[key].items.push(item);
              // Keep the latest date
              const itemDate = new Date(item.transactionDate);
              if (itemDate > groups[key].date) groups[key].date = itemDate;
            });

            return Object.values(groups).map((group, idx) => {
              const dateStr = group.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const isExpanded = expandedCategory === group.label;
              
              return (
                <View key={idx} style={[localStyles.debtCardContainer, isExpanded && { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                  <Pressable 
                    onPress={() => setExpandedCategory(isExpanded ? null : group.label)}
                    style={localStyles.debtItemRow}
                  >
                    <View style={[localStyles.debtIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Ionicons name={group.icon as any} size={22} color={group.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.debtItemTitle}>{group.label}</Text>
                      <Text style={localStyles.debtItemDate}>{dateStr}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={localStyles.debtItemVal}>Rs. {group.amount.toLocaleString()}</Text>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color={palette.muted} 
                        style={{ marginLeft: 10 }} 
                      />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={localStyles.expandedContent}>
                      <View style={localStyles.divider} />
                      {group.items.map((item, iIdx) => (
                        <View key={iIdx} style={localStyles.subItemRow}>
                          <Text style={localStyles.subItemTitle}>{item.description?.replace(/FERTILIZER: /g, '') || group.label}</Text>
                          <Text style={localStyles.subItemVal}>Rs. {Number(item.amount || 0).toLocaleString()}</Text>
                        </View>
                      ))}
                      
                      <Pressable style={localStyles.historyLink}>
                        <Text style={localStyles.historyLinkText}>Full Transaction History →</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            });
          })()
        )}

        {/* CLARIFICATION BOX (MOCKUP STYLE) */}
        <View style={localStyles.clarifyBox}>
          <Ionicons name="chatbubble-ellipses" size={24} color={palette.accentGreen} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={localStyles.clarifyTitle}>{_("Need clarification?")}</Text>
            <Text style={localStyles.clarifyText}>{_("Speak to your Extension Officer about these charges.")}</Text>
          </View>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  dashboardWrap: { flex: 1, backgroundColor: "#061224" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, paddingHorizontal: 20 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  iconBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12 },
  sectionHeader: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  
  debtSummaryCard: { 
    backgroundColor: "rgba(130, 20, 20, 0.4)", 
    borderRadius: 32, 
    padding: 35, 
    alignItems: "center", 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: "rgba(255, 107, 107, 0.2)" 
  },
  debtTitle: { color: "#fff", fontSize: 16, marginBottom: 15, fontWeight: '500' },
  debtAmount: { color: "#ff8a8a", fontSize: 48, fontWeight: "900", marginBottom: 12 },
  debtSubTitle: { color: "rgba(255,255,255,0.7)", fontSize: 15 },

  infoBox: { 
    flexDirection: "row", 
    backgroundColor: "#11223b", 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: "rgba(46, 168, 255, 0.15)",
    alignItems: 'center'
  },
  infoBoxTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  infoBoxText: { color: "#7f9cc5", fontSize: 13, lineHeight: 20 },

  debtItemRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#111f38", 
    padding: 18, 
    borderRadius: 24, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.04)" 
  },
  debtIconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 18 
  },
  debtItemTitle: { color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  debtItemDate: { color: "#7f9cc5", fontSize: 13 },
  debtItemVal: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  debtCardContainer: { 
    borderRadius: 24, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.04)",
    overflow: 'hidden',
    backgroundColor: "#111f38",
  },
  expandedContent: {
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 15,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 5
  },
  subItemTitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500'
  },
  subItemVal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyLink: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)'
  },
  historyLinkText: {
    color: '#7f9cc5',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5
  },

  clarifyBox: { 
    flexDirection: "row", 
    backgroundColor: "rgba(31, 190, 87, 0.08)", 
    padding: 20, 
    borderRadius: 24, 
    marginTop: 15, 
    borderWidth: 1, 
    borderColor: "rgba(31, 190, 87, 0.2)",
    alignItems: 'center'
  },
  clarifyTitle: { color: "#2ecc71", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  clarifyText: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 20 },
});

export function SupplierProfileScreen({ user, navigation, lang, setLang }: any) {
  const getPassbook = (u: any) => u?.passbookNo || u?.passbook_no || "N/A";
  const initials = user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SH";
  const _ = (key: string) => getTranslation(key, lang);

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{width: 40}} />
          <Text style={styles.headerTitle}>{_("My Profile")}</Text>
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
          <Text style={styles.profileName}>{user?.fullName || "Supplier"}</Text>
          <View style={styles.supplierBadge}>
            <Ionicons name="checkmark-circle-outline" size={14} color={palette.accentBlue} />
            <Text style={styles.supplierBadgeText}> {_("Verified Supplier")}</Text>
          </View>
          <View style={styles.supProfileIdBadge}>
            <Text style={styles.supProfileIdText}>SH-{user?.userId?.slice(-4) || "0000"} · {getPassbook(user)}</Text>
          </View>
        </View>

        <View style={styles.supDetailsBox}>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Land Name")}</Text><Text style={styles.supDetailVal}>{user?.estateName || "Not Assigned"}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("In-Charge")}</Text><Text style={styles.supDetailVal}>{user?.inChargeName || _("Pending Assignment")}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Passbook No.")}</Text><Text style={styles.supDetailVal}>{getPassbook(user)}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Supplier ID")}</Text><Text style={styles.supDetailVal}>SH-{user?.userId?.slice(-4) || "0000"}</Text></View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>{_("ACCOUNT")}</Text>
        
        <View style={{ gap: 12 }}>
          {lang !== undefined && (
            <Pressable 
              style={[styles.settingItem, { borderColor: palette.accentBlue, borderWidth: 1 }]} 
              onPress={() => setLang(lang === 'en' ? 'si' : 'en')}
            >
              <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="language" size={20} color={palette.accentBlue} /></View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.settingItemTitle}>{_("Language Preference")}</Text>
                <Text style={styles.settingItemSub}>{_("Switch between Sinhala and English")}</Text>
              </View>
              <Text style={{ color: palette.accentBlue, fontWeight: "800", fontSize: 13, marginRight: 8 }}>{lang === 'en' ? 'ENGLISH' : 'SINHALA'}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.accentBlue} />
            </Pressable>
          )}

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(243, 156, 18, 0.15)" }]}><Ionicons name="notifications-outline" size={20} color="#f39c12" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Notifications")}</Text><Text style={styles.settingItemSub}>{_("All alerts enabled")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}><Ionicons name="lock-closed-outline" size={20} color="#e74c3c" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Change Password")}</Text><Text style={styles.settingItemSub}>{_("Last changed 45 days ago")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="chatbox-ellipses-outline" size={20} color={palette.accentBlue} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Contact Support")}</Text><Text style={styles.settingItemSub}>{_("Extension Officer")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <Pressable style={styles.settingItem} onPress={() => navigation.navigate("Login")}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}><Ionicons name="log-out-outline" size={20} color={palette.muted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Sign Out")}</Text><Text style={styles.settingItemSub}>{user?.fullName} · SH-{user?.userId?.slice(-4)}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}
