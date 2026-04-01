import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

export function SupplierHomeScreen({ navigation }: any) {
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: "#5b61f2" }]}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>SB</Text>
          </View>
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>Hello, Sunil Bandara 👋</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: palette.muted, fontSize: 13 }}>SH-1042 · PB-0934</Text>
              <Text style={{ color: palette.accentGreen, fontSize: 13, fontWeight: "600", marginLeft: 8 }}>✓ Verified</Text>
            </View>
          </View>
          <View style={{ marginLeft: "auto", flexDirection: "row", gap: 15 }}>
            <Ionicons name="notifications-outline" size={24} color={palette.muted} />
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Ionicons name="log-out-outline" size={24} color={palette.muted} />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={styles.onlineBadge}><Ionicons name="globe-outline" size={14} color={palette.accentGreen} /><Text style={styles.onlineBadgeText}> Online Status</Text></View>
          <Text style={{ color: palette.muted, fontSize: 12 }}>Last update: Today · 12:58 PM</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>FINANCIAL OVERVIEW</Text>
        
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <View style={[styles.supCard, { borderTopColor: palette.accentGreen }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(31,190,87,0.1)" }]}><MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} /></View>
            <Text style={styles.supCardLabel}>THIS WEEK SUPPLY</Text>
            <Text style={styles.supCardValue}>275.6 kg</Text>
            <Text style={styles.supCardSub}>3 deliveries synced</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: "#e74c3c" }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(231,76,60,0.1)" }]}><Ionicons name="clipboard-outline" size={20} color="#e74c3c" /></View>
            <Text style={styles.supCardLabel}>CURRENT DEBT</Text>
            <Text style={styles.supCardValue}>Rs. 7,850</Text>
            <Text style={styles.supCardSub}>Tap to view details</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 25 }}>
          <View style={[styles.supCard, { borderTopColor: "#f39c12" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(243,156,18,0.1)" }]}><Ionicons name="wallet-outline" size={20} color="#f39c12" /></View>
              <View style={{ backgroundColor: palette.accentGreen, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>+ REQ</Text></View>
            </View>
            <Text style={styles.supCardLabel}>ADVANCE TAKEN</Text>
            <Text style={styles.supCardValue}>Rs. 8,000</Text>
            <Text style={styles.supCardSub}>February 2026</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: palette.accentBlue }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(46,168,255,0.1)" }]}><Ionicons name="cash-outline" size={20} color={palette.accentBlue} /></View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center" }}><Ionicons name="time-outline" size={10} color={palette.muted} /><Text style={{ color: palette.muted, fontSize: 10 }}> Pending</Text></View>
            </View>
            <Text style={styles.supCardLabel}>EST. BALANCE</Text>
            <Text style={styles.supCardValue}>Rs. 12,420</Text>
            <Text style={styles.supCardSub}>Pay date: 28 Feb</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>SERVICES & SUPPORT</Text>
        
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.serviceCard}>
            <View style={[styles.serviceIcon, {borderColor: palette.accentGreen}]}><MaterialCommunityIcons name="leaf" size={24} color={palette.accentGreen} /></View>
            <Text style={styles.serviceTitle}>Fertilizer</Text>
            <View style={styles.serviceBadge}><Ionicons name="checkmark-circle-outline" size={12} color={palette.muted} /><Text style={styles.serviceBadgeText}> Approved</Text></View>
          </View>
          <View style={styles.serviceCard}>
            <View style={[styles.serviceIcon, {borderColor: palette.accentBlue}]}><Ionicons name="bag-handle-outline" size={24} color={palette.accentBlue} /></View>
            <Text style={styles.serviceTitle}>Leaf Bags</Text>
            <View style={styles.serviceBadge}><Ionicons name="time-outline" size={12} color={palette.muted} /><Text style={styles.serviceBadgeText}> Pending</Text></View>
          </View>
          <View style={styles.serviceCard}>
            <View style={[styles.serviceIcon, {borderColor: "#9b59b6"}]}><Ionicons name="document-text-outline" size={24} color="#9b59b6" /></View>
            <Text style={styles.serviceTitle}>Circulars</Text>
            <View style={styles.serviceBadge}><Ionicons name="notifications-outline" size={12} color={palette.muted} /><Text style={styles.serviceBadgeText}> New</Text></View>
          </View>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function SupplierSupplyScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState("Week");
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Supply History</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.supplySummaryBox}>
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>788.5<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>TOTAL GROSS</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>770.5<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>TOTAL NET</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center", justifyContent: "center" }}>
             <Text style={styles.supplySummValue}>7</Text>
             <Text style={styles.supplySummLabel}>DELIVERIES</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {["Today", "Week", "Month", "All"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActiveSup]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActiveSup]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { date: "22 Feb 2026", time: "09:14 AM", agent: "Kumara P.", gross: "87.5 kg", net: "Net: 85.0 kg" },
            { date: "20 Feb 2026", time: "08:50 AM", agent: "Kumara P.", gross: "124.0 kg", net: "Net: 121.0 kg" },
            { date: "18 Feb 2026", time: "10:10 AM", agent: "Roshan M.", gross: "63.0 kg", net: "Net: 63.0 kg" },
            { date: "15 Feb 2026", time: "09:35 AM", agent: "Kumara P.", gross: "201.5 kg", net: "Net: 196.5 kg" },
            { date: "13 Feb 2026", time: "08:00 AM", agent: "Roshan M.", gross: "95.0 kg", net: "Net: 93.0 kg" },
          ].map((item, idx) => (
            <View key={idx} style={styles.supplyHistItem}>
              <View>
                <Text style={styles.supHistDate}>{item.date}</Text>
                <Text style={styles.supHistSub}>{item.time} · {item.agent}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.supHistGross}>{item.gross}</Text>
                <Text style={styles.supHistSub}>{item.net}</Text>
              </View>
            </View>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    </View>
  );
}

