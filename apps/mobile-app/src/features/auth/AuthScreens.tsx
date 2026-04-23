import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Pressable, KeyboardAvoidingView, Platform,
  SafeAreaView, Text, TextInput, useWindowDimensions, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";
import { AuthAPI, apiPost } from "../../services/api";

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

  const normalizeEmployeeId = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
      .replace(/\s+/g, "");

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
      lower.includes("load failed")
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

  const cardTitle    = useMemo(() => (role === "supplier" ? "Supplier Portal" : "Agent Portal"), [role]);
  const portalSubtitle = role === "supplier"
    ? "Access your supply history, debts and payments"
    : "Access field collections and sync status";
  const idLabel       = role === "supplier" ? "SUPPLIER ID / PASSBOOK" : "AGENT ID";
  const idPlaceholder = role === "supplier" ? "e.g. PB-0934" : "TA-XXXX";

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
        pin:        normalizedPin,
      });
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
              <RoleTab icon="car-outline"    label="Agent"    active={role === "agent"}    onPress={() => handleRoleSwitch("agent")} />
              <RoleTab icon="person-outline" label="Supplier" active={role === "supplier"} onPress={() => handleRoleSwitch("supplier")} />
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
              PIN{(errorField === "pin" || errorField === "both") ? " ✗" : ""}
            </Text>
            <View style={[styles.inputContainer, (errorField === "pin" || errorField === "both") && { borderColor: "#ff6b6b", borderWidth: 1.5 }]}>
              <TextInput
                value={pin}
                onChangeText={handlePinChange}
                style={styles.inputField}
                secureTextEntry={!showPin}
                placeholder="Enter your PIN"
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
                    Login →
                  </Text>
              }
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Register", { initialRole: role })}
              style={{ marginTop: 25, alignItems: "center" }}
            >
              <Text style={styles.helpCenterText}>
                {role === "supplier" ? "New supplier?" : "New agent?"}{" "}
                <Text style={[styles.helpCenterLink, { color: palette.accentGreen }]}>
                  {role === "supplier" ? "Register your Land" : "Register as Agent"}
                </Text>
              </Text>
            </Pressable>

            <View style={styles.helpCenterWrap}>
              <Text style={styles.helpCenterText}>
                Trouble logging in?{" "}
                <Text style={styles.helpCenterLink}>Help Center</Text>
              </Text>
            </View>
          </View>
          <Text style={styles.footer}>Secured by දළුපොත Gateway · v3.0</Text>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── OTP Screen ─────────────────────────────────────────────────────────────────
export function OtpScreen({ route, navigation }: any) {
  const { role, contact } = route.params;
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      await apiPost(AuthAPI.sendOtp, { contact });
      setResendTimer(30);
      Alert.alert("OTP Resent", "A new code has been sent to your number.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not resend OTP.");
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
            <Text style={[styles.cardTitle, styles.centered]}>Verify Identity</Text>
            <Text style={[styles.cardSubtitle, styles.centered]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ color: "#fff", fontWeight: "600" }}>{contact}</Text>
            </Text>

            {errorMsg && (
              <View style={[styles.inlineError, { marginBottom: 15 }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
                <Text style={styles.inlineErrorText}>{errorMsg}</Text>
              </View>
            )}

            <TextInput
              value={otp}
              onChangeText={(t) => { setOtp(t); if(errorMsg) setErrorMsg(null); }}
              style={styles.otpInput}
              keyboardType="number-pad"
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
                : <Text style={styles.primaryBtnText}>Verify & Access</Text>
              }
            </Pressable>

            <View style={styles.helpCenterWrap}>
              <Pressable onPress={handleResend}>
                <Text style={styles.helpCenterText}>
                  Didn't receive code?{" "}
                  <Text style={[styles.helpCenterLink, resendTimer > 0 && { opacity: 0.4 }]}>
                    {resendTimer > 0 ? `Resend (0:${String(resendTimer).padStart(2, "0")})` : "Resend"}
                  </Text>
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 25 }}>
              <Text style={styles.cancelText}>← Back to Login</Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
