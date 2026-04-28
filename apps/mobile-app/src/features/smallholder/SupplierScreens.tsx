import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, FinanceAPI, apiGet } from "../../services/api";

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

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatKg = (value: number) => `${value.toFixed(1)} kg`;
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
    const gross = weekItems.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
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
              <View key={item.collectionId || idx} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderLeftWidth: 3, borderLeftColor: isSynced ? palette.accentGreen : "#f39c12" }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(31,190,87,0.12)", borderWidth: 1, borderColor: "rgba(31,190,87,0.25)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                    {_("Delivered")} {Number(item.grossWeight || 0).toFixed(1)} kg
                    {netWt && netWt !== item.grossWeight ? <Text style={{ color: palette.muted, fontWeight: "400", fontSize: 12 }}> ({_("Net:")} {Number(netWt).toFixed(1)} kg)</Text> : null}
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
              </View>
            );
          })}
        </View>

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
    const totalGross = filteredHistory.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
    const totalNet = filteredHistory.reduce((sum, item) => sum + toNumber(item.netWeight ?? item.grossWeight), 0);
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
             <Text style={styles.supplySummValue}>{totals.totalGross.toFixed(1)}<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>{_("TOTAL GROSS")}</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>{totals.totalNet.toFixed(1)}<Text style={styles.supplySummUnit}> kg</Text></Text>
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
            <View key={item.collectionId} style={styles.supplyHistItem}>
              <View>
                <Text style={styles.supHistDate}>{formatDate(item.collectedAt)}</Text>
                <Text style={styles.supHistSub}>{formatTime(item.collectedAt)} · {String(item.gpsStatus || "NO_GPS") === "GPS" ? "GPS" : "No GPS"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.supHistGross}>{formatKg(toNumber(item.grossWeight))}</Text>
                <Text style={styles.supHistSub}>{_("Net:")} {toNumber(item.netWeight ?? item.grossWeight).toFixed(1)} kg</Text>
              </View>
            </View>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    </View>
  );
}

export function SupplierPaymentsScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Balance Payments");
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supplierId = getSupplierId(user);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        setLoading(true);
        if (!supplierId) return;
        const txRes = await apiGet<any[]>(FinanceAPI.ledgerTransactions(supplierId), token);
        setTransactions(txRes || []);
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
                <Text style={styles.nextPaySub}>{_("Est. Balance Computation")}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
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
              {payouts.length === 0 && !loading && (
                <Text style={{color: palette.muted, textAlign: 'center', marginTop: 40}}>No payouts history available.</Text>
              )}
              <View style={{height: 100}} />
            </ScrollView>
          </>
        ) : (
          <>
            <Pressable style={[styles.mainBtn, {backgroundColor: palette.success}]} onPress={() => {}}>
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
                  <View style={styles.payRow}><Text style={styles.payLabel}>{_("Approved by")}</Text><Text style={styles.payVal}>{t.approverId ? "Mgr" : "Ext. Officer"}</Text></View>
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


export function SupplierDebtsScreen({ user, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Debts & Deductions")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.debtSummaryCard}>
          <Text style={styles.debtTitle}>{_("Current Outstanding")}</Text>
          <Text style={styles.debtAmount}>Rs. 7,800</Text>
          <Text style={styles.debtSubTitle}>{_("Estimated for next payout")}</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={palette.accentBlue} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.infoBoxTitle}>{_("How it works")}</Text>
            <Text style={styles.infoBoxText}>{_("Debts for services (fertilizer, tools) are deducted automatically.")}</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>{_("DETAILED BREAKDOWN")}</Text>

        {[
          { title: _("Fertilizer"), date: "15 Feb 2026", amt: "Rs. 3,200", icon: "leaf", color: palette.accentGreen },
          { title: _("Leaf Bags"), date: "10 Feb 2026", amt: "Rs. 2,600", icon: "bag-handle-outline", color: palette.accentBlue },
          { title: _("Advance"), date: "01 Feb 2026", amt: "Rs. 2,000", icon: "wallet-outline", color: "#f39c12" },
        ].map((item, idx) => (
          <View key={idx} style={styles.debtItemRow}>
            <View style={styles.debtIconBox}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.debtItemTitle}>{item.title}</Text>
              <Text style={styles.debtItemDate}>{item.date}</Text>
            </View>
            <Text style={styles.debtItemVal}>{item.amt}</Text>
            <Ionicons name="chevron-down" size={16} color={palette.muted} style={{ marginLeft: 10 }} />
          </View>
        ))}

        <View style={styles.clarifyBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={palette.accentGreen} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.clarifyTitle}>{_("Need clarification?")}</Text>
            <Text style={styles.clarifyText}>{_("Speak to your Extension Officer about these charges.")}</Text>
          </View>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

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