export function SupplierPaymentsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState("Balance Payments");
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Payments</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.requestTabs}>
          <Pressable onPress={() => setActiveTab("Balance Payments")} style={[styles.reqTab, activeTab === "Balance Payments" && styles.reqTabActive]}>
            <Ionicons name="cash-outline" size={18} color={activeTab === "Balance Payments" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Balance Payments" && styles.reqTabTextActive]}>Balance Payments</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab("Advances")} style={[styles.reqTab, activeTab === "Advances" && styles.reqTabActive]}>
            <Ionicons name="wallet-outline" size={18} color={activeTab === "Advances" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Advances" && styles.reqTabTextActive]}>Advances</Text>
          </Pressable>
        </View>

        <View style={styles.nextPayBox}>
          <Ionicons name="calendar-outline" size={24} color={palette.accentBlue} />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.nextPayTitle}>Next Pay: 28 Feb 2026</Text>
            <Text style={styles.nextPaySub}>Est. Rs. 12,500 available</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.paymentCard}>
            <View style={styles.payCardHeader}>
              <View>
                <Text style={styles.payCardTitle}>February 2026 Payout</Text>
                <Text style={styles.payCardId}>ID: BP001</Text>
              </View>
              <View style={styles.statusBadgeGrey}><Ionicons name="time-outline" size={10} color={palette.muted} /><Text style={styles.statusBadgeTextGrey}> Pending</Text></View>
            </View>
            <View style={styles.payRow}><Text style={styles.payLabel}>Gross Earnings</Text><Text style={styles.payVal}>Rs. 24,500</Text></View>
            <View style={styles.payRow}><Text style={styles.payLabel}>Deductions</Text><Text style={styles.payValRed}>-Rs. 12,000</Text></View>
            <View style={styles.payDivider} />
            <View style={styles.payRow}><Text style={styles.payTotalLabel}>Net Amount</Text><Text style={styles.payTotalVal}>Rs. 12,500</Text></View>
            <Text style={styles.payFooterTextYellow}>Upcoming: 28 Feb 2026</Text>
          </View>

          <View style={styles.paymentCard}>
            <View style={styles.payCardHeader}>
              <View>
                <Text style={styles.payCardTitle}>January 2026 Payout</Text>
                <Text style={styles.payCardId}>ID: BP002</Text>
              </View>
              <View style={styles.statusBadgeGrey}><Ionicons name="layers-outline" size={10} color={palette.muted} /><Text style={styles.statusBadgeTextGrey}> Paid</Text></View>
            </View>
            <View style={styles.payRow}><Text style={styles.payLabel}>Gross Earnings</Text><Text style={styles.payVal}>Rs. 31,200</Text></View>
            <View style={styles.payRow}><Text style={styles.payLabel}>Deductions</Text><Text style={styles.payValRed}>-Rs. 7,200</Text></View>
            <View style={styles.payDivider} />
            <View style={styles.payRow}><Text style={styles.payTotalLabel}>Net Amount</Text><Text style={styles.payTotalVal}>Rs. 24,000</Text></View>
            <Text style={styles.payFooterTextDim}>Finalized on 31 Jan 2026</Text>
          </View>
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    </View>
  );
}

