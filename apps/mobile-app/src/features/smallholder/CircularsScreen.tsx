import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  TextInput,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";
import { getTranslation } from "./SupplierScreens";

export function CircularsScreen({ navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [search, setSearch] = useState("");

  const mockCirculars = [
    { id: 'TRI001', title: _('Feb 2026 - Tea Price Revision'), date: '01 Feb 2026', read: false },
    { id: 'TRI002', title: _('Fertilizer Subsidy Scheme 2026'), date: '15 Jan 2026', read: true },
    { id: 'TRI003', title: _('Quality Standards Update - Q1 2026'), date: '10 Jan 2026', read: true },
    { id: 'TRI004', title: _('Pest Alert: Blister Blight Notice'), date: '05 Dec 2025', read: true },
  ];

  const filtered = mockCirculars.filter(c => 
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

          {filtered.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={{ color: palette.muted, marginTop: 15 }}>{_("No circulars found")}</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <Pressable
                key={item.id}
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
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
  );
}
