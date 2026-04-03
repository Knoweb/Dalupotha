import React, { useState } from "react";
import {
  Platform, Pressable, SafeAreaView, ScrollView,
  Text, TextInput, View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

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

// ─────────────────────────────────────────────────────────────
// Dashboard Screen
// ─────────────────────────────────────────────────────────────

export function DashboardScreen({ user, role, navigation }: any) {
  const initials = user?.fullName?.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const kpis = [
    { label: "KG Today",    value: "1,240 kg", icon: "leaf-outline" as const,        color: palette.accentGreen },
    { label: "Suppliers",   value: "14",       icon: "people-outline" as const,      color: palette.accentBlue  },
    { label: "Pending Sync",value: "3",        icon: "cloud-upload-outline" as const, color: "#f39c12"           },
    { label: "This Month",  value: "22,450 kg",icon: "stats-chart-outline" as const, color: "#9b59b6"           },
  ];

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

        {/* Recent Collections */}
        <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>Recent Collections</Text>
        {[
          { initial: "J", bg: "#2ea8ff", name: "Jayasekara, R.", id: "SH-0142", weight: "87.5 kg", time: "09:14 AM", badges: [{ type: "gps", text: "GPS" }, { type: "synced", text: "Synced" }] },
          { initial: "P", bg: "#4267b2", name: "Perera, D.W.", id: "SH-0089", weight: "124 kg", time: "09:52 AM", badges: [{ type: "gps", text: "GPS" }, { type: "queued", text: "Queued" }] },
          { initial: "S", bg: "#4267b2", name: "Silva, M.K.", id: "SH-0231", weight: "63 kg", time: "10:30 AM", badges: [{ type: "nogps", text: "No GPS" }, { type: "failed", text: "Failed" }] },
        ].map((item, idx) => (
          <View key={idx} style={styles.collectionItemCard}>
            <View style={[styles.collectionAvatarCompact, { backgroundColor: item.bg }]}>
              <Text style={styles.collectionAvatarText}>{item.initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardItemTitle}>{item.name}</Text>
              <Text style={styles.cardItemSub}>{item.id}</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {item.badges.map((b, i) => <StatusBadge key={i} type={b.type} text={b.text} />)}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardWeight}>{item.weight}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
          </View>
        ))}

        {/* New Collection CTA */}
        <Pressable style={[styles.newReqBtn, { marginTop: 20 }]} onPress={() => navigation.navigate("CollectionInput")}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.newReqBtnText}>New Collection</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Collections Screen
// ─────────────────────────────────────────────────────────────

