import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Pressable,
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

  const [role, setRole]               = useState<Role>("supplier");
  const [id, setId]                   = useState(role === "supplier" ? "PB-0934" : "");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  const cardTitle    = useMemo(() => (role === "supplier" ? "Supplier Portal" : "Agent Portal"), [role]);
  const portalSubtitle = role === "supplier"
    ? "Access your supply history, debts and payments"
    : "Access field collections and sync status";
  const idLabel       = role === "supplier" ? "SUPPLIER ID / PASSBOOK" : "AGENT ID";
  const idPlaceholder = role === "supplier" ? "e.g. PB-0934" : "Agent ID";

  // ── Supplier: OTP-based login ─────────────────────────────────────────────
  const handleSupplierContinue = async () => {
    if (!id.trim()) {
      Alert.alert("Missing Info", "Please enter your Passbook / Supplier ID.");
      return;
    }
    setLoading(true);
    try {
      await apiPost(AuthAPI.sendOtp, { contact: id.trim() });
      navigation.navigate("Otp", { role, contact: id.trim() });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Staff: password-based login ───────────────────────────────────────────
  const handleStaffLogin = async () => {
    if (!id.trim() || !password.trim()) {
      Alert.alert("Missing Info", "Please enter your Agent ID and password.");
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiPost(AuthAPI.login, {
        employeeId: id.trim(),
        password:   password.trim(),
      });
      // Store token and navigate
      navigation.navigate("MainTabs", { role, token: res.token });
    } catch (err: any) {
      Alert.alert("Login Failed", err.message ?? "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = role === "supplier" ? handleSupplierContinue : handleStaffLogin;

  return (
    <LinearGradient
      colors={[palette.bgOuter, palette.bgInnerTop, palette.bgInnerBottom]}
      locations={[0, 0.28, 1]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe}>
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
              <RoleTab icon="car-outline"    label="Agent"    active={role === "agent"}    onPress={() => setRole("agent")} />
              <RoleTab icon="person-outline" label="Supplier" active={role === "supplier"} onPress={() => setRole("supplier")} />
            </View>
            <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{cardTitle}</Text>
            <Text style={styles.cardSubtitle}>{portalSubtitle}</Text>

            <Text style={styles.label}>{idLabel}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                value={id}
                onChangeText={setId}
                style={styles.inputField}
                placeholder={idPlaceholder}
                placeholderTextColor="#7d93b4"
                autoCapitalize="none"
              />
              {role === "supplier" && (
                <View style={styles.inputRightIcon}>
                  <Ionicons name="car-sport-outline" size={20} color={palette.muted} />
                </View>
              )}
            </View>

            {/* Password only shown for staff/agent */}
            {role === "agent" && (
              <>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.inputField}
                    secureTextEntry={!showPassword}
                    placeholder="Password"
                    placeholderTextColor="#7d93b4"
                  />
                  <Pressable style={styles.inputRightIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={palette.muted}
                    />
                  </Pressable>
                </View>
              </>
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
                    {role === "supplier" ? "Send OTP →" : "Login →"}
                  </Text>
              }
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

  // Countdown timer
  React.useEffect(() => {
    const t = setInterval(() => setResendTimer(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiPost(AuthAPI.verifyOtp, {
        contact: contact,
        code:    otp,       // backend expects 'code' field
      });
      // Token received — navigate to main
      navigation.navigate("MainTabs", { role, token: res.token });
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message ?? "Invalid or expired OTP.");
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

            <TextInput
              value={otp}
              onChangeText={setOtp}
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
      </SafeAreaView>
    </LinearGradient>
  );
}
