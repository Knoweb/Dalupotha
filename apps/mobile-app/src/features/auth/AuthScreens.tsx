import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";

type Role = "agent" | "supplier";

const RoleTab = ({ icon, label, active, onPress }: any) => (
  <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : palette.muted} />
    <Text style={[styles.tabText, active && {color: "#fff"}]}>{label}</Text>
  </Pressable>
);

export function LoginScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const compact = width < 390 || height < 780;

  const [role, setRole] = useState<Role>("supplier");
  const [id, setId] = useState(role === "supplier" ? "PB-0934" : "");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);

  const cardTitle = useMemo(() => (role === "supplier" ? "Supplier Portal" : "Agent Portal"), [role]);
  const portalSubtitle = role === "supplier" ? "Access your supply history, debts and payments" : "Access field collections and sync status";
  const idLabel = role === "supplier" ? "SUPPLIER ID / PASSBOOK" : "AGENT ID";
  const idPlaceholder = role === "supplier" ? "e.g. PB-0934" : "Agent ID";

  return (
    <LinearGradient colors={[palette.bgOuter, palette.bgInnerTop, palette.bgInnerBottom]} locations={[0, 0.28, 1]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.scroll, compact && styles.scrollCompact]}>
          <View style={styles.brandBlock}>
            <View style={[styles.logoHalo, compact && styles.logoHaloCompact]}>
              <Image source={require("../../assests/dalupotha_icon.png")} style={[styles.logo, compact && styles.logoCompact]} resizeMode="cover" />
            </View>
            <Text style={[styles.brandSinhala, compact && styles.brandSinhalaCompact]}>දළුපොත</Text>
            <Text style={[styles.brandEn, compact && styles.brandEnCompact]}>Factory Digital Gateway</Text>
          </View>

          <View style={[styles.authCard, compact && styles.authCardCompact]}>
            <View style={styles.roleTabs}>
              <RoleTab icon="car-outline" label="Agent" active={role === "agent"} onPress={() => setRole("agent")} />
              <RoleTab icon="person-outline" label="Supplier" active={role === "supplier"} onPress={() => setRole("supplier")} />
            </View>
            <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{cardTitle}</Text>
            <Text style={styles.cardSubtitle}>{portalSubtitle}</Text>

            <Text style={styles.label}>{idLabel}</Text>
            <View style={styles.inputContainer}>
              <TextInput value={id} onChangeText={setId} style={styles.inputField} placeholder={idPlaceholder} placeholderTextColor="#7d93b4" />
              {role === "supplier" && (
                <View style={styles.inputRightIcon}>
                    <Ionicons name="car-sport-outline" size={20} color={palette.muted} />
                </View>
              )}
            </View>

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputContainer}>
              <TextInput value={password} onChangeText={setPassword} style={styles.inputField} secureTextEntry={!showPassword} placeholder="Password" placeholderTextColor="#7d93b4" />
              <Pressable style={styles.inputRightIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.muted} />
              </Pressable>
            </View>

            <Pressable style={({ pressed }) => [styles.primaryBtn, compact && styles.primaryBtnCompact, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate("Otp", { role })}>
              <Text style={[styles.primaryBtnText, compact && styles.primaryBtnTextCompact]}>Continue →</Text>
            </Pressable>
            
            <View style={styles.helpCenterWrap}>
              <Text style={styles.helpCenterText}>Trouble logging in? <Text style={styles.helpCenterLink}>Help Center</Text></Text>
            </View>
          </View>
          <Text style={styles.footer}>Secured by දළුපොත Gateway · v3.0</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function OtpScreen({ route, navigation }: any) {
  const { role } = route.params;
  const [otp, setOtp] = useState("000000");

  return (
    <LinearGradient colors={[palette.bgOuter, palette.bgInnerTop, palette.bgInnerBottom]} locations={[0, 0.28, 1]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          <View style={styles.authCard}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={palette.accentBlue} />
            </View>
            <Text style={[styles.cardTitle, styles.centered]}>Verify Identity</Text>
            <Text style={[styles.cardSubtitle, styles.centered]}>Enter the 6-digit code sent to your mobile phone</Text>
            
            <TextInput value={otp} onChangeText={setOtp} style={styles.otpInput} keyboardType="number-pad" maxLength={6} placeholder="------" placeholderTextColor="#3b5275" autoFocus />
            
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate("MainTabs", { role })}>
              <Text style={styles.primaryBtnText}>Verify & Access</Text>
            </Pressable>
            
            <View style={styles.helpCenterWrap}>
              <Text style={styles.helpCenterText}>Didn't receive code? <Text style={styles.helpCenterLink}>Resend (0:30)</Text></Text>
            </View>
            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 25 }}>
              <Text style={styles.cancelText}>← Back to Login</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Dynamic Components ---
function RoleTab({ icon, label, active, onPress }: any) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#fff" : palette.muted} />
      <Text style={[styles.tabText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

function MainTabNavigator({ route, navigation }: any) {
  const { role } = route.params || { role: "agent" };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#061224",
          borderTopWidth: 1,
          borderTopColor: "#1b375d",
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: palette.accentGreen,
        tabBarInactiveTintColor: palette.muted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = "help-circle-outline";
          if (route.name === "Dashboard") iconName = "grid-outline";
          else if (route.name === "Collections") iconName = "clipboard-outline";
          else if (route.name === "Requests") iconName = "paper-plane-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          else if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Supply") return <MaterialCommunityIcons name="leaf" size={size} color={color} />;
          else if (route.name === "Payments") iconName = "cash-outline";
          else if (route.name === "Debts") iconName = "wallet-outline";
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {role === "supplier" ? (
        <>
          <Tab.Screen name="Home" children={() => <SupplierHomeScreen navigation={navigation} />} />
          <Tab.Screen name="Supply" children={() => <SupplierSupplyScreen navigation={navigation} />} />
          <Tab.Screen name="Payments" children={() => <SupplierPaymentsScreen navigation={navigation} />} />
          <Tab.Screen name="Debts" children={() => <SupplierDebtsScreen navigation={navigation} />} />
          <Tab.Screen name="Profile" children={() => <SupplierProfileScreen navigation={navigation} />} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" children={() => <DashboardScreen role={role} navigation={navigation} />} />
          <Tab.Screen name="Collections" children={() => <CollectionsScreen navigation={navigation} />} />
          <Tab.Screen name="Requests" children={() => <RequestsScreen navigation={navigation} />} />
          <Tab.Screen name="Profile" children={() => <ProfileScreen navigation={navigation} />} />
        </>
      )}
    </Tab.Navigator>
  );
}

function CollectionsScreen({ navigation }: any) {
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
            { initial: "J", bg: "#2ea8ff", name: "Jayasekara, R.", id: "SH-0142", weight: "87.5 kg", time: "09:14 AM", badges: [{type:"gps", text:"GPS"}, {type:"synced", text:"Synced"}] },
            { initial: "P", bg: "#4267b2", name: "Perera, D.W.", id: "SH-0089", weight: "124 kg", time: "09:52 AM", badges: [{type:"gps", text:"GPS"}, {type:"queued", text:"Queued"}] },
            { initial: "S", bg: "#4267b2", name: "Silva, M.K.", id: "SH-0231", weight: "63 kg", time: "10:30 AM", badges: [{type:"nogps", text:"No GPS"}, {type:"failed", text:"Failed"}, {type:"manual", text:"Manual"}] },
            { initial: "F", bg: "#4267b2", name: "Fernando, L.", id: "SH-0077", weight: "201.5 kg", time: "11:05 AM", badges: [{type:"gps", text:"GPS"}, {type:"synced", text:"Synced"}] },
            { initial: "B", bg: "#4267b2", name: "Bandara, S.", id: "SH-0315", weight: "95 kg", time: "11:44 AM", badges: [{type:"gps", text:"GPS"}, {type:"syncing", text:"Syncing"}] },
            { initial: "K", bg: "#4267b2", name: "Kumari, T.", id: "SH-0412", weight: "72.5 kg", time: "12:20 PM", badges: [{type:"gps", text:"GPS"}, {type:"queued", text:"Queued"}] },
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
          <View style={{height: 100}} />
        </ScrollView>
      </View>
    </View>
  );
}

function RequestsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState("Advance");
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>Requests</Text>
          <View style={{width: 40}} />
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
                  item.status === "APPROVED" ? {backgroundColor: "rgba(31,190,87,0.15)"} : 
                  item.status === "PENDING" ? {backgroundColor: "rgba(243,156,18,0.15)"} : 
                  {backgroundColor: "rgba(231,76,60,0.15)"}
                ]}>
                  <Text style={[styles.statusBadgeText, 
                    item.status === "APPROVED" ? {color: palette.accentGreen} : 
                    item.status === "PENDING" ? {color: "#f39c12"} : 
                    {color: "#e74c3c"}
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
          <View style={{height: 100}} />
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

function ProfileScreen({ navigation }: any) {
  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{width: 40}} />
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarBig}>
            <Text style={styles.profileAvatarBigText}>KP</Text>
          </View>
          <Text style={styles.profileName}>Kumara Perera</Text>
          <Text style={styles.profileRole}>Transport Agent · Uva Halpewatte</Text>
          <View style={styles.profileIdBadge}>
            <Text style={styles.profileIdText}>TA-2024-007</Text>
          </View>
        </View>

        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatBox}>
            <Text style={styles.profileStatValue}>1,240</Text>
            <Text style={styles.profileStatLabel}>KG TODAY</Text>
          </View>
          <View style={[styles.profileStatBox, {marginHorizontal: 10}]}>
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
          {/* Setting Items */}
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}>
               <Ionicons name="bluetooth" size={20} color={palette.accentBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Bluetooth Scale</Text>
              <Text style={styles.settingItemSub}>DL-7200 · Connected</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(31, 190, 87, 0.15)" }]}>
               <Ionicons name="location-outline" size={20} color={palette.accentGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>GPS Accuracy</Text>
              <Text style={styles.settingItemSub}>High accuracy mode · ON</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(155, 89, 182, 0.15)" }]}>
               <Ionicons name="sync" size={20} color="#9b59b6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Sync Settings</Text>
              <Text style={styles.settingItemSub}>Auto-sync on WiFi · ON</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(243, 156, 18, 0.15)" }]}>
               <Ionicons name="notifications-outline" size={20} color="#f39c12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Notifications</Text>
              <Text style={styles.settingItemSub}>All alerts enabled</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}>
               <Ionicons name="time-outline" size={20} color="#e74c3c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>My Collections</Text>
              <Text style={styles.settingItemSub}>View full history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}>
               <Ionicons name="lock-closed-outline" size={20} color="#e74c3c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Change PIN</Text>
              <Text style={styles.settingItemSub}>Last changed 30 days ago</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>

          <Pressable style={styles.settingItem} onPress={() => navigation.navigate("Login")}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}>
               <Ionicons name="log-out-outline" size={20} color={palette.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Sign Out</Text>
              <Text style={styles.settingItemSub}>Kumara Perera · TA-2024-007</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}
