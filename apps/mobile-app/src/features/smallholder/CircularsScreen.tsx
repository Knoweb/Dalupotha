import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";
import { getTranslation } from "./SupplierScreens";
import { NotificationAPI } from "../../services/api";

const DEFAULT_CIRCULARS = [
  { id: 'LU 01', title: 'Guidelines on Land Suitability Classification for Tea', date: 'Oct 2002', read: false, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_LU01e.pdf' },
  { id: 'LU 02', title: 'Field Categorization in Tea Lands', date: 'Sep 2003', read: true, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_LU02e.pdf' },
  { id: 'PN 01', title: 'The Suitability of Tea Clones for the Different Regions', date: 'Dec 2002', read: true, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_PN01e.pdf' },
  { id: 'PN 02', title: 'Tea Nursery Management', date: 'Nov 2009', read: true, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_Advisory_Ciculars_PN_02.pdf' },
  { id: 'SP 01', title: 'Fertilizer Recommendations for Nursery Tea', date: 'Jul 2000', read: true, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_SP01e.pdf' },
  { id: 'SP 02', title: 'Fertilizer Recommendations for Immature Tea', date: 'Jul 2000', read: true, url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_SP02e.pdf' },
];

export function CircularsScreen({ navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [search, setSearch] = useState("");
  const [circulars, setCirculars] = useState<any[]>(DEFAULT_CIRCULARS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    try {
      setLoading(true);
      const response = await fetch(NotificationAPI.triCirculars);
      if (!response.ok) throw new Error('Failed to fetch circulars');
      
      const data = await response.json();
      // Map API response to UI format
      const mapped = data.map((item: any) => ({
        circularId: item.circularId,
        id: item.id || item.circularId?.substring(0, 5),
        title: item.title,
        date: item.date,
        read: false,
        url: item.url || item.contentUrl
      }));
      setCirculars(mapped);
    } catch (error) {
      console.warn('Error fetching circulars from API, using default data:', error);
      // Use default mock data if API fails
      setCirculars(DEFAULT_CIRCULARS);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const filtered = circulars.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("TRI Circulars")}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, padding: 20 }}>
        <View style={[styles.searchBox, { marginBottom: 20 }]}>
          <Ionicons name="search" size={20} color={palette.muted} />
          <TextInput
            placeholder={_("Search circulars...")}
            placeholderTextColor={palette.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginBottom: 15 }]}>
            {_("RECENT ANNOUNCEMENTS")}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#9b59b6" />
              <Text style={{ color: palette.muted, marginTop: 15 }}>{_("Fetching latest circulars...")}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={{ color: palette.muted, marginTop: 15 }}>{_("No circulars found")}</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handlePress(item.url)}
                style={({ pressed }) => [
                  {
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: item.read ? "rgba(255,255,255,0.05)" : "rgba(155,89,182,0.3)",
                    borderLeftWidth: 4,
                    borderLeftColor: item.read ? palette.muted : "#9b59b6",
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ color: item.read ? palette.muted : "#9b59b6", fontSize: 11, fontWeight: "bold" }}>{item.id}</Text>
                  <View style={{ 
                    flexDirection: "row", 
                    alignItems: "center", 
                    backgroundColor: item.read ? "rgba(255,255,255,0.05)" : "rgba(155,89,182,0.1)", 
                    paddingHorizontal: 8, 
                    paddingVertical: 3, 
                    borderRadius: 6 
                  }}>
                    <Ionicons 
                      name={item.read ? "checkmark-circle-outline" : "notifications-outline"} 
                      size={12} 
                      color={item.read ? palette.muted : "#9b59b6"} 
                    />
                    <Text style={{ 
                      color: item.read ? palette.muted : "#9b59b6", 
                      fontSize: 10, 
                      fontWeight: "bold", 
                      marginLeft: 4 
                    }}>
                      {item.read ? _("Read") : _("New")}
                    </Text>
                  </View>
                </View>
                
                <Text style={{ color: "white", fontSize: 15, fontWeight: "700", lineHeight: 22, marginBottom: 12 }}>
                  {item.title}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                  <Text style={{ color: palette.muted, fontSize: 12, marginLeft: 6 }}>{item.date}</Text>
                </View>
              </Pressable>
            ))
          )}
          
          <Pressable 
            onPress={() => handlePress("https://www.tri.lk/view-all-publications/")}
            style={({ pressed }) => [
              {
                paddingVertical: 20,
                alignItems: "center",
                opacity: pressed ? 0.6 : 1
              }
            ]}
          >
            <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "bold" }}>
              {_("Want to see more? Click here")}
            </Text>
          </Pressable>
          
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </View>
  );
}
