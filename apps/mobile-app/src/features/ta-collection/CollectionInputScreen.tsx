import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { palette, styles } from "../../ui/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock Small Holders list for offline DB
const MOCK_SUPPLIERS = [
  { id: "SH-0142", name: "Jayasekara, R.", passbook: "P-1001", land: "Green Hill" },
  { id: "SH-0089", name: "Perera, D.W.", passbook: "P-1002", land: "Riverside" },
  { id: "SH-0231", name: "Silva, M.K.", passbook: "P-1003", land: "High Peak" },
  { id: "SH-0077", name: "Fernando, L.", passbook: "P-1004", land: "Sunrise" },
];

export function CollectionInputScreen({ navigation }: any) {
  const [supplierId, setSupplierId] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [grossWeight, setGrossWeight] = useState("");
  const [isBluetoothReading, setIsBluetoothReading] = useState(false);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-capture GPS immediately when opening screen
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("GPS Required", "Location tracking is mandatory for collections.");
        setIsLocationLoading(false);
        return;
      }
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      } catch (err) {
        // Fallback for bad signal
      }
      setIsLocationLoading(false);
    })();
  }, []);

  const simulateBluetoothRead = () => {
    setIsBluetoothReading(true);
    setTimeout(() => {
      // Simulate reading a random weight from an IoT hanging scale
      const randomWeight = (Math.random() * 50 + 20).toFixed(1);
      setGrossWeight(randomWeight);
      setIsBluetoothReading(false);
    }, 1500);
  };

  const handleSaveCollection = async () => {
    if (!selectedSupplier) {
      Alert.alert("Error", "Please select a Small Holder first.");
      return;
    }
    if (!grossWeight || parseFloat(grossWeight) <= 0) {
      Alert.alert("Error", "Invalid gross weight.");
      return;
    }

    setIsSaving(true);
    const newCollection = {
      collectionId: "COL-" + Math.floor(Math.random() * 1000000),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      grossWeight: parseFloat(grossWeight),
      timestamp: new Date().toISOString(),
      gpsLat: location?.coords.latitude || 0,
      gpsLong: location?.coords.longitude || 0,
      syncStatus: "QUEUED" // Offline First
    };

    try {
      // Offline-first: Save to AsyncStorage
      const existingStr = await AsyncStorage.getItem("OFFLINE_COLLECTIONS");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.push(newCollection);
      await AsyncStorage.setItem("OFFLINE_COLLECTIONS", JSON.stringify(existing));
      
      setIsSaving(false);
      Alert.alert("Success", "Collection saved to offline queue!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      setIsSaving(false);
      Alert.alert("Database Error", "Failed to cache offline.");
    }
  };

  const filteredSuppliers = MOCK_SUPPLIERS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.passbook.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          </View>
        </View>

        {/* Supplier Selection */}
        <Text style={styles.label}>Small Holder</Text>
        <Pressable style={styles.inputContainer} onPress={() => setShowSupplierModal(true)}>
          <Ionicons name="person-outline" size={20} color={palette.muted} />
          <Text style={{ flex: 1, color: selectedSupplier ? "white" : palette.muted, marginLeft: 10 }}>
            {selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.passbook})` : "Tap to select supplier..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={palette.muted} />
        </Pressable>

        {/* Selected Supplier Details */}
        {selectedSupplier && (
          <View style={[styles.infoBox, { marginBottom: 20, marginTop: -5 }]}>
            <Text style={{ color: palette.muted, fontSize: 12 }}>ID: {selectedSupplier.id}</Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>Land: {selectedSupplier.land}</Text>
          </View>
        )}

        {/* IoT Scale Input */}
        <Text style={[styles.label, { marginTop: 10 }]}>Gross Weight (kg)</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 30 }}>
          <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
            <Ionicons name="scale-outline" size={20} color={palette.muted} style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.inputField}
              placeholder="0.00"
              placeholderTextColor={palette.muted}
              value={grossWeight}
              onChangeText={setGrossWeight}
              keyboardType="numeric"
            />
          </View>
          <Pressable 
            style={[styles.primaryBtn, { flex: 1, height: 50, marginBottom: 0, 
                    backgroundColor: isBluetoothReading ? palette.bgInnerTop : palette.accentBlue,
                    flexDirection: "row", gap: 8 }]}
            onPress={simulateBluetoothRead}
            disabled={isBluetoothReading}
          >
            {isBluetoothReading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="bluetooth" size={18} color="white" />
            )}
            <Text style={[styles.primaryBtnText, { fontSize: 13 }]}>Read Scale</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Floating Save Action */}
      <View style={styles.floatingBottom}>
        <Pressable 
          style={[styles.primaryBtn, { backgroundColor: palette.accentGreen, height: 55, flexDirection: "row", gap: 8 }]}
          onPress={handleSaveCollection}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="save-outline" size={20} color="white" />
          )}
          <Text style={styles.primaryBtnText}>QUEUE OFFLINE</Text>
        </Pressable>
      </View>

      {/* Supplier Picker Modal */}
      <Modal visible={showSupplierModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#111f38", height: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Select Supplier</Text>
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
              {filteredSuppliers.map((sup, idx) => (
                <Pressable 
                  key={idx} 
                  style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  onPress={() => {
                    setSelectedSupplier(sup);
                    setShowSupplierModal(false);
                  }}
                >
                  <View>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "500" }}>{sup.name}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{sup.passbook} • {sup.id}</Text>
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
