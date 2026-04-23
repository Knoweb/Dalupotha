import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, Text, View, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { palette, styles } from "../ui/theme";

import { LoginScreen, OtpScreen } from "../features/auth/AuthScreens";
import { RegisterScreen } from "../features/auth/RegisterScreen";
import { DashboardScreen, CollectionsScreen, RequestsScreen, ProfileScreen } from "../features/ta-collection/AgentScreens";
import { CollectionInputScreen } from "../features/ta-collection/CollectionInputScreen";
import { SupplierHomeScreen, SupplierSupplyScreen, SupplierPaymentsScreen, SupplierDebtsScreen, SupplierProfileScreen } from "../features/smallholder/SupplierScreens";

type Role = "agent" | "supplier";
type RootStackParamList = {
  Login: undefined;
  Register: { initialRole?: Role };
  Otp: { role: Role; contact?: string; isRegistering?: boolean; registerData?: any };
  MainTabs: { role: Role; token?: string; user?: any };
  CollectionInput: { token: string; user: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabNavigator({ route, navigation }: any) {
  const { role, user, token } = route.params || { role: "agent" };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#061224",
          borderTopWidth: 1,
          borderTopColor: "#1b375d",
          height: Platform.OS === "ios" ? 85 : Platform.OS === "web" ? 74 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : Platform.OS === "web" ? 12 : 10,
          paddingTop: 10,
          position: Platform.OS === "web" ? "relative" : "absolute",
          bottom: Platform.OS === "web" ? undefined : 0,
          left: Platform.OS === "web" ? undefined : 0,
          right: Platform.OS === "web" ? undefined : 0,
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
          <Tab.Screen name="Home" children={() => <SupplierHomeScreen user={user} token={token} navigation={navigation} />} />
          <Tab.Screen name="Supply" children={() => <SupplierSupplyScreen user={user} token={token} navigation={navigation} />} />
          <Tab.Screen name="Payments" children={() => <SupplierPaymentsScreen user={user} token={token} navigation={navigation} />} />
          <Tab.Screen name="Debts" children={() => <SupplierDebtsScreen user={user} token={token} navigation={navigation} />} />
          <Tab.Screen name="Profile" children={() => <SupplierProfileScreen user={user} token={token} navigation={navigation} />} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" children={() => <DashboardScreen user={user} role={role} navigation={navigation} token={route.params?.token} />} />
          <Tab.Screen name="Collections" children={() => <CollectionsScreen navigation={navigation} user={user} token={route.params?.token} />} />
          <Tab.Screen name="Requests" children={() => <RequestsScreen navigation={navigation} user={user} token={route.params?.token} />} />
          <Tab.Screen name="Profile" children={() => <ProfileScreen user={user} navigation={navigation} />} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Alakamanda: require("../../assests/Alakamanda.ttf"),
  });

  React.useEffect(() => {
    if (Platform.OS !== "web") return;

    const styleId = "dalupotha-autofill-fix";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      textarea:-webkit-autofill,
      select:-webkit-autofill {
        -webkit-text-fill-color: #eaf3ff !important;
        -webkit-box-shadow: 0 0 0px 1000px #04132b inset !important;
        box-shadow: 0 0 0px 1000px #04132b inset !important;
        transition: background-color 9999s ease-out 0s !important;
      }
    `;

    document.head.appendChild(style);
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bgOuter, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={palette.accentGreen} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="CollectionInput" component={CollectionInputScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
