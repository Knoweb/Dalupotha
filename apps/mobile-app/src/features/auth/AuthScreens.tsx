import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Image, ImageBackground, Pressable,
  KeyboardAvoidingView, Platform,
  SafeAreaView, Text, TextInput, useWindowDimensions, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";
import { AuthAPI, apiPost } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Role = "agent" | "supplier";

const RoleTab = ({ icon, label, active, onPress }: any) => (
  <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : palette.muted} />
    <Text style={[styles.tabText, active && { color: "#fff" }]}>{label}</Text>
  </Pressable>
);

// ── Login Screen ───────────────────────────────────────────────────────────────
export function LoginScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const compact = width < 390 || height < 780;
  const insets = useSafeAreaInsets();

  const normalizeEmployeeId = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
      .replace(/\s+/g, "");

  const [lang, setLang]               = useState<"en" | "si">("en");
  const [role, setRole]               = useState<Role>("supplier");
  const [id, setId]                   = useState("");
  const [pin, setPin]                 = useState("");
  const [showPin, setShowPin]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [errorField, setErrorField]   = useState<"id" | "pin" | "both" | null>(null);

  // Clear errors when user edits either field
  const handleIdChange = (val: string) => { setId(val); setErrorMsg(null); setErrorField(null); };
  const handlePinChange = (val: string) => { setPin(val); setErrorMsg(null); setErrorField(null); };

  /** Parse backend error message → determine which field is at fault */
  const parseLoginError = (msg: string, isSupplier: boolean): { field: "id" | "pin" | "both"; display: string } => {
    const lower = msg.toLowerCase();
    if (
      lower.includes("error 500") ||
      lower.includes("internal server error") ||
      lower.includes("network request failed") ||
      lower.includes("failed to fetch") ||
      lower.includes("load failed") ||
      lower.includes("timeout reaching server")
    ) {
      return {
        field: "both",
        display: "Cannot reach login server. Please check API IP/server and try again.",
      };
    }
    if (lower.includes("no account found") || lower.includes("not found") || lower.includes("register")) {
      const idLabel = isSupplier ? "Passbook / Supplier ID" : "Agent ID";
      return {
        field: "id",
        display: `No account found for this ${idLabel}. Please check and try again.`,
      };
    }
    if (lower.includes("pin") && !lower.includes("id")) {
      return { field: "pin", display: "Incorrect PIN. Please try again." };
    }
    if (lower.includes("not active") || lower.includes("account is not active")) {
      return { field: "both", display: "Your account is not active. Please contact support." };
    }
    // Generic fallback — highlight both
    const idLabel = isSupplier ? "Passbook / Supplier ID" : "Agent ID";
    return { field: "both", display: `Incorrect ${idLabel} or PIN. Please try again.` };
  };

  const dict: any = {
    si: {
      "Agent Portal": "නියෝජිත පෝටලය",
      "Supplier Portal": "සැපයුම්කරු පෝටලය",
      "Agent": "නියෝජිත",
      "Supplier": "සැපයුම්කරු",
      "Access your supply history, debts and payments": "ඔබගේ සැපයුම් ඉතිහාසය, ණය සහ ගෙවීම් බලන්න",
      "Access field collections and sync status": "ක්ෂේත්‍ර එකතු කිරීම් සහ සමමුහුර්ත තත්ත්වය බලන්න",
      "SUPPLIER ID / PASSBOOK": "සැපයුම්කරු හැඳුනුම්පත / පාස්පොත",
      "AGENT ID": "නියෝජිත හැඳුනුම්පත",
      "Login →": "ඇතුල් වන්න →",
      "New supplier?": "නව සැපයුම්කරුවෙක්ද?",
      "Register your Land": "ඔබගේ ඉඩම ලියාපදිංචි කරන්න",
      "New agent?": "නව නියෝජිතයෙක්ද?",
      "Register as Agent": "නියෝජිතයෙකු ලෙස ලියාපදිංචි වන්න",
      "Trouble logging in?": "ඇතුල් වීමේ ගැටලුවක්ද?",
      "Help Center": "උදව් මධ්‍යස්ථානය",
      "PIN": "PIN අංකය",
      "Enter your PIN": "ඔබගේ PIN අංකය ඇතුලත් කරන්න"
    }
  };
  const _ = (k: string) => (lang === 'si' && dict.si[k]) ? dict.si[k] : k;

  const cardTitle    = useMemo(() => (role === "supplier" ? _("Supplier Portal") : _("Agent Portal")), [role, lang]);
  const portalSubtitle = role === "supplier"
    ? _("Access your supply history, debts and payments")
    : _("Access field collections and sync status");
  const idLabel       = role === "supplier" ? _("SUPPLIER ID / PASSBOOK") : _("AGENT ID");
  const idPlaceholder = role === "supplier" ? "e.g. 05497" : "TA-XXXX";

  // ── Supplier: PIN login ───────────────────────────────────────────────────
  const handleSupplierLogin = async () => {
    if (!id.trim() && !pin.trim()) {
      setErrorField("both");
      setErrorMsg("Please enter your Passbook / Supplier ID and PIN.");
      return;
    }
    if (!id.trim()) {
      setErrorField("id");
      setErrorMsg("Please enter your Passbook / Supplier ID.");
      return;
    }
    if (!pin.trim()) {
      setErrorField("pin");
      setErrorMsg("Please enter your PIN.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setErrorField(null);
    try {
      const res: any = await apiPost(AuthAPI.supplierLogin, {
        passbookNo: id.trim(),
        pin:        pin.trim(),
      });
      await AsyncStorage.setItem("dalupotha_session", JSON.stringify({ role, token: res.token, user: res }));
      navigation.navigate("MainTabs", { role, token: res.token, user: res });
    } catch (err: any) {
      const { field, display } = parseLoginError(err.message ?? "", true);
      setErrorField(field);
      setErrorMsg(display);
    } finally {
      setLoading(false);
    }
  };

  // ── Agent: PIN login ──────────────────────────────────────────────────────
  const handleAgentLogin = async () => {
    const normalizedId = normalizeEmployeeId(id);
    const normalizedPin = pin.trim();

    if (!normalizedId && !normalizedPin) {
      setErrorField("both");
      setErrorMsg("Please enter your Agent ID and PIN.");
      return;
    }
    if (!normalizedId) {
      setErrorField("id");
      setErrorMsg("Please enter your Agent ID.");
      return;
    }
    if (!normalizedPin) {
      setErrorField("pin");
      setErrorMsg("Please enter your PIN.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setErrorField(null);
    try {
      const res: any = await apiPost(AuthAPI.login, {
        employeeId: normalizedId,
        password:   normalizedPin,
      });
      await AsyncStorage.setItem("dalupotha_session", JSON.stringify({ role, token: res.token, user: res }));
      navigation.navigate("MainTabs", { role, token: res.token, user: res });
    } catch (err: any) {
      const { field, display } = parseLoginError(err.message ?? "", false);
      setErrorField(field);
      setErrorMsg(display);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = role === "supplier" ? handleSupplierLogin : handleAgentLogin;

  // Clear error on role switch
  const handleRoleSwitch = (newRole: Role) => { setRole(newRole); setErrorMsg(null); setErrorField(null); setId(""); setPin(""); };

  return (
    <ImageBackground
      source={require("../../../assests/login_bg.jpg")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {/* Gradient overlay — fills entire screen including system nav area */}
      <LinearGradient
        colors={["rgba(4,13,32,0.80)", "rgba(5,22,18,0.60)", "rgba(4,13,32,0.88)"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingRight: 20, paddingTop: Math.max(insets.top, 10) + 10, zIndex: 10 }}>
          <Pressable
            onPress={() => setLang(lang === "en" ? "si" : "en")}
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center"
            }}
          >
            <Ionicons name="language" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
              {lang === "en" ? "සිංහල" : "English"}
            </Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.scroll, compact && styles.scrollCompact]}>
          <View style={styles.brandBlock}>
            <View style={[styles.logoHalo, compact && styles.logoHaloCompact]}>
              <Image
                source={require("../../../assests/dalupotha_icon.png")}
                style={[styles.logo, compact && styles.logoCompact]}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.brandSinhala, compact && styles.brandSinhalaCompact]}>දළුපොත</Text>
            <Text style={[styles.brandEn, compact && styles.brandEnCompact]}>Factory Digital Gateway</Text>
          </View>

          <View style={[styles.authCard, compact && styles.authCardCompact]}>
            <View style={styles.roleTabs}>
              <RoleTab icon="car-outline"    label={_("Agent")}    active={role === "agent"}    onPress={() => handleRoleSwitch("agent")} />
              <RoleTab icon="person-outline" label={_("Supplier")} active={role === "supplier"} onPress={() => handleRoleSwitch("supplier")} />
            </View>
            <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{cardTitle}</Text>
            <Text style={styles.cardSubtitle}>{portalSubtitle}</Text>

            <Text style={[styles.label, (errorField === "id" || errorField === "both") && { color: "#ff6b6b" }]}>
              {idLabel}{(errorField === "id" || errorField === "both") ? " ✗" : ""}
            </Text>
            <View style={[styles.inputContainer, (errorField === "id" || errorField === "both") && { borderColor: "#ff6b6b", borderWidth: 1.5 }]}>
              <TextInput
                value={id}
                onChangeText={handleIdChange}
                style={styles.inputField}
                placeholder={idPlaceholder}
                placeholderTextColor="#7d93b4"
                autoCapitalize={role === "agent" ? "characters" : "none"}
                autoCorrect={false}
              />
              {role === "supplier" && (
                <View style={styles.inputRightIcon}>
                  <Ionicons
                    name={errorField === "id" || errorField === "both" ? "alert-circle-outline" : "car-sport-outline"}
                    size={20}
                    color={errorField === "id" || errorField === "both" ? "#ff6b6b" : palette.muted}
                  />
                </View>
              )}
            </View>

            {/* PIN field — shown for both roles */}
            <Text style={[styles.label, (errorField === "pin" || errorField === "both") && { color: "#ff6b6b" }]}>
              {_("PIN")}{(errorField === "pin" || errorField === "both") ? " ✗" : ""}
            </Text>
            <View style={[styles.inputContainer, (errorField === "pin" || errorField === "both") && { borderColor: "#ff6b6b", borderWidth: 1.5 }]}>
              <TextInput
                value={pin}
                onChangeText={handlePinChange}
                style={styles.inputField}
                secureTextEntry={!showPin}
                placeholder={_("Enter your PIN")}
                placeholderTextColor="#7d93b4"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable style={styles.inputRightIcon} onPress={() => setShowPin(!showPin)}>
                <Ionicons
                  name={showPin ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={errorField === "pin" || errorField === "both" ? "#ff6b6b" : palette.muted}
                />
              </Pressable>
            </View>

            {/* ── Inline error banner ──────────────────────────────────────── */}
            {errorMsg && (
              <View style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: "rgba(255,107,107,0.12)",
                borderRadius: 10,
                borderLeftWidth: 3,
                borderLeftColor: "#ff6b6b",
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 10,
                gap: 8,
              }}>
                <Ionicons name="warning-outline" size={17} color="#ff6b6b" style={{ marginTop: 1 }} />
                <Text style={{ color: "#ff9090", fontSize: 13, lineHeight: 18, flex: 1 }}>
                  {errorMsg}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                compact && styles.primaryBtnCompact,
                pressed && { opacity: 0.8 },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.primaryBtnText, compact && styles.primaryBtnTextCompact]}>
                    {_("Login →")}
                  </Text>
              }
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Register", { initialRole: role, lang })}
              style={{ marginTop: 25, alignItems: "center" }}
            >
              <Text style={styles.helpCenterText}>
                {role === "supplier" ? _("New supplier?") : _("New agent?")}{" "}
                <Text style={[styles.helpCenterLink, { color: palette.accentGreen }]}>
                  {role === "supplier" ? _("Register your Land") : _("Register as Agent")}
                </Text>
              </Text>
            </Pressable>

          </View>
          <Text style={styles.footer}>Secured by දළුපොත Gateway · v3.0</Text>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── OTP Screen ─────────────────────────────────────────────────────────────────
