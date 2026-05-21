/**
 * UpdateChecker — Checks server version.json on app startup.
 * If a newer APK is available, shows a dismissible modal prompting the user to update.
 * Tapping "Update Now" opens the APK download link in the browser.
 */
import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, Pressable, ActivityIndicator,
  Linking, StyleSheet, Platform, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

// The URL where version.json is hosted (same server as the API)
const VERSION_CHECK_URL = "http://188.166.231.80/version.json";

interface ServerVersion {
  version: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes?: string;
}

/** Compare semver strings — returns true if serverVer > localVer */
function isNewer(serverVer: string, localVer: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [sM, sm, sp] = parse(serverVer);
  const [lM, lm, lp] = parse(localVer);
  if (sM !== lM) return sM > lM;
  if (sm !== lm) return sm > lm;
  return sp > lp;
}

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<ServerVersion | null>(null);
  const [visible, setVisible]       = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";

  useEffect(() => {
    // Only check on physical devices (not web or development simulator)
    if (Platform.OS === "web") return;

    const check = async () => {
      try {
        const res = await fetch(VERSION_CHECK_URL, { cache: "no-store" });
        if (!res.ok) return;
        const data: ServerVersion = await res.json();
        if (isNewer(data.version, currentVersion)) {
          setUpdateInfo(data);
          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1, duration: 400, useNativeDriver: true,
          }).start();
        }
      } catch {
        // Silently fail — don't block the user if update check fails
      }
    };

    // Check after 3 seconds so it doesn't interrupt app startup
    const timer = setTimeout(check, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    if (updateInfo?.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl);
    }
  };

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 300, useNativeDriver: true,
    }).start(() => { setVisible(false); setDismissed(true); });
  };

  if (!visible || dismissed) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleDismiss}>
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0,1], outputRange: [0.92, 1] }) }] }]}>
          {/* Header */}
          <View style={s.iconRow}>
            <View style={s.iconBg}>
              <Ionicons name="download-outline" size={28} color="#1fbe57" />
            </View>
          </View>

          <Text style={s.title}>Update Available</Text>
          <Text style={s.subtitle}>
            Version {updateInfo?.version} is ready — you have {currentVersion}
          </Text>

          {updateInfo?.releaseNotes ? (
            <View style={s.notesBox}>
              <Text style={s.notesLabel}>WHAT'S NEW</Text>
              <Text style={s.notesText}>{updateInfo.releaseNotes}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <Pressable style={s.updateBtn} onPress={handleUpdate}>
            <Ionicons name="download" size={18} color="#111" style={{ marginRight: 8 }} />
            <Text style={s.updateBtnText}>Update Now</Text>
          </Pressable>

          <Pressable style={s.laterBtn} onPress={handleDismiss}>
            <Text style={s.laterBtnText}>Remind me later</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0d1b33",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(31,190,87,0.25)",
    alignItems: "center",
  },
  iconRow:  { marginBottom: 16 },
  iconBg: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(31,190,87,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(31,190,87,0.3)",
  },
  title: {
    color: "#fff", fontSize: 22, fontWeight: "bold",
    marginBottom: 8, textAlign: "center",
  },
  subtitle: {
    color: "#7f9cc5", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16,
  },
  notesBox: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  notesLabel: {
    color: "#1fbe57", fontSize: 10, fontWeight: "bold",
    letterSpacing: 1, marginBottom: 6,
  },
  notesText:  { color: "#aac4e8", fontSize: 13, lineHeight: 18 },
  updateBtn: {
    width: "100%", height: 52, backgroundColor: "#1fbe57",
    borderRadius: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  updateBtnText: { color: "#111", fontSize: 16, fontWeight: "bold" },
  laterBtn:     { paddingVertical: 10 },
  laterBtnText: { color: "#7f9cc5", fontSize: 14, fontWeight: "600" },
});
