const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, 'src/app/App.tsx');
const code = fs.readFileSync(appPath, 'utf8');

function extractBetween(str, startTokens, endToken) {
  const start = str.indexOf(startTokens);
  if (start === -1) return '';
  const end = str.indexOf(endToken, start + startTokens.length);
  return str.slice(start, end);
}

// Extract specific functions accurately using a quick custom regex or slicing
const extractFunction = (funcName) => {
  const regex = new RegExp(`function ${funcName}\\s*\\(.*?\\)\\s*\\{[\\s\\S]*?\\n\\}`);
  let match = code.match(regex);
  if (!match) {
    // maybe it has nested blocks, let's use a simpler heuristic or just match up to the next \nfunction or \ntype
    const startStr = `function ${funcName}(`;
    const startIdx = code.indexOf(startStr);
    if (startIdx === -1) return '';
    const nextFunc = code.indexOf('\nfunction ', startIdx + 10);
    const nextStyles = code.indexOf('\nconst styles =', startIdx);
    const nextConst = code.indexOf('\nconst ', startIdx + 10);
    
    // Find the nearest boundary that is not -1
    const boundaries = [nextFunc, nextStyles, nextConst].filter(x => x > -1);
    const endIdx = boundaries.length ? Math.min(...boundaries) : code.length;
    return code.slice(startIdx, endIdx).trim();
  }
  return match[0];
}

const roleTabCode = `const RoleTab = ({ icon, label, active, onPress }: any) => (
  <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : palette.muted} />
    <Text style={[styles.tabText, active && {color: "#fff"}]}>{label}</Text>
  </Pressable>
);`;

const actualStatusBadgeMatch = code.match(/const StatusBadge = \(\{type, text\}: any\) => \{[\s\S]*?\n\};/);
const actualStatusBadgeCode = actualStatusBadgeMatch ? actualStatusBadgeMatch[0] : '';

const authHeader = `import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";

type Role = "agent" | "supplier";

${roleTabCode}
`;
const authCode = authHeader + '\nexport ' + extractFunction('LoginScreen') + '\n\nexport ' + extractFunction('OtpScreen');

const agentHeader = `import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

export ${actualStatusBadgeCode}
`;
const agentCode = agentHeader + '\nexport ' + extractFunction('DashboardScreen') + '\n\nexport ' + extractFunction('CollectionsScreen') + '\n\nexport ' + extractFunction('RequestsScreen') + '\n\nexport ' + extractFunction('ProfileScreen');

const supplierHeader = `import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

`;
const supplierCode = supplierHeader + '\nexport ' + extractFunction('SupplierHomeScreen') + '\n\nexport ' + extractFunction('SupplierSupplyScreen') + '\n\nexport ' + extractFunction('SupplierPaymentsScreen') + '\n\nexport ' + extractFunction('SupplierDebtsScreen') + '\n\nexport ' + extractFunction('SupplierProfileScreen');

fs.writeFileSync(path.resolve(__dirname, 'src/features/auth/AuthScreens.tsx'), authCode);
fs.writeFileSync(path.resolve(__dirname, 'src/features/ta-collection/AgentScreens.tsx'), agentCode);
fs.writeFileSync(path.resolve(__dirname, 'src/features/smallholder/SupplierScreens.tsx'), supplierCode);

console.log('Component files written.');

