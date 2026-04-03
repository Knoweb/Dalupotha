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

export function RegisterScreen({ route, navigation }: any) {
  const { width, height } = useWindowDimensions();
  const compact = width < 390 || height < 780;

  const [role, setRole] = useState<"supplier" | "agent">(route.params?.initialRole ?? "supplier");
  const [loading, setLoading] = useState(false);

  // Common fields
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");

  // Supplier-only fields
  const [passbookNo, setPassbookNo] = useState("");
  const [landName, setLandName] = useState("");
  const [address, setAddress] = useState("");
  const [inChargeId, setInChargeId] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estate Selection
  const [estates, setEstates] = useState<any[]>([]);
  const [selectedEstate, setSelectedEstate] = useState<any>(null);
  const [showEstateModal, setShowEstateModal] = useState(false);
  const [arcs, setArcs] = useState("");

  // Fetch estates on mount
  React.useEffect(() => {
    (async () => {
      try {
        const data: any = await apiGet(AuthAPI.getEstates, ""); // No token needed for public listing
        setEstates(data);
        if (data.length > 0) setSelectedEstate(data[0]); // Default to first
      } catch (err) {
        console.warn("Failed to fetch estates", err);
      }
    })();
  }, []);

  const handleRegister = async () => {
    // Basic validation
    if (!contact.trim() || !fullName.trim() || !selectedEstate) {
      Alert.alert("Missing Info", "Please fill in all required fields including Estate.");
      return;
    }

    if (role === "supplier") {
      if (!passbookNo.trim() || !landName.trim() || !inChargeId.trim() || !arcs.trim()) {
        Alert.alert("Missing Info", "Supplier details (Passbook, Land, Arcs) are required.");
        return;
      }
    } else {
      if (!employeeId.trim() || !password.trim()) {
        Alert.alert("Missing Info", "Agent details (ID, Password) are required.");
        return;
      }
    }

    setLoading(true);
    try {
      let gpsLat = 0, gpsLong = 0;

      // Small Holders MUST provide GPS coordinates (Anti-fraud)
      if (role === "supplier") {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "GPS is required to register your land.");
          setLoading(false);
          return;
        }

        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          gpsLat = loc.coords.latitude;
          gpsLong = loc.coords.longitude;
        } catch (gpsErr) {
          Alert.alert("GPS Error", "Please move to an open area before finalizing registration.");
          setLoading(false);
          return;
        }
      }

      // Step 2: Send OTP
      await apiPost(AuthAPI.sendOtp, { 
        contact: contact.trim(),
        purpose: "REGISTRATION" 
      });

      // Prepare common registration data
      const registerData: any = {
        contact: contact.trim(),
        fullName: fullName.trim(),
        estateId: selectedEstate?.estateId,
      };

      if (role === "supplier") {
        Object.assign(registerData, {
          passbookNo: passbookNo.trim(),
          landName: landName.trim(),
          address: address.trim(),
          inChargeId: inChargeId.trim(),
          arcs: arcs ? parseFloat(arcs) : 0,
          gpsLat,
          gpsLong
        });
      } else {
        Object.assign(registerData, {
          employeeId: employeeId.trim(),
          password: password.trim()
        });
      }

      // Step 3: Navigate to OTP verification
      navigation.navigate("Otp", { 
        role, 
        contact: contact.trim(),
        isRegistering: true,
        registerData
      });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not send OTP. Make sure phone number is correct.");
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
              <Text style={[styles.cardTitle, styles.centered]}>Account Registration</Text>
              
              <View style={[styles.roleTabs, { marginTop: 20, marginBottom: 25 }]}>
                <Pressable 
                  style={[styles.tab, role === "agent" && styles.tabActive]} 
                  onPress={() => setRole("agent")}
                >
                  <Text style={[styles.tabText, role === "agent" && { color: "#fff" }]}>Agent</Text>
                </Pressable>
                <Pressable 
                  style={[styles.tab, role === "supplier" && styles.tabActive]} 
                  onPress={() => setRole("supplier")}
                >
                  <Text style={[styles.tabText, role === "supplier" && { color: "#fff" }]}>Supplier</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>FULL NAME *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.inputField}
                  placeholder="Sumana Weerasinghe"
                  placeholderTextColor="#7d93b4"
                />
              </View>

              <Text style={styles.label}>CONTACT NUMBER *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  style={styles.inputField}
                  placeholder="07XXXXXXXX"
                  placeholderTextColor="#7d93b4"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.label}>ESTATE / DIVISION *</Text>
              <Pressable style={styles.inputContainer} onPress={() => setShowEstateModal(true)}>
                <Ionicons name="business-outline" size={20} color={palette.muted} />
                <Text style={{ flex: 1, color: selectedEstate ? "white" : palette.muted, marginLeft: 10 }}>
                  {selectedEstate ? selectedEstate.name : "Select Estate..."}
                </Text>
                <Ionicons name="chevron-down" size={20} color={palette.muted} />
              </Pressable>

              {role === "supplier" ? (
                <>
                  <Text style={styles.label}>PASSBOOK NUMBER *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={passbookNo}
                      onChangeText={setPassbookNo}
                      style={styles.inputField}
                      placeholder="PB-XXXX"
                      placeholderTextColor="#7d93b4"
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.label}>LAND NAME *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={landName}
                      onChangeText={setLandName}
                      style={styles.inputField}
                      placeholder="Green View Land"
                      placeholderTextColor="#7d93b4"
                    />
                  </View>
                  <Text style={styles.label}>LAND AREA (ARCS/PERCHES) *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={arcs}
                      onChangeText={setArcs}
                      style={styles.inputField}
                      placeholder="0.5"
                      placeholderTextColor="#7d93b4"
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.label}>IN-CHARGE OFFICER ID *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={inChargeId}
                      onChangeText={setInChargeId}
                      style={styles.inputField}
                      placeholder="EXT-201"
                      placeholderTextColor="#7d93b4"
                      autoCapitalize="characters"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>EMPLOYEE ID (TA) *</Text>
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

                  <Text style={styles.label}>CREATE PASSWORD *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      style={styles.inputField}
                      secureTextEntry={!showPassword}
                      placeholder="••••••••"
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
                  { marginTop: 15 }
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.primaryBtnText, compact && styles.primaryBtnTextCompact]}>
                      Register {"&"} Verify OTP →
                    </Text>
                }
              </Pressable>

              <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 25, alignItems: 'center' }}>
                <Text style={styles.cancelText}>← Back to Login</Text>
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
              <Text style={styles.cardTitle}>Select Estate</Text>
              <Pressable onPress={() => setShowEstateModal(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {estates.map((est, idx) => (
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
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