export function SupplierDebtsScreen({ navigation }: any) {
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Debts & Deductions</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.debtSummaryCard}>
          <Text style={styles.debtTitle}>Current Outstanding</Text>
          <Text style={styles.debtAmount}>Rs. 7,800</Text>
          <Text style={styles.debtSubTitle}>Estimated for next payout</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={palette.accentBlue} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.infoBoxTitle}>How it works</Text>
            <Text style={styles.infoBoxText}>Debts for services (fertilizer, tools) are deducted automatically.</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>DETAILED BREAKDOWN</Text>

        {[
          { title: "Fertilizer", date: "15 Feb 2026", amt: "Rs. 3,200", icon: "leaf", color: palette.accentGreen },
          { title: "Leaf Bags", date: "10 Feb 2026", amt: "Rs. 2,600", icon: "bag-handle-outline", color: palette.accentBlue },
          { title: "Advance", date: "01 Feb 2026", amt: "Rs. 2,000", icon: "wallet-outline", color: "#f39c12" },
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
            <Text style={styles.clarifyTitle}>Need clarification?</Text>
            <Text style={styles.clarifyText}>Speak to your Extension Officer about these charges.</Text>
          </View>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function SupplierProfileScreen({ navigation }: any) {
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{width: 40}} />
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarBig}>
            <Text style={styles.profileAvatarBigText}>SB</Text>
          </View>
          <Text style={styles.profileName}>Sunil Bandara</Text>
          <View style={styles.supplierBadge}>
            <Ionicons name="checkmark-circle-outline" size={14} color={palette.accentBlue} />
            <Text style={styles.supplierBadgeText}> Verified Supplier</Text>
          </View>
          <View style={styles.supProfileIdBadge}>
            <Text style={styles.supProfileIdText}>SH-1042 · PB-0934</Text>
          </View>
        </View>

        <View style={styles.supDetailsBox}>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>Land Name</Text><Text style={styles.supDetailVal}>Halpewatte Estate – Block C</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>In-Charge</Text><Text style={styles.supDetailVal}>EXT-Nimal</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>Passbook No.</Text><Text style={styles.supDetailVal}>PB-0934</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>Supplier ID</Text><Text style={styles.supDetailVal}>SH-1042</Text></View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>ACCOUNT</Text>
        
        <View style={{ gap: 12 }}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(243, 156, 18, 0.15)" }]}><Ionicons name="notifications-outline" size={20} color="#f39c12" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>Notifications</Text><Text style={styles.settingItemSub}>All alerts enabled</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}><Ionicons name="lock-closed-outline" size={20} color="#e74c3c" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>Change Password</Text><Text style={styles.settingItemSub}>Last changed 45 days ago</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="chatbox-ellipses-outline" size={20} color={palette.accentBlue} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>Contact Support</Text><Text style={styles.settingItemSub}>Officer: EXT-Nimal</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <Pressable style={styles.settingItem} onPress={() => navigation.navigate("Login")}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}><Ionicons name="log-out-outline" size={20} color={palette.muted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>Sign Out</Text><Text style={styles.settingItemSub}>Sunil Bandara · SH-1042</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}
