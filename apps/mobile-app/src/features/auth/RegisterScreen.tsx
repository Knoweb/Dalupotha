import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, Text, TextInput, useWindowDimensions, View, ScrollView, Modal
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";
import { AuthAPI, apiPost, apiGet } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function RegisterScreen({ route, navigation }: any) {
  const { width, height } = useWindowDimensions();
  const compact = width < 390 || height < 780;

  const [lang] = useState<"en" | "si">(route.params?.lang ?? "en");
  const dict: any = {
    si: {
      "Account Registration": "ගිණුම් ලියාපදිංචිය",
      "Agent": "නියෝජිත",
      "Supplier": "සැපයුම්කරු",
      "FULL NAME *": "සම්පූර්ණ නම *",
      "Sumana Weerasinghe": "සුමනා වීරසිංහ",
      "CONTACT NUMBER *": "දුරකථන අංකය *",
      "ESTATE / DIVISION *": "වත්ත / අංශය *",
      "Loading estates...": "වතු පූරණය වෙමින්...",
      "Select Estate...": "වත්ත තෝරන්න...",
      "PASSBOOK NUMBER *": "පාස්පොත් අංකය *",
      "LAND NAME": "ඉඩමේ නම",
      "Green View Land": "හරිත දර්ශන ඉඩම",
      "FIELD IN-CHARGE (TRANSPORT AGENT) *": "ක්ෂේත්‍ර භාරකරු (ප්‍රවාහන නියෝජිත) *",
      "Loading agents...": "නියෝජිතයින් පූරණය වෙමින්...",
      "No agents in this estate": "මෙම වත්තේ නියෝජිතයින් නොමැත",
      "Select Transport Agent": "ප්‍රවාහන නියෝජිත තෝරන්න",
      "CREATE LOGIN PIN *": "ප්‍රවේශ PIN අංකය සාදන්න *",
      "4-digit PIN": "අංක 4 ක PIN අංකය",
      "CONFIRM PIN *": "PIN අංකය තහවුරු කරන්න *",
      "Re-enter PIN": "PIN අංකය නැවත ඇතුළත් කරන්න",
      "PINs do not match": "PIN අංක නොගැලපේ",
      "EMPLOYEE ID (TA) *": "සේවක හැඳුනුම්පත (TA) *",
      "Register Account →": "ලියාපදිංචි වන්න →",
      "← Back to Login": "← ආපසු පිවිසුමට",
      "Select Estate": "වත්ත තෝරන්න",
      "No estates found.": "වතු හමු නොවීය.",
      "Retry": "නැවත උත්සාහ කරන්න",
      "Select Field In-Charge": "ක්ෂේත්‍ර භාරකරු තෝරන්න",
      "COLLECTION ROUTE": "එකතු කිරීමේ මාර්ගය",
      "Select Collection Route...": "මාර්ගය තෝරන්න...",
      "Loading routes...": "මාර්ග පූරණය වෙමින්...",
      "COLLECTION ROUTE(S) *": "එකතු කිරීමේ මාර්ග *",
      "No routes defined for this estate": "මෙම වත්තේ මාර්ග නිර්වචනය කර නොමැත",
      "Select at least one collection route": "අවම වශයෙන් එක් මාර්ගයක් තෝරන්න"
    }
  };
  const _ = (k: string) => (lang === 'si' && dict.si[k]) ? dict.si[k] : k;

  const normalizeSriLankaContact = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (!digits) return "";
    if (digits.startsWith("0") && digits.length === 10) {
      return `+94${digits.slice(1)}`;
    }
    return `+94${digits}`;
  };

  const [role, setRole] = useState<"supplier" | "agent">(route.params?.initialRole ?? "supplier");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Common fields
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");

  // Supplier-only fields
  const [passbookNo, setPassbookNo] = useState("");
  const [landName, setLandName] = useState("");
  const [address, setAddress] = useState("");


  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Estate Selection
  const [estates, setEstates] = useState<any[]>([]);
  const [selectedEstate, setSelectedEstate] = useState<any>(null);
  const [showEstateModal, setShowEstateModal] = useState(false);
  const [estatesLoading, setEstatesLoading] = useState(true);
  const [estatesError, setEstatesError] = useState<string | null>(null);

  // Field In-Charge (Transport Agent) selection
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Route-based assignment state (supplier)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Agent multi-route selection state
  const [estateRoutes, setEstateRoutes] = useState<Array<{ routeId: string; name: string; code: string }>>([]);
  const [agentSelectedRoutes, setAgentSelectedRoutes] = useState<string[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  const toggleAgentRoute = (routeVal: string) => {
    setAgentSelectedRoutes(prev =>
      prev.includes(routeVal) ? prev.filter(r => r !== routeVal) : [...prev, routeVal]
    );
  };

  // Filter routes from transport agents (handles comma-separated route lists)
  const availableRoutes = React.useMemo(() => {
    const allRoutes: string[] = [];
    agents.forEach((a: any) => {
      if (a.routeName && a.routeName.trim() !== "") {
        a.routeName.split(",").forEach((part: string) => {
          const trimmed = part.trim();
          if (trimmed !== "") {
            allRoutes.push(trimmed);
          }
        });
      }
    });
    return Array.from(new Set(allRoutes));
  }, [agents]);

  const fetchEstates = React.useCallback(async () => {
    setEstatesLoading(true);
    setEstatesError(null);
    try {
      const data: any = await apiGet(AuthAPI.getEstates, ""); // No token needed for public listing
      const list = Array.isArray(data) ? data : [];
      setEstates(list);

      if (list.length > 0) {
        setSelectedEstate((prev: any) => {
          if (prev && list.some((estate: any) => estate.estateId === prev.estateId)) return prev;
          return list[0];
        });
      } else {
        setSelectedEstate(null);
        setEstatesError("No estates available yet. Please contact admin.");
      }
    } catch (err: any) {
      console.warn("Failed to fetch estates", err);
      setEstates([]);
      setSelectedEstate(null);
      setEstatesError(err?.message ?? "Failed to load estates. Please try again.");
    } finally {
      setEstatesLoading(false);
    }
  }, []);

  // Fetch estates on mount
  React.useEffect(() => {
    fetchEstates();
  }, [fetchEstates]);

  // Fetch transport agents (and estate routes for agents) when estate is selected
  React.useEffect(() => {
    if (!selectedEstate?.estateId) return;
    setAgentsLoading(true);
    setSelectedAgent(null);
    setSelectedRoute(null);
    setAgentSelectedRoutes([]);
    setEstateRoutes([]);
    // fetch agents for supplier route-pairing
    apiGet<any[]>(`${AuthAPI.getEstates}/${selectedEstate.estateId}/agents`, "")
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false));
    // fetch dynamic routes for agent multi-select
    setRoutesLoading(true);
    apiGet<any[]>(AuthAPI.getEstateRoutes(selectedEstate.estateId), "")
      .then((data) => setEstateRoutes(Array.isArray(data) ? data : []))
      .catch(() => setEstateRoutes([]))
      .finally(() => setRoutesLoading(false));
  }, [selectedEstate?.estateId]);

  const handleRegister = async () => {
    setErrorMsg(null);

    const contactDigits = contact.replace(/\D/g, "").slice(0, 10);
    const fullContact = normalizeSriLankaContact(contactDigits);

    // Basic validation
    if (!contactDigits || contactDigits.length !== 10 || !fullContact || !fullName.trim() || !selectedEstate) {
      setErrorMsg("Please fill in all required fields including Estate.");
      return;
    }

    if (role === "supplier") {
      if (!passbookNo.trim() || !pin.trim()) {
        setErrorMsg("Passbook Number and PIN are required.");
        return;
      }
      if (!selectedAgent) {
        setErrorMsg("Please select a Field In-Charge (Transport Agent).");
        return;
      }
    } else {
      if (!employeeId.trim() || !pin.trim()) {
        setErrorMsg("Agent ID and PIN are required.");
        return;
      }
      if (agentSelectedRoutes.length === 0) {
        setErrorMsg("Please select at least one collection route.");
        return;
      }
    }

    if (pin.trim() !== confirmPin.trim()) {
      setErrorMsg("PIN and Confirm PIN do not match. Please check and try again.");
      return;
    }

    if (pin.trim().length !== 6) {
      setErrorMsg("PIN must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      // Try to capture GPS — non-blocking (fail gracefully)
      let gpsLat: number | null = null;
      let gpsLong: number | null = null;

      if (role === "supplier") {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            gpsLat = loc.coords.latitude;
            gpsLong = loc.coords.longitude;
          }
          // If denied — continue without GPS (recorded as null)
        } catch {
          // GPS unavailable — continue without it
        }
      }

      // Build registration payload
      const registerData: any = {
        contact: fullContact,
        fullName: fullName.trim(),
        estateId: selectedEstate?.estateId,
        otpCode: "MANUAL", // bypass OTP check in backend
      };

      if (role === "supplier") {
        Object.assign(registerData, {
          passbookNo: passbookNo.trim(),
          landName: landName.trim() || undefined,
          address: address.trim() || undefined,
          gpsLat,
          gpsLong,
          pin: pin.trim(),
          inChargeId: selectedAgent?.userId || undefined,
        });
      } else {
        Object.assign(registerData, {
          employeeId: employeeId.trim(),
          pin: pin.trim(),
          routeName: agentSelectedRoutes.join(', '),
        });
      }

      // Direct registration call, bypassing OTP verification screen
      const endpoint = role === "supplier" ? AuthAPI.registerSmallHolder : AuthAPI.registerAgent;
      console.log("👉 [DEBUG] Directly registering at endpoint:", endpoint);
      const res: any = await apiPost(endpoint, registerData);
      console.log("👉 [DEBUG] Direct registration success:", res);

      // Token received — save session and navigate to main tabs directly
      await AsyncStorage.setItem("dalupotha_session", JSON.stringify({ role, token: res.token, user: res }));
      
      // Navigate to MainTabs
      navigation.navigate("MainTabs", { role, token: res.token, user: res });
    } catch (err: any) {
      setErrorMsg(err.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[palette.bgOuter, palette.bgInnerTop, palette.bgInnerBottom]}
      locations={[0, 0.28, 1]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={[{ flexGrow: 1, padding: 20, justifyContent: 'center' }, compact && { padding: 10 }]}>
            <View style={[styles.authCard, compact && styles.authCardCompact]}>
              <View style={{ alignItems: "center", marginBottom: 15 }}>
                <Ionicons 
                  name={role === "supplier" ? "document-text-outline" : "car-sport-outline"} 
                  size={32} 
                  color={palette.accentBlue} 
                />
              </View>
              <Text style={[styles.cardTitle, styles.centered]}>{_("Account Registration")}</Text>
              
              <View style={[styles.roleTabs, { marginTop: 20, marginBottom: 25 }]}>
                <Pressable 
                  style={[styles.tab, role === "agent" && styles.tabActive]} 
                  onPress={() => setRole("agent")}
                >
                  <Text style={[styles.tabText, role === "agent" && { color: "#fff" }]}>{_("Agent")}</Text>
                </Pressable>
                <Pressable 
                  style={[styles.tab, role === "supplier" && styles.tabActive]} 
                  onPress={() => setRole("supplier")}
                >
                  <Text style={[styles.tabText, role === "supplier" && { color: "#fff" }]}>{_("Supplier")}</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>{_("FULL NAME *")}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.inputField}
                  placeholder="Sumana Weerasinghe"
                  placeholderTextColor="#7d93b4"
                />
              </View>

              <Text style={styles.label}>{_("CONTACT NUMBER *")}</Text>
              <View style={styles.inputContainer}>
                <Text style={{ color: "#cbd5e1", marginRight: 6, fontWeight: "700" }}>+94</Text>
                <TextInput
                  value={contact}
                  onChangeText={(text) => setContact(text.replace(/\D/g, "").slice(0, 10))}
                  style={styles.inputField}
                  placeholder="712345678"
                  placeholderTextColor="#7d93b4"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <Text style={styles.label}>{_("ESTATE / DIVISION *")}</Text>
              <Pressable
                style={styles.inputContainer}
                onPress={() => !estatesLoading && setShowEstateModal(true)}
                disabled={estatesLoading}
              >
                <Ionicons name="business-outline" size={20} color={palette.muted} />
                <Text style={{ flex: 1, color: selectedEstate ? "white" : palette.muted, marginLeft: 10 }}>
                  {estatesLoading ? _("Loading estates...") : selectedEstate ? selectedEstate.name : _("Select Estate...")}
                </Text>
                <Ionicons name="chevron-down" size={20} color={palette.muted} />
              </Pressable>
              {estatesError ? (
                <View style={{ marginTop: 6, marginBottom: 10 }}>
                  <Text style={{ color: "#ffb4b4", fontSize: 11 }}>{estatesError}</Text>
                  <Pressable onPress={fetchEstates} style={{ marginTop: 4 }}>
                    <Text style={{ color: palette.accentBlue, fontSize: 11 }}>Retry loading estates</Text>
                  </Pressable>
                </View>
              ) : null}

              {role === "supplier" ? (
                <>
                  <Text style={styles.label}>{_("PASSBOOK NUMBER *")}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={passbookNo}
                      onChangeText={setPassbookNo}
                      style={styles.inputField}
                      placeholder="e.g. 05497"
                      placeholderTextColor="#7d93b4"
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.label}>{_("LAND NAME")} <Text style={{ color: palette.muted, fontWeight: '400', fontSize: 10 }}>(optional)</Text></Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={landName}
                      onChangeText={setLandName}
                      style={styles.inputField}
                      placeholder="Green View Land"
                      placeholderTextColor="#7d93b4"
                    />
                  </View>

                  <Text style={styles.label}>{_("FIELD IN-CHARGE (TRANSPORT AGENT) *")}</Text>
                  <Pressable
                    style={styles.inputContainer}
                    onPress={() => { if (agents.length > 0) setShowAgentModal(true); }}
                    disabled={agentsLoading || agents.length === 0}
                  >
                    <Ionicons name="person-outline" size={20} color={palette.muted} />
                    <Text style={{ flex: 1, color: selectedAgent ? "white" : palette.muted, marginLeft: 10 }}>
                      {agentsLoading
                        ? _("Loading agents...")
                        : selectedAgent
                          ? selectedAgent.fullName
                          : agents.length === 0
                            ? _("No agents in this estate")
                            : _("Select Transport Agent")}
                    </Text>
                    {selectedAgent ? (
                      <Pressable onPress={() => { setSelectedAgent(null); setSelectedRoute(null); }}>
                        <Ionicons name="close-circle" size={18} color={palette.muted} />
                      </Pressable>
                    ) : (
                      <Ionicons name="chevron-down" size={20} color={palette.muted} />
                    )}
                  </Pressable>

                  <Text style={styles.label}>{_("COLLECTION ROUTE")}</Text>
                  <Pressable
                    style={styles.inputContainer}
                    onPress={() => estateRoutes.length > 0 && setShowRouteModal(true)}
                    disabled={routesLoading || estateRoutes.length === 0}
                  >
                    <Ionicons name="map-outline" size={20} color={palette.muted} />
                    <Text style={{ flex: 1, color: selectedRoute ? "white" : palette.muted, marginLeft: 10 }}>
                      {routesLoading
                        ? _("Loading routes...")
                        : selectedRoute
                          ? selectedRoute
                          : estateRoutes.length === 0
                            ? "No routes available"
                            : _("Select Collection Route...")}
                    </Text>
                    {selectedRoute ? (
                      <Pressable onPress={() => setSelectedRoute(null)}>
                        <Ionicons name="close-circle" size={18} color={palette.muted} />
                      </Pressable>
                    ) : (
                      <Ionicons name="chevron-down" size={20} color={palette.muted} />
                    )}
                  </Pressable>

                  <Text style={styles.label}>{_("CREATE LOGIN PIN *")}</Text>
                  <View style={[styles.inputContainer, pin.length > 0 && pin.length < 6 && { borderColor: "#f39c12" }, pin.length === 6 && { borderColor: "#2ecc71" }]}>
                    <TextInput
                      value={pin}
                      onChangeText={setPin}
                      style={styles.inputField}
                      secureTextEntry={!showPin}
                      placeholder={_("6-digit PIN")}
                      placeholderTextColor="#7d93b4"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable style={styles.inputRightIcon} onPress={() => setShowPin(!showPin)}>
                      <Ionicons name={showPin ? "eye-outline" : "eye-off-outline"} size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                  {pin.length > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: -8, marginBottom: 8, gap: 6 }}>
                      <View style={{ flexDirection: "row", gap: 3 }}>
                        {[1,2,3,4,5,6].map(i => (
                          <View key={i} style={{ width: 8, height: 4, borderRadius: 2, backgroundColor: i <= pin.length ? "#2ecc71" : "rgba(255,255,255,0.15)" }} />
                        ))}
                      </View>
                      <Text style={{ color: pin.length === 6 ? "#2ecc71" : "#f39c12", fontSize: 10 }}>
                        {pin.length === 6 ? "✓ PIN ready" : `${pin.length}/6 digits`}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>{_("CONFIRM PIN *")}</Text>
                  <View style={[styles.inputContainer,
                    confirmPin.length > 0 && pin !== confirmPin && { borderColor: "#ff6b6b" },
                    confirmPin.length === 6 && pin === confirmPin && { borderColor: "#2ecc71" }
                  ]}>
                    <TextInput
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      style={styles.inputField}
                      secureTextEntry={!showConfirmPin}
                      placeholder={_("Re-enter PIN")}
                      placeholderTextColor="#7d93b4"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable style={styles.inputRightIcon} onPress={() => setShowConfirmPin(!showConfirmPin)}>
                      <Ionicons name={showConfirmPin ? "eye-outline" : "eye-off-outline"} size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                  {confirmPin.length > 0 && (
                    <Text style={{ color: pin === confirmPin ? "#2ecc71" : "#ff6b6b", fontSize: 11, marginTop: -8, marginBottom: 8 }}>
                      {pin === confirmPin ? "✓ PINs match" : "✗ PINs do not match"}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.label}>{_("EMPLOYEE ID (TA) *")}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={employeeId}
                      onChangeText={setEmployeeId}
                      style={styles.inputField}
                      placeholder="TA-XXXX"
                      placeholderTextColor="#7d93b4"
                      autoCapitalize="characters"
                    />
                  </View>

                  {/* ── Collection Route Multi-Select ── */}
                  <Text style={styles.label}>{_("COLLECTION ROUTE(S) *")}</Text>
                  {routesLoading ? (
                    <View style={[styles.inputContainer, { paddingVertical: 12 }]}>
                      <ActivityIndicator size="small" color={palette.accentBlue} />
                      <Text style={{ color: palette.muted, marginLeft: 10 }}>{_("Loading routes...")}</Text>
                    </View>
                  ) : estateRoutes.length === 0 ? (
                    <View style={[styles.inputContainer, { paddingVertical: 12 }]}>
                      <Ionicons name="map-outline" size={18} color={palette.muted} />
                      <Text style={{ color: palette.muted, marginLeft: 10, fontSize: 13 }}>
                        {_("No routes defined for this estate")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      borderWidth: 1,
                      borderColor: agentSelectedRoutes.length > 0 ? "rgba(46,204,113,0.4)" : "rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      marginBottom: 12,
                      overflow: "hidden",
                    }}>
                      {estateRoutes.map((r, idx) => {
                        const routeVal = `${r.name} (${r.code})`;
                        const checked = agentSelectedRoutes.includes(routeVal);
                        return (
                          <Pressable
                            key={r.routeId}
                            onPress={() => toggleAgentRoute(routeVal)}
                            style={[{
                              flexDirection: "row",
                              alignItems: "center",
                              padding: 13,
                              gap: 12,
                              backgroundColor: checked ? "rgba(46,204,113,0.08)" : "transparent",
                            }, idx > 0 && { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }]}
                          >
                            <View style={{
                              width: 22, height: 22, borderRadius: 6,
                              borderWidth: 2,
                              borderColor: checked ? "#2ecc71" : "rgba(255,255,255,0.25)",
                              backgroundColor: checked ? "rgba(46,204,113,0.2)" : "transparent",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              {checked && <Ionicons name="checkmark" size={14} color="#2ecc71" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: checked ? "#fff" : "#cbd5e1", fontWeight: checked ? "700" : "400", fontSize: 14 }}>
                                {r.name}
                              </Text>
                              {r.code ? (
                                <Text style={{ color: palette.muted, fontSize: 11, marginTop: 1 }}>Code: {r.code}</Text>
                              ) : null}
                            </View>
                            {checked && <Ionicons name="checkmark-circle" size={18} color="#2ecc71" />}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {agentSelectedRoutes.length > 0 && (
                    <Text style={{ color: "#2ecc71", fontSize: 11, marginTop: -8, marginBottom: 10 }}>
                      ✓ {agentSelectedRoutes.length} route{agentSelectedRoutes.length > 1 ? 's' : ''} selected
                    </Text>
                  )}

                  <Text style={styles.label}>{_("CREATE LOGIN PIN *")}</Text>
                  <View style={[styles.inputContainer, pin.length > 0 && pin.length < 6 && { borderColor: "#f39c12" }, pin.length === 6 && { borderColor: "#2ecc71" }]}>
                    <TextInput
                      value={pin}
                      onChangeText={setPin}
                      style={styles.inputField}
                      secureTextEntry={!showPin}
                      placeholder={_("6-digit PIN")}
                      placeholderTextColor="#7d93b4"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable style={styles.inputRightIcon} onPress={() => setShowPin(!showPin)}>
                      <Ionicons name={showPin ? "eye-outline" : "eye-off-outline"} size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                  {pin.length > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: -8, marginBottom: 8, gap: 6 }}>
                      <View style={{ flexDirection: "row", gap: 3 }}>
                        {[1,2,3,4,5,6].map(i => (
                          <View key={i} style={{ width: 8, height: 4, borderRadius: 2, backgroundColor: i <= pin.length ? "#2ecc71" : "rgba(255,255,255,0.15)" }} />
                        ))}
                      </View>
                      <Text style={{ color: pin.length === 6 ? "#2ecc71" : "#f39c12", fontSize: 10 }}>
                        {pin.length === 6 ? "✓ PIN ready" : `${pin.length}/6 digits`}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>{_("CONFIRM PIN *")}</Text>
                  <View style={[styles.inputContainer,
                    confirmPin.length > 0 && pin !== confirmPin && { borderColor: "#ff6b6b" },
                    confirmPin.length === 6 && pin === confirmPin && { borderColor: "#2ecc71" }
                  ]}>
                    <TextInput
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      style={styles.inputField}
                      secureTextEntry={!showConfirmPin}
                      placeholder={_("Re-enter PIN")}
                      placeholderTextColor="#7d93b4"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable style={styles.inputRightIcon} onPress={() => setShowConfirmPin(!showConfirmPin)}>
                      <Ionicons name={showConfirmPin ? "eye-outline" : "eye-off-outline"} size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                  {confirmPin.length > 0 && (
                    <Text style={{ color: pin === confirmPin ? "#2ecc71" : "#ff6b6b", fontSize: 11, marginTop: -8, marginBottom: 8 }}>
                      {pin === confirmPin ? "✓ PINs match" : "✗ PINs do not match"}
                    </Text>
                  )}
                </>
              )}

              {/* ── Inline error banner ─────────────────────────────────── */}
              {errorMsg && (
                <View style={[styles.inlineError, { marginBottom: 15 }]}>
                  <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
                  <Text style={styles.inlineErrorText}>{errorMsg}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  compact && styles.primaryBtnCompact,
                  pressed && { opacity: 0.8 },
                  loading && { opacity: 0.6 },
                  { marginTop: 15 }
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.primaryBtnText, compact && styles.primaryBtnTextCompact]}>
                      {_("Register Account →")}
                    </Text>
                }
              </Pressable>

              <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 25, alignItems: 'center' }}>
                <Text style={styles.cancelText}>{_("← Back to Login")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Estate Selection Modal */}
      <Modal visible={showEstateModal} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 }}>
          <View style={[styles.authCard, { maxHeight: "70%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.cardTitle}>{_("Select Estate")}</Text>
              <Pressable onPress={() => setShowEstateModal(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {estatesLoading ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator color={palette.accentBlue} />
                  <Text style={{ color: palette.muted, marginTop: 10 }}>{_("Loading estates...")}</Text>
                </View>
              ) : estates.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Text style={{ color: "#ffb4b4", textAlign: "center" }}>{_("No estates found.")}</Text>
                  <Pressable onPress={fetchEstates} style={{ marginTop: 10 }}>
                    <Text style={{ color: palette.accentBlue }}>{_("Retry")}</Text>
                  </Pressable>
                </View>
              ) : (
                estates.map((est, idx) => (
                  <Pressable
                    key={idx}
                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
                    onPress={() => {
                      setSelectedEstate(est);
                      setShowEstateModal(false);
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "500" }}>{est.name}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>Code: {est.code}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Agent (Field In-Charge) Selection Modal */}
      <Modal visible={showAgentModal} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 }}>
          <View style={[styles.authCard, { maxHeight: "70%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.cardTitle}>{_("Select Field In-Charge")}</Text>
              <Pressable onPress={() => setShowAgentModal(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {agents.map((agent, idx) => (
                <Pressable
                  key={idx}
                  style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
                  onPress={() => { setSelectedAgent(agent); setShowAgentModal(false); }}
                >
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "500" }}>{agent.fullName}</Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>{agent.employeeId || "Transport Agent"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Collection Route Selection Modal */}
      <Modal visible={showRouteModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 }}>
          <View style={[styles.authCard, { maxHeight: "70%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.cardTitle}>{_("Select Collection Route...")}</Text>
              <Pressable onPress={() => setShowRouteModal(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {estateRoutes.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Ionicons name="map-outline" size={32} color={palette.muted} style={{ marginBottom: 10 }} />
                  <Text style={{ color: palette.muted, textAlign: "center" }}>
                    No collection routes defined for this estate yet.
                  </Text>
                </View>
              ) : (
                estateRoutes.map((r: any, idx: number) => (
                  <Pressable
                    key={r.routeId ?? idx}
                    style={[{
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: "rgba(255,255,255,0.05)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }, selectedRoute === `${r.name} (${r.code})` && { backgroundColor: "rgba(46,204,113,0.08)" }]}
                    onPress={() => {
                      setSelectedRoute(`${r.name} (${r.code})`);
                      setShowRouteModal(false);
                    }}
                  >
                    <Ionicons
                      name={selectedRoute === `${r.name} (${r.code})` ? "checkmark-circle" : "radio-button-off"}
                      size={20}
                      color={selectedRoute === `${r.name} (${r.code})` ? "#2ecc71" : palette.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: selectedRoute === `${r.name} (${r.code})` ? "#fff" : "#cbd5e1", fontSize: 16, fontWeight: selectedRoute === `${r.name} (${r.code})` ? "700" : "500" }}>
                        {r.name}
                      </Text>
                      {r.code ? (
                        <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>Code: {r.code}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
