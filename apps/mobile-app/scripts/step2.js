const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'app', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

const regexMap = {
  LoginScreen: /function LoginScreen\([\s\S]+?\}\s*(?=function OtpScreen)/,
  OtpScreen: /function OtpScreen\([\s\S]+?\}\s*(?=function DashboardScreen|const StatusBadge)/,
  StatusBadge: /const StatusBadge = \([\s\S]+?\};\s*(?=function DashboardScreen)/,
  DashboardScreen: /function DashboardScreen\([\s\S]+?\}\s*(?=function CollectionsScreen)/,
  CollectionsScreen: /function CollectionsScreen\([\s\S]+?\}\s*(?=function RequestsScreen)/,
  RequestsScreen: /function RequestsScreen\([\s\S]+?\}\s*(?=function ProfileScreen)/,
  ProfileScreen: /function ProfileScreen\([\s\S]+?\}\s*(?=\/\* --- Supplier Screens ---)/,
  SupplierHomeScreen: /function SupplierHomeScreen\([\s\S]+?\}\s*(?=function SupplierSupplyScreen)/,
  SupplierSupplyScreen: /function SupplierSupplyScreen\([\s\S]+?\}\s*(?=function SupplierPaymentsScreen)/,
  SupplierPaymentsScreen: /function SupplierPaymentsScreen\([\s\S]+?\}\s*(?=function SupplierDebtsScreen)/,
  SupplierDebtsScreen: /function SupplierDebtsScreen\([\s\S]+?\}\s*(?=function SupplierProfileScreen)/,
  SupplierProfileScreen: /function SupplierProfileScreen\([\s\S]+?\}\s*(?=$)/,
};

let extracted = {};
for (const [name, regex] of Object.entries(regexMap)) {
  const match = content.match(regex);
  if (match) {
    if (name.startsWith('function') || match[0].startsWith('const') || match[0].startsWith('function')) {
      extracted[name] = 'export ' + match[0].trim();
    } else {
      extracted[name] = match[0].trim();
    }
    // Remove from App.tsx
    content = content.replace(match[0], '');
  } else {
    console.log(`Could not find ${name}`);
  }
}

// Write AuthScreens.tsx
const authContent = `import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { palette, styles } from "../../ui/theme";

type Role = "agent" | "supplier";

const RoleTab = ({ icon, label, active, onPress }: any) => (
  <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : palette.muted} />
    <Text style={[styles.tabText, active && {color: "#fff"}]}>{label}</Text>
  </Pressable>
);

${extracted.LoginScreen}

${extracted.OtpScreen}
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'features', 'auth', 'AuthScreens.tsx'), authContent);

// Write AgentScreens.tsx
const agentContent = `import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

${extracted.StatusBadge || ''}

${extracted.DashboardScreen}

${extracted.CollectionsScreen}

${extracted.RequestsScreen}

${extracted.ProfileScreen}
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'features', 'ta-collection', 'AgentScreens.tsx'), agentContent);

// Write SupplierScreens.tsx
const supplierContent = `import React, { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";

${extracted.SupplierHomeScreen}

${extracted.SupplierSupplyScreen}

${extracted.SupplierPaymentsScreen}

${extracted.SupplierDebtsScreen}

${extracted.SupplierProfileScreen}
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'features', 'smallholder', 'SupplierScreens.tsx'), supplierContent);

// App.tsx
content = `import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../ui/theme";

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

fs.writeFileSync(appPath, content);
console.log('App.tsx extracted to separate files successfully.');
