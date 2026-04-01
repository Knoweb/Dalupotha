import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

export const StatusBadge = ({type, text}: any) => {
  let color = palette.accentGreen;
  let bg = "transparent";
  let icon = "checkmark";
  if (type === "gps") { color = palette.accentGreen; icon = "location-outline"; bg = "transparent"; }
  if (type === "nogps") { color = "#e74c3c"; icon = "alert-circle-outline"; bg = "transparent"; }
  if (type === "synced") { color = palette.accentGreen; icon = "checkmark"; bg = "rgba(31,190,87,0.1)"; }
  if (type === "queued") { color = "#f39c12"; icon = "time-outline"; bg = "rgba(243,156,18,0.1)"; }
  if (type === "failed") { color = "#e74c3c"; icon = "alert-circle-outline"; bg = "rgba(231,76,60,0.1)"; }
  if (type === "manual") { color = "#9b59b6"; icon = "alert-circle-outline"; bg = "rgba(155,89,182,0.1)"; }
  if (type === "syncing") { color = palette.accentBlue; icon = "sync-outline"; bg = "rgba(46,168,255,0.1)"; }

  return (
    <View style={[styles.badgeLine, { borderColor: color, backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[styles.badgeText, { color: color, marginLeft: 2 }]}>{text}</Text>
    </View>
  );
};

undefined

undefined

undefined

undefined