export function OtpScreen({ route, navigation }: any) {
  const { role, contact, lang = "en", otpCode } = route.params;
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Show OTP in a popup when dev mode returns it in the response
  React.useEffect(() => {
    if (otpCode) {
      Alert.alert(
        "🔐 Dev Mode — OTP",
        `Your verification code is:\n\n${otpCode}\n\nEnter this code below to continue.`,
        [{ text: "Got it", style: "default" }]
      );
    }
  }, []);

  const dict: any = {
    si: {
      "Verify Identity": "අනන්‍යතාවය තහවුරු කරන්න",
      "Enter the 6-digit code sent to": "වෙත එවන ලද ඉලක්කම් 6ක කේතය ඇතුලත් කරන්න",
      "Verify & Access": "තහවුරු කර ඇතුල් වන්න",
      "Didn't receive code?": "කේතය ලැබුණේ නැද්ද?",
      "Resend": "නැවත එවන්න",
      "← Back to Login": "← නැවත පුරනය වීමට",
      "Please enter the 6-digit code.": "කරුණාකර ඉලක්කම් 6ක කේතය ඇතුලත් කරන්න.",
      "Invalid or expired OTP.": "වලංගු නොවන හෝ කල් ඉකුත් වූ OTP.",
      "OTP Resent": "OTP නැවත යවන ලදී",
      "A new code has been sent to your number.": "ඔබගේ අංකයට නව කේතයක් යවා ඇත.",
      "Error": "දෝෂයකි",
      "Could not resend OTP.": "OTP නැවත යැවීමට නොහැකි විය."
    }
  };
  const _ = (k: string) => (lang === 'si' && dict.si[k]) ? dict.si[k] : k;

  // Countdown timer
  React.useEffect(() => {
    const t = setInterval(() => setResendTimer(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      let res: any;
      if (route.params.isRegistering) {
        const endpoint = role === "supplier" ? AuthAPI.registerSmallHolder : AuthAPI.registerAgent;
        res = await apiPost(endpoint, {
          ...route.params.registerData,
          otpCode: otp
        });
        // Success handled by clean redirect
      } else {
        res = await apiPost(AuthAPI.verifyOtp, {
          contact: contact,
          code:    otp,       // backend expects 'code' field
        });
      }
      // Token received — navigate to main
      await AsyncStorage.setItem("dalupotha_session", JSON.stringify({ role, token: res.token, user: res }));
      navigation.navigate("MainTabs", { role, token: res.token, user: res });
    } catch (err: any) {
      setErrorMsg(err.message ?? "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const res: any = await apiPost(AuthAPI.sendOtp, { contact });
      setResendTimer(30);
      if (res?.otpCode) {
        // Dev mode — show new OTP in popup
        Alert.alert(
          "🔐 Dev Mode — New OTP",
          `Your new verification code is:\n\n${res.otpCode}\n\nEnter this code below to continue.`,
          [{ text: "Got it", style: "default" }]
        );
      } else {
        Alert.alert(_("OTP Resent"), _("A new code has been sent to your number."));
      }
    } catch (err: any) {
      Alert.alert(_("Error"), err.message ?? _("Could not resend OTP."));
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.scroll}>
          <View style={styles.authCard}>
            <View style={{ alignItems: "center", marginBottom: 15 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={palette.accentBlue} />
            </View>
            <Text style={[styles.cardTitle, styles.centered]}>{_("Verify Identity")}</Text>
            <Text style={[styles.cardSubtitle, styles.centered]}>
              {lang === 'si' ? (
                <>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>{contact}</Text>
                  {"\n"}{_("Enter the 6-digit code sent to")}
                </>
              ) : (
                <>
                  {_("Enter the 6-digit code sent to")}{"\n"}
                  <Text style={{ color: "#fff", fontWeight: "600" }}>{contact}</Text>
                </>
              )}
            </Text>

            {errorMsg && (
              <View style={[styles.inlineError, { marginBottom: 15 }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
                <Text style={styles.inlineErrorText}>{_(errorMsg)}</Text>
              </View>
            )}

            <TextInput
              value={otp}
              onChangeText={(t) => { setOtp(t); if(errorMsg) setErrorMsg(null); }}
              style={styles.otpInput}
              keyboardType="default"
              maxLength={6}
              placeholder="------"
              placeholderTextColor="#3b5275"
              autoFocus
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.8 },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{_("Verify & Access")}</Text>
              }
            </Pressable>

            <View style={styles.helpCenterWrap}>
              <Pressable onPress={handleResend}>
                <Text style={styles.helpCenterText}>
                  {_("Didn't receive code?")}{" "}
                  <Text style={[styles.helpCenterLink, resendTimer > 0 && { opacity: 0.4 }]}>
                    {resendTimer > 0 ? `${_("Resend")} (0:${String(resendTimer).padStart(2, "0")})` : _("Resend")}
                  </Text>
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 25 }}>
              <Text style={styles.cancelText}>{_("← Back to Login")}</Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
