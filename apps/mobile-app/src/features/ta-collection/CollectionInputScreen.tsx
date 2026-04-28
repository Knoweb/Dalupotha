import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Modal, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, apiGet } from "../../services/api";
import { 
  enqueueOfflineCollection, 
  syncQueuedCollections, 
  cacheSuppliers, 
  getCachedSuppliers 
} from "./collectionData";

type SupplierSummary = {
  supplierId: string;
  fullName: string;
  passbookNo: string;
  landName: string;
  estateId?: string;
  arcs?: number;
};

const ACTION_BUTTON_HEIGHT = 55;

export function CollectionInputScreen({ navigation, route }: any) {
  const token = route?.params?.token as string | undefined;
  const user = route?.params?.user as any;

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);
  const [supplierLoadError, setSupplierLoadError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [grossWeight, setGrossWeight] = useState("");
  const [isBluetoothReading, setIsBluetoothReading] = useState(false);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const parseWeight = (value: string) => {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const loadSuppliers = async (query: string) => {
    setIsSuppliersLoading(true);
    setSupplierLoadError(null);
    setIsUsingCache(false);

    try {
      if (!token) throw new Error("No token");

      const params = new URLSearchParams();
      params.set("limit", "120");
      if (query.trim()) params.set("search", query.trim());
      if (user?.estateId) params.set("estateId", String(user.estateId));

      const data = await apiGet<SupplierSummary[]>(`${CollectionAPI.suppliers}?${params.toString()}`, token);
      const supplierList = Array.isArray(data) ? data : [];
      setSuppliers(supplierList);

      // Successfully fetched online -> Update the offline cache for next time
      if (supplierList.length > 0) {
        await cacheSuppliers(supplierList);
      }
    } catch (err: any) {
      console.log("Online supplier fetch failed, trying local cache...");
      // Fallback to local cache if offline or server is down
      try {
        const cached = await getCachedSuppliers();
        if (cached && cached.length > 0) {
          // 1. Filter by current agent's estate first (Crucial for multi-estate security)
          let filtered = user?.estateId 
            ? cached.filter(s => s.estateId === user.estateId)
            : cached;

          // 2. Filter by search query if any
          if (query.trim()) {
            filtered = filtered.filter(s => 
              s.fullName.toLowerCase().includes(query.toLowerCase()) || 
              s.passbookNo.toLowerCase().includes(query.toLowerCase())
            );
          }
          
          setSuppliers(filtered);
          setIsUsingCache(true);
        } else {
          setSupplierLoadError("Offline and no cached suppliers found. Please connect to internet once to sync lists.");
        }
      } catch (cacheErr) {
        setSupplierLoadError("Failed to load local suppliers.");
      }
    } finally {
      setIsSuppliersLoading(false);
    }
  };

  const captureLocation = async (showAlerts = false): Promise<Location.LocationObject | null> => {
    setIsLocationLoading(true);
    setLocationError(null);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const msg = "Location services are turned off. Please enable GPS.";
        setLocation(null);
        setLocationError(msg);
        if (showAlerts) Alert.alert("GPS Required", msg);
        return null;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        const msg = "Location permission is denied. Please allow location access.";
        setLocation(null);
        setLocationError(msg);
        if (showAlerts) Alert.alert("GPS Required", msg);
        return null;
      }

      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 5000,
        });
        setLocation(current);
        return current;
      } catch {
        // Fallback when a fresh fix is temporarily unavailable.
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 120000,
          requiredAccuracy: 100,
        });

        if (lastKnown) {
          setLocation(lastKnown as Location.LocationObject);
          return lastKnown as Location.LocationObject;
        }

        const msg = "Could not get GPS signal. Move outdoors and retry.";
        setLocation(null);
        setLocationError(msg);
        if (showAlerts) Alert.alert("GPS Unavailable", msg);
        return null;
      }
    } catch {
      const msg = "GPS fetch failed unexpectedly. Please retry.";
      setLocation(null);
      setLocationError(msg);
      if (showAlerts) Alert.alert("GPS Error", msg);
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Auto-capture GPS immediately when opening screen
  useEffect(() => {
    captureLocation(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const simulateBluetoothRead = () => {
    setIsBluetoothReading(true);
    setTimeout(() => {
      const randomWeight = (Math.random() * 50 + 20).toFixed(1);
      setGrossWeight(randomWeight);
      setIsBluetoothReading(false);
    }, 1500);
  };

  const handleSaveCollection = async () => {
    setSaveFeedback(null);

    if (!token || !user?.userId) {
      setSaveFeedback("Session expired. Please log in again.");
      Alert.alert("Session Error", "Missing agent session. Please login again.");
      return;
    }

    if (!selectedSupplier) {
      setSaveFeedback("Please select a Small Holder.");
      Alert.alert("Error", "Please select a Small Holder first.");
      return;
    }

    const parsedWeight = parseWeight(grossWeight);
    if (!grossWeight || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      setSaveFeedback("Enter a valid gross weight.");
      Alert.alert("Error", "Invalid gross weight.");
      return;
    }

    setIsSaving(true);
    setSaveFeedback("Saving collection...");

    try {
      const currentLocation = location ?? (await captureLocation(true));
      if (!currentLocation) {
        setIsSaving(false);
        setSaveFeedback("GPS is required. Enable location and retry.");
        return;
      }

      const now = new Date();
      const clientRef = `COL-${now.getTime()}-${Math.floor(Math.random() * 1000)}`;

      const newItem = {
        clientRef,
        supplierId: selectedSupplier.supplierId,
        supplierName: selectedSupplier.fullName,
        passbookNo: selectedSupplier.passbookNo,
        transportAgentId: user.userId,
        transportAgentName: user.fullName || "Agent",
        grossWeight: parsedWeight,
        gpsLat: currentLocation.coords.latitude,
        gpsLong: currentLocation.coords.longitude,
        gpsStatus: "GPS" as "GPS",
        manualOverride: false,
        collectedAt: now.toISOString(),
        syncStatus: "QUEUED" as "QUEUED",
      };

      await enqueueOfflineCollection(newItem);

      // Auto-sync attempt if online
      try {
        await syncQueuedCollections(token, user.userId);
      } catch (err) {
        console.log("Background auto-sync failed (offline?). Record remains queued.");
      }

      setIsSaving(false);
      setSaveFeedback("Collection queued. Returning...");
      setTimeout(() => {
        navigation.navigate("MainTabs", {
          role: "agent",
          token,
          user,
          screen: "Collections",
        });
      }, 300);
    } catch {
      setIsSaving(false);
      setSaveFeedback("Failed to save collection to local queue.");
      Alert.alert("Queue Error", "Failed to save collection to local queue.");
    }
  };

  const canSave = useMemo(() => {
    if (!selectedSupplier) return false;
    const parsedWeight = parseWeight(grossWeight);
    return !Number.isNaN(parsedWeight) && parsedWeight > 0;
  }, [selectedSupplier, grossWeight]);

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>New Collection</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* GPS Status Box */}
        <View style={[styles.authCard, { marginBottom: 20, padding: 15, flexDirection: "row", alignItems: "center", gap: 10, borderColor: location ? palette.accentGreen : "#f39c12", borderWidth: 1 }]}>
          {isLocationLoading ? (
            <ActivityIndicator size="small" color={palette.accentBlue} />
          ) : (
            <Ionicons name={location ? "location" : "location-outline"} size={24} color={location ? palette.accentGreen : "#f39c12"} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
              {isLocationLoading ? "Acquiring GPS Signal..." : location ? "GPS Coordinates Locked" : "GPS Signal Lost"}
            </Text>
            {location && (
              <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>
                {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
            )}
            {!location && !isLocationLoading && !!locationError && (
              <Text style={{ color: "#f39c12", fontSize: 11, marginTop: 2 }}>
                {locationError}
              </Text>
            )}
          </View>
          {!location && !isLocationLoading && (
            <Pressable
              onPress={() => captureLocation(true)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#f39c12" }}
            >
              <Text style={{ color: "#f39c12", fontSize: 12, fontWeight: "700" }}>Retry GPS</Text>
            </Pressable>
          )}
        </View>

        {/* Supplier Selection */}
        <Text style={styles.label}>Small Holder</Text>
        <Pressable style={styles.inputContainer} onPress={() => setShowSupplierModal(true)}>
          <Ionicons name="person-outline" size={20} color={palette.muted} />
          <Text style={{ flex: 1, color: selectedSupplier ? "white" : palette.muted, marginLeft: 10 }}>
            {selectedSupplier ? `${selectedSupplier.fullName} (${selectedSupplier.passbookNo})` : "Tap to select supplier..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={palette.muted} />
        </Pressable>

        {/* Selected Supplier Details */}
        {selectedSupplier && (
          <View style={[styles.infoBox, { flexDirection: "column", gap: 4, marginBottom: 20, marginTop: -5 }]}> 
            <Text style={{ color: palette.muted, fontSize: 12 }}>Passbook: {selectedSupplier.passbookNo}</Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>Land: {selectedSupplier.landName}</Text>
          </View>
        )}

        {/* IoT Scale Input */}
        <Text style={[styles.label, { marginTop: 10 }]}>Gross Weight (kg)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 30, width: "100%" }}>
          <View style={[styles.inputContainer, { flex: 3, height: ACTION_BUTTON_HEIGHT, marginBottom: 0, paddingRight: 0 }]}> 
            <Ionicons name="scale-outline" size={18} color={palette.muted} style={{ marginLeft: 15 }} />
            <TextInput
              style={[
                styles.inputField, 
                { fontSize: 18, fontWeight: "600", color: "#fff" },
                Platform.OS === "web" && ({ outlineStyle: "none" } as any)
              ]}
              placeholder="0.00"
              placeholderTextColor={palette.muted}
              value={grossWeight}
              onChangeText={setGrossWeight}
              keyboardType="numeric"
            />
          </View>
          
          <View style={{ width: 12 }} />

          <Pressable 
              style={[styles.primaryBtn, { 
                flex: 2, 
                height: ACTION_BUTTON_HEIGHT, 
                marginTop: 0, 
                marginBottom: 0,
                backgroundColor: isBluetoothReading ? palette.bgInnerTop : palette.accentBlue,
                flexDirection: "row", 
                alignItems: "center", 
                justifyContent: "center",
                paddingHorizontal: 10
              }]}
            onPress={simulateBluetoothRead}
            disabled={isBluetoothReading}
          >
            {isBluetoothReading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="bluetooth" size={18} color="white" style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.primaryBtnText, { fontSize: 13, color: "white" }]} numberOfLines={1}>Read Scale</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Floating Save Action */}
      <View style={[styles.floatingBottom, { zIndex: 20, elevation: 20 }]}>
        <Pressable 
          style={[styles.primaryBtn, {
            backgroundColor: palette.accentGreen,
            opacity: canSave && !isSaving ? 1 : 0.9,
            height: ACTION_BUTTON_HEIGHT,
            marginTop: 0,
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            boxShadow: "0px 4px 8px rgba(31, 190, 87, 0.3)",
            elevation: 8,
          }]}
          onPress={() => {
            if (!isSaving) {
              setSaveFeedback("Processing...");
            }
            handleSaveCollection();
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={22} color="white" />
          )}
          <Text style={[styles.primaryBtnText, { letterSpacing: 0.5, fontWeight: "700" }]}>COMPLETE COLLECTION</Text>
        </Pressable>
        {!!saveFeedback && (
          <Text style={{ color: palette.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
            {saveFeedback}
          </Text>
        )}
      </View>

      {/* Supplier Picker Modal */}
      <Modal visible={showSupplierModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#111f38", height: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Select Supplier</Text>
                {isUsingCache && (
                  <View style={{ backgroundColor: "rgba(243,156,18,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: "#f39c12" }}>
                    <Text style={{ color: "#f39c12", fontSize: 10, fontWeight: "bold" }}>OFFLINE LIST</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => setShowSupplierModal(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={palette.muted} />
              <TextInput 
                placeholder="Search name, passbook..."
                placeholderTextColor={palette.muted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView>
              {isSuppliersLoading && (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator color={palette.accentBlue} />
                  <Text style={{ color: palette.muted, marginTop: 8 }}>Loading suppliers...</Text>
                </View>
              )}

              {!isSuppliersLoading && !!supplierLoadError && (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Text style={{ color: "#e74c3c", marginBottom: 10 }}>{supplierLoadError}</Text>
                  <Pressable onPress={() => loadSuppliers(searchQuery)}>
                    <Text style={{ color: palette.accentBlue, fontWeight: "600" }}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {!isSuppliersLoading && !supplierLoadError && suppliers.length === 0 && (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Text style={{ color: palette.muted }}>No suppliers found.</Text>
                </View>
              )}

              {!isSuppliersLoading && !supplierLoadError && suppliers.map((sup, idx) => (
                <Pressable 
                  key={idx} 
                  style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  onPress={() => {
                    setSelectedSupplier(sup);
                    setShowSupplierModal(false);
                  }}
                >
                  <View>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "500" }}>{sup.fullName}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{sup.passbookNo} • {sup.landName}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
