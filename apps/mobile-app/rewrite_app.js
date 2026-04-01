const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const appTsxPath = path.join(srcDir, 'app', 'App.tsx');
const uiDir = path.join(srcDir, 'ui');
const authDir = path.join(srcDir, 'features', 'auth');
const agentDir = path.join(srcDir, 'features', 'ta-collection');
const supplierDir = path.join(srcDir, 'features', 'smallholder');

// Ensure directories exist
[uiDir, authDir, agentDir, supplierDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

// 1. Extract theme.ts
const paletteRegex = /const palette = {[\s\S]*?};\n/;
const stylesRegex = /const styles = StyleSheet\.create\({[\s\S]*?}\);\n?/;

const paletteMatch = appTsxContent.match(paletteRegex);
const stylesMatch = appTsxContent.match(stylesRegex);

const themeContent = `import { StyleSheet, Platform } from "react-native";\n\nexport ${paletteMatch[0]}\nexport ${stylesMatch[0]}`;
fs.writeFileSync(path.join(uiDir, 'theme.ts'), themeContent);

// 2. Extract AuthScreens.tsx
const roleTabStr = `\nconst RoleTab = ({ icon, label, active, onPress }: any) => (
  <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : palette.muted} />
    <Text style={[styles.tabText, active && {color: "#fff"}]}>{label}</Text>
  </Pressable>
);\n`;

const loginRegex = /function LoginScreen\({ navigation }: any\) {[\s\S]*?(?=function OtpScreen)/;
const otpRegex = /function OtpScreen\({ route, navigation }: any\) {[\s\S]*?(?=function DashboardScreen|const StatusBadge)/;

const loginMatch = appTsxContent.match(loginRegex);
const otpMatch = appTsxContent.match(otpRegex);

const authContent = `import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";

type Role = "agent" | "supplier";
${roleTabStr}
export ${loginMatch[0]}
export ${otpMatch[0]}`;

fs.writeFileSync(path.join(authDir, 'AuthScreens.tsx'), authContent);

// 3. Extract AgentScreens.tsx
const dashboardRegex = /function DashboardScreen\({ role, navigation }: any\) {[\s\S]*?(?=function CollectionsScreen)/;
const collectionsRegex = /function CollectionsScreen\({ navigation }: any\) {[\s\S]*?(?=function RequestsScreen)/;
const requestsRegex = /function RequestsScreen\({ navigation }: any\) {[\s\S]*?(?=function ProfileScreen)/;
const profileRegex = /function ProfileScreen\({ navigation }: any\) {[\s\S]*?(?=const StatusBadge)/;
const statusBadgeRegex = /const StatusBadge = \({type, text}: any\) => {[\s\S]*?(?=function SupplierHomeScreen|\/\* --- Supplier Screens ---)/;

let agentContent = `import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

`;

[statusBadgeRegex, dashboardRegex, collectionsRegex, requestsRegex, profileRegex].forEach(regex => {
    const match = appTsxContent.match(regex);
    if (match) {
        let code = match[0].trim();
        if (code.startsWith('function')) {
            code = 'export ' + code;
        } else if (code.startsWith('const')) {
            code = 'export ' + code;
        }
        agentContent += code + '\n\n';
    }
});

fs.writeFileSync(path.join(agentDir, 'AgentScreens.tsx'), agentContent);

// 4. Extract SupplierScreens.tsx
const supHomeRegex = /function SupplierHomeScreen\({ navigation }: any\) {[\s\S]*?(?=function SupplierSupplyScreen)/;
const supSupplyRegex = /function SupplierSupplyScreen\({ navigation }: any\) {[\s\S]*?(?=function SupplierPaymentsScreen)/;
const supPaymentsRegex = /function SupplierPaymentsScreen\({ navigation }: any\) {[\s\S]*?(?=function SupplierDebtsScreen)/;
const supDebtsRegex = /function SupplierDebtsScreen\({ navigation }: any\) {[\s\S]*?(?=function SupplierProfileScreen)/;
const supProfileRegex = /function SupplierProfileScreen\({ navigation }: any\) {[\s\S]*?(?=const styles = StyleSheet\.create)/;

let supplierContent = `import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

`;

[supHomeRegex, supSupplyRegex, supPaymentsRegex, supDebtsRegex, supProfileRegex].forEach(regex => {
    const match = appTsxContent.match(regex);
    if (match) {
        let code = match[0].trim();
        code = 'export ' + code;
        supplierContent += code + '\n\n';
    }
});

fs.writeFileSync(path.join(supplierDir, 'SupplierScreens.tsx'), supplierContent);

// 5. Rewrite App.tsx
const newAppContent = `import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette } from "../ui/theme";

// Screens
import { LoginScreen, OtpScreen } from "../features/auth/AuthScreens";
import { DashboardScreen, CollectionsScreen, RequestsScreen, ProfileScreen } from "../features/ta-collection/AgentScreens";
import { SupplierHomeScreen, SupplierSupplyScreen, SupplierPaymentsScreen, SupplierDebtsScreen, SupplierProfileScreen } from "../features/smallholder/SupplierScreens";

type Role = "agent" | "supplier";

type RootStackParamList = {
  Login: undefined;
  Otp: { role: Role };
  MainTabs: { role: Role };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabNavigator({ route, navigation }: any) {
  const { role } = route.params || { role: "agent" };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#061224",
          borderTopWidth: 1,
          borderTopColor: "#1b375d",
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: palette.accentGreen,
        tabBarInactiveTintColor: palette.muted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = "help-circle-outline";
          if (route.name === "Dashboard") iconName = "grid-outline";
          else if (route.name === "Collections") iconName = "clipboard-outline";
          else if (route.name === "Requests") iconName = "paper-plane-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          else if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Supply") return <MaterialCommunityIcons name="leaf" size={size} color={color} />;
          else if (route.name === "Payments") iconName = "cash-outline";
          else if (route.name === "Debts") iconName = "wallet-outline";
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {role === "supplier" ? (
        <>
          <Tab.Screen name="Home" children={() => <SupplierHomeScreen navigation={navigation} />} />
          <Tab.Screen name="Supply" children={() => <SupplierSupplyScreen navigation={navigation} />} />
          <Tab.Screen name="Payments" children={() => <SupplierPaymentsScreen navigation={navigation} />} />
          <Tab.Screen name="Debts" children={() => <SupplierDebtsScreen navigation={navigation} />} />
          <Tab.Screen name="Profile" children={() => <SupplierProfileScreen navigation={navigation} />} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" children={() => <DashboardScreen role={role} navigation={navigation} />} />
          <Tab.Screen name="Collections" children={() => <CollectionsScreen navigation={navigation} />} />
          <Tab.Screen name="Requests" children={() => <RequestsScreen navigation={navigation} />} />
          <Tab.Screen name="Profile" children={() => <ProfileScreen navigation={navigation} />} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
`;

fs.writeFileSync(appTsxPath, newAppContent);
console.log("Refactoring complete!");
