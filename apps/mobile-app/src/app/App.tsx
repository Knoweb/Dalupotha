import React from "react";
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