export function CollectionsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState("All");
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
          <TextInput placeholder="Search by name, ID or passbook..." placeholderTextColor={palette.muted} style={styles.searchInput} />
        </View>
        <View style={styles.filterRow}>
          {["All", "Synced", "Queued", "Failed"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { initial: "J", bg: "#2ea8ff", name: "Jayasekara, R.", id: "SH-0142", weight: "87.5 kg", time: "09:14 AM", badges: [{ type: "gps", text: "GPS" }, { type: "synced", text: "Synced" }] },
            { initial: "P", bg: "#4267b2", name: "Perera, D.W.", id: "SH-0089", weight: "124 kg", time: "09:52 AM", badges: [{ type: "gps", text: "GPS" }, { type: "queued", text: "Queued" }] },
            { initial: "S", bg: "#4267b2", name: "Silva, M.K.", id: "SH-0231", weight: "63 kg", time: "10:30 AM", badges: [{ type: "nogps", text: "No GPS" }, { type: "failed", text: "Failed" }, { type: "manual", text: "Manual" }] },
            { initial: "F", bg: "#4267b2", name: "Fernando, L.", id: "SH-0077", weight: "201.5 kg", time: "11:05 AM", badges: [{ type: "gps", text: "GPS" }, { type: "synced", text: "Synced" }] },
            { initial: "B", bg: "#4267b2", name: "Bandara, S.", id: "SH-0315", weight: "95 kg", time: "11:44 AM", badges: [{ type: "gps", text: "GPS" }, { type: "syncing", text: "Syncing" }] },
            { initial: "K", bg: "#4267b2", name: "Kumari, T.", id: "SH-0412", weight: "72.5 kg", time: "12:20 PM", badges: [{ type: "gps", text: "GPS" }, { type: "queued", text: "Queued" }] },
          ].map((item, idx) => (
            <View key={idx} style={styles.collectionItemCard}>
              <View style={[styles.collectionAvatarCompact, { backgroundColor: item.bg }]}><Text style={styles.collectionAvatarText}>{item.initial}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>{item.name}</Text>
                <Text style={styles.cardItemSub}>{item.id}</Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {item.badges.map((b, i) => <StatusBadge key={i} type={b.type} text={b.text} />)}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardWeight}>{item.weight}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
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

export function RequestsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState("Advance");
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Requests</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.requestTabs}>
          <Pressable onPress={() => setActiveTab("Advance")} style={[styles.reqTab, activeTab === "Advance" && styles.reqTabActive]}>
            <Ionicons name="wallet-outline" size={18} color={activeTab === "Advance" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Advance" && styles.reqTabTextActive]}>Advance</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab("Fertilizer")} style={[styles.reqTab, activeTab === "Fertilizer" && styles.reqTabActive]}>
            <MaterialCommunityIcons name="leaf" size={18} color={activeTab === "Fertilizer" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Fertilizer" && styles.reqTabTextActive]}>Fertilizer</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { name: "Jayasekara, R.", id: "SH-0142 · ADV-001", status: "APPROVED", amount: "Rs. 15,000", date: "21 Feb 2026", footerLabel: "Approved by", footerDesc: "Ext. Off. Nimal", footerColor: palette.accentGreen },
            { name: "Bandara, S.", id: "SH-0315 · ADV-002", status: "PENDING", amount: "Rs. 8,000", date: "22 Feb 2026", footerLabel: "Status", footerDesc: "Awaiting approval", footerColor: "#f39c12" },
            { name: "Silva, M.K.", id: "SH-0231 · ADV-003", status: "REJECTED", amount: "Rs. 12,000", date: "19 Feb 2026", footerLabel: "Reason", footerDesc: "Limit exceeded", footerColor: "#e74c3c" },
          ].map((item, idx) => (
            <View key={idx} style={styles.reqCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                <View>
                  <Text style={styles.cardItemTitle}>{item.name}</Text>
                  <Text style={styles.cardItemSub}>{item.id}</Text>
                </View>
                <View style={[styles.statusBadge,
                  item.status === "APPROVED" ? { backgroundColor: "rgba(31,190,87,0.15)" } :
                  item.status === "PENDING"  ? { backgroundColor: "rgba(243,156,18,0.15)" } :
                  { backgroundColor: "rgba(231,76,60,0.15)" }
                ]}>
                  <Text style={[styles.statusBadgeText,
                    item.status === "APPROVED" ? { color: palette.accentGreen } :
                    item.status === "PENDING"  ? { color: "#f39c12" } :
                    { color: "#e74c3c" }
                  ]}>{item.status}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.reqCardLabel}>Amount</Text>
                <Text style={styles.reqCardValue}>{item.amount}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                <Text style={styles.reqCardLabel}>Date</Text>
                <Text style={styles.reqCardValue}>{item.date}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.reqCardLabel}>{item.footerLabel}</Text>
                <Text style={[styles.reqCardValue, { color: item.footerColor }]}>{item.footerDesc}</Text>
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <View style={styles.floatingBottom}>
        <Pressable style={styles.newReqBtn}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.newReqBtnText}>New Advance Request</Text>
        </Pressable>
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#f39c12" />
          <Text style={styles.warningText}>Only for suppliers under your in-charge assignment</Text>
        </View>
      </View>
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
