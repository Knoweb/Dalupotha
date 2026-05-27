import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "../../ui/theme";
import { CollectionAPI, FinanceAPI, ServicesAPI, apiGet } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const dictionary: any = {
  si: {
    // Shared / Navigation
    "Home": "මුල් පිටුව",
    "Supply": "සැපයුම",
    "Requests": "ඉල්ලීම්",
    "All": "සියල්ල",
    "Payments": "ගෙවීම්",
    "Debts": "ණය",
    "Profile": "ගිණුම",
    "Dashboard": "මුල් පිටුව",
    "Collections": "එකතු කිරීම්",
    "New": "නව",
    "Request": "ඉල්ලීම",
    "Sign Out": "පිටවන්න",
    "Language Preference": "භාෂාව තෝරන්න",
    "Switch between Sinhala and English": "සිංහල සහ ඉංග්‍රීසි අතර මාරු වන්න",
    "SETTINGS": "සැකසුම්",
    "ACCOUNT": "ගිණුම",
    "Notifications": "දැනුම්දීම්",
    "All alerts enabled": "සියලු දැනුම්දීම් සබල කර ඇත",
    "Change Password": "මුරපදය වෙනස් කරන්න",
    "Contact Support": "සහාය අමතන්න",
    "EXTENSION OFFICER": "ව්‍යාප්ති නිලධාරී",
    "Hello": "ආයුබෝවන්",
    "Weekly Supply": "සතියේ දළු සැපයුම",
    "Current Debt": "දැනට ණය",
    "Service Debts": "සේවා ණය",
    "Advance": "ඇත්තිකාරම්",
    "Advances": "අත්තිකාරම්",
    "Estimated Balance": "ඇස්තමේන්තු ගත ඉතිරිය",
    "Fertilizer": "පොහොර",
    "Leaf Bags": "දළු බෑග්",
    "Tools": "මෙවලම්",
    "Advisory": "උපදෙස්",
    "Submit Request": "ඉල්ලීම ඉදිරිපත් කරන්න",
    "Request History": "ඉල්ලීම් ඉතිහාසය",
    "No history found": "පෙර ඉතිහාසය හමු නොවීය",
    "Status": "තත්ත්වය",
    "Amount": "මුදල",
    "Quantity": "ප්‍රමාණය",
    "Type": "වර්ගය",
    "Date": "දිනය",
    "Pending": "බලාපොරොත්තු වේ",
    "Approved": "අනුමත කර ඇත",
    "Rejected": "ප්‍රතික්ෂේප කර ඇත",
    "Processing": "ක්‍රියාත්මක වෙමින් පවතී",
    "Completed": "සම්පූර්ණයි",
    "Cancelled": "අවලංගුයි",
    
    // Agent Dashboard
    "Quick Actions": "ඉක්මන් පියවර",
    "Gross Green Leaf": "මුළු අමු තේ දළු",
    "Suppliers": "සැපයුම්කරුවන්",
    "Total KG": "මුළු බර (kg)",
    "New Delivery": "නව එකතු කිරීම",
    "View Report": "වාර්තාව බලන්න",
    "Route Map": "මාර්ග සිතියම",
    "System Logs": "පද්ධති ලොග",
    "Active Collection": "ක්‍රියාකාරී එකතු කිරීම්",
    "Direct Requests": "සෘජු ඉල්ලීම්",
    "History": "ඉතිහාසය",
    "Bluetooth Scale": "බ්ලූටූත් තරාදිය",
    "DL-7200 · Connected": "DL-7200 · සම්බන්ධ කර ඇත",
    "GPS Accuracy": "GPS නිරවද්‍යතාවය",
    "High accuracy mode · ON": "ඉහළ නිරවද්‍යතා මාදිලිය · සක්‍රියයි",
    "Sync Settings": "සමමුහුර්ත සැකසුම්",
    "Auto-sync on WiFi · ON": "WiFi මත ස්වයංක්‍රීය සමමුහුර්තකරණය · සක්‍රියයි",
    "My Collections": "මගේ එකතු කිරීම්",
    "View full history": "සම්පූර්ණ ඉතිහාසය බලන්න",
    "Change PIN": "PIN අංකය වෙනස් කරන්න",
    "Last changed 30 days ago": "අවසාන වරට දින 30කට පෙර වෙනස් කරන ලදී",
    "KG TODAY": "අද බර (kg)",
    "SUPPLIERS": "සැපයුම්කරුවන්",
    "KG MONTH": "මාසික බර (kg)",
    "TODAY'S LEAF": "අද දළු ප්‍රමාණය",
    "PENDING SYNC": "සමමුහුර්ත වීමට ඇත",
    "ROUTE PROGRESS": "මාර්ග ප්‍රගතිය",
    "QUICK ACTIONS": "ඉක්මන් පියවර",
    "New Collection": "නව එකතු කිරීම",
    "View History": "ඉතිහාසය බලන්න",
    "Supplier List": "සැපයුම්කරුවන්ගේ ලැයිස්තුව",
    "Today's Collections": "අද එකතු කිරීම්",
    "No collections today": "අද දින එකතු කිරීම් නොමැත",
    "recent collections": "මෑතකදී එකතු කළ දත්ත",
    "Synced": "සින්ක් වී ඇත",
    "Queued": "සින්ක් කර යුතු",
    "GPS": "GPS",
    "No GPS": "GPS නොමැත",
    "Not yet collected": "තවමත් එකතු කර නොමැත",
    "Total": "මුළු",
    "records queued": "වාර්තා පෝලිමේ ඇත",
    "complete": "සම්පූර්ණයි",
    "No data": "දත්ත නොමැත",
    "suppliers": "සැපයුම්කරුවන්",
    "Last sync": "අවසාන සමමුහුර්තකරණය",

    // Supplier Screens
    "Outstanding Debt": "ගෙවිය යුතු මුළු ණය",
    "Last collection recorded": "අවසාන එකතු කිරීම වාර්තා කර ඇත",
    "Available for advances": "අත්තිකාරම් සඳහා ලබා ගත හැකිය",
    "Need clarification?": "පැහැදිලි කිරීමක් අවශ්‍යද?",
    "Speak to your Extension Officer about these charges.": "මෙම ගාස්තු පිළිබඳව ඔබේ ව්‍යාප්ති නිලධාරියා සමඟ කතා කරන්න.",
    "Verified Supplier": "තහවුරු කළ සැපයුම්කරු",
    "Land Name": "ඉඩමේ නම",
    "In-Charge": "භාරකරු",
    "Passbook No.": "පාස්බුක් නම්බර්",
    "Supplier ID": "සැපයුම්කරුගේ හැඳුනුම්පත",
    "Pending Assignment": "පවරන තෙක් රැඳී පවතී",
    "Full Transaction History →": "සම්පූර්ණ ගනුදෙනු ඉතිහාසය →",
    "collected today": "අද එකතු කළ ප්‍රමාණය",
    "Search by name or passbook...": "නම හෝ පාස්බුක් නම්බර් මගින් සොයන්න...",
    "Pending sync": "සමමුහුර්ත වීමට ඇති",
    "Sync Queue": "සින්ක් කරන්න",
    "Failed": "අසාර්ථකයි",
    "Passbook unavailable": "පාස්බුක් නම්බර් නොමැත",
    "No collections found": "එකතු කිරීම් හමු නොවීය",
    "Manual": "අත්පොත",
    "Delivery Details": "බාරදීමේ විස්තර",
    "Collection Receipt": "එකතු කිරීමේ රිසිට්පත",
    "GROSS": "මුළු බර (kg)",
    "NET YIELD": "ශුද්ධ බර (kg)",
    "Date & Time": "දිනය සහ වේලාව",
    "Quality Deduction": "තත්ත්ව අඩු කිරීම්",
    "No deductions": "අඩු කිරීම් නොමැත",
    "Processed By": "සැකසූවේ",
    "Sync Status": "සමමුහුර්ත තත්ත්වය",
    "Fully Synced": "සම්පූර්ණයෙන්ම සමමුහුර්ත කර ඇත",
    "Pending Sync": "සමමුහුර්ත වීමට ඇත",
    "Transport Agent": "ප්‍රවාහන නියෝජිතයා",
    "My Profile": "මගේ ගිණුම",
    "Add new request": "නව ඉල්ලීමක් එක් කරන්න",
    "Create New Request": "නව ඉල්ලීමක් සාදන්න",
    "Only for suppliers under your assignment": "ඔබට පවරා ඇති සැපයුම්කරුවන් සඳහා පමණි",
    "No requests found": "ඉල්ලීම් හමු නොවීය",
    "Purchase": "මිලදී ගැනීම",
    "Rent": "කුලියට ගැනීම",
    "READY TO FULFILL": "සම්පූර්ණ කිරීමට සූදානම්",
    "RECEIVED": "ලැබී ඇත",
    "Tap for more info": "වැඩි විස්තර සඳහා තට්ටු කරන්න",
    "Total Quantity": "මුළු ප්‍රමාණය",
    "Item": "භාණ්ඩය",
    "Rent Days": "කුලියට ගන්නා දින ගණන",
    "Units": "ඒකක",
    "Bag Type": "බෑග් වර්ගය",
    "Topic": "මාතෘකාව",
    "Note": "සටහන",
    "Remove Request": "ඉල්ලීම ඉවත් කරන්න",
    "Request Info": "ඉල්ලීම් තොරතුරු",
    "Supplier Details": "සැපයුම්කරුගේ විස්තර",
    "Request Summary": "ඉල්ලීම් සාරාංශය",
    "Rent Duration": "කුලියට ගන්නා කාලය",
    "Quantity/Units": "ප්‍රමාණය/ඒකක",
    "Requested Amount": "ඉල්ලූ මුදල",
    "Total Deduction": "මුළු අඩු කිරීම",
    "Awaiting Review": "සලකා බලමින් පවතී",
    "Specification": "විස්තරය",
    "Manager Remarks": "කළමනාකරුගේ සටහන්",
    "Close Details": "විස්තර වසා දමන්න",
    "Search Supplier": "සැපයුම්කරු සොයන්න",
    "No suppliers found": "සැපයුම්කරුවන් හමු නොවීය",
    "Standard": "සාමාන්‍ය",
    "General Advisory": "සාමාන්‍ය උපදෙස්",
    "Standard Transport": "සාමාන්‍ය ප්‍රවාහනය",
    "Financial Overview": "මුල්‍ය දළ විශ්ලේෂණය",
    "Services & Support": "සේවාවන් සහ සහාය",
    "Online Status": "සබැඳි තත්ත්වය",
    "Recent History": "මෑත ඉතිහාසය",
    "View All →": "සියල්ල පෙන්වන්න →",
    "Loading history...": "පූරණය වෙමින්...",
    "No delivery history yet": "තවමත් බෙදාහැරීමේ ඉතිහාසයක් නොමැත",
    "Delivered": "ලබාදුන්",
    "Net:": "ශුද්ධ:",
    "Supply History": "සැපයුම් ඉතිහාසය",
    "TOTAL GROSS": "මුළු දළ",
    "TOTAL NET": "මුළු ශුද්ධ",
    "DELIVERIES": "බෙදාහැරීම්",
    "Today": "අද",
    "Week": "සතිය",
    "Month": "මාසය",
    "Balance Payments": "ශේෂ ගෙවීම්",
    "Next Pay:": "මීළඟ ගෙවීම:",
    "Est.": "ඇස්තමේන්තු",
    "available": "ලබා ගත හැකිය",
    "Gross Earnings": "දළ ආදායම",
    "Deductions": "අඩු කිරීම්",
    "Net Amount": "ශුද්ධ මුදල",
    "Upcoming": "ඉදිරි",
    "Paid": "ගෙවන ලදී",
    "Debts & Deductions": "ණය සහ අඩු කිරීම්",
    "Current Outstanding": "දැනට ගෙවිය යුතු",
    "Estimated for next payout": "ඊළඟ ගෙවීම සඳහා ඇස්තමේන්තු කර ඇත",
    "How it works": "එය ක්‍රියා කරන ආකාරය",
    "Debts for services (fertilizer, tools) are deducted automatically.": "සේවාවන් සඳහා වූ ණය (පොහොර, මෙවලම්) නිරායාසයෙන්ම අඩු කරනු ලැබේ.",
    "Detailed Breakdown": "සවිස්තරාත්මක සාරාංශය",
    "Security Center": "ආරක්ෂක මධ්‍යස්ථානය",
    "Update PIN": "PIN අංකය වෙනස් කරන්න",
    "Identity Verification": "හඳුනාගැනීමේ තහවුරු කිරීම",
    "We will send a one-time verification code to your registered mobile number to confirm it's you.": "එය ඔබම බව තහවුරු කිරීමට අපි ඔබේ ලියාපදිංචි ජංගම දුරකථන අංකයට එක් වරක් පමණක් භාවිතා කළ හැකි කේතයක් එවන්නෙමු.",
    "Send Verification Code": "තහවුරු කිරීමේ කේතය එවන්න",
    "Enter the 6-digit code sent to your phone": "ඔබේ දුරකථනයට එවූ ඉලක්කම් 6ක කේතය ඇතුළත් කරන්න",
    "Verify Code": "කේතය තහවුරු කරන්න",
    "Didn't receive code? Resend": "කේතය ලැබුණේ නැද්ද? නැවත එවන්න",
    "Set your new 4-digit security PIN": "ඔබේ නව ඉලක්කම් 4ක ආරක්ෂිත PIN අංකය ඇතුළත් කරන්න",
    "Update Security PIN": "ආරක්ෂිත PIN අංකය යාවත්කාලීන කරන්න",
    "TRI Circulars": "TRI චක්‍රලේඛ",
    "Circulars": "චක්‍රලේඛ",
    "Official Tea Research Institute advisory registry": "නිල තේ පර්යේෂණ ආයතන උපදේශන ලේඛනය",
    "Search circulars...": "චක්‍රලේඛ සොයන්න...",
    "No circulars found": "චක්‍රලේඛ කිසිවක් හමු නොවීය",
    "Read": "කියවා ඇත",
    "Unread": "කියවා නැත",
    "TODAY'S COLLECTIONS": "අද දින එකතු කිරීම්",
    "See All →": "සියල්ල පෙන්වන්න →",
    "Update security access code": "ආරක්ෂක ප්‍රවේශ කේතය යාවත්කාලීන කරන්න",
    "Extension Officer": "කෘෂිකර්ම උපදේශක"
  }
};

export function getTranslation(key: string, lang: string) {
  if (lang === 'si' && dictionary.si[key]) {
    return dictionary.si[key];
  }
  return key;
}

type SupplierHistoryItem = {
  collectionId: string;
  supplierId: string;
  supplierName: string;
  passbookNo: string;
  grossWeight: number;
  netWeight: number | null;
  collectedAt: string;
  syncStatus: string;
  gpsStatus: string;
  manualOverride: boolean;
  transportAgentName?: string;
  processedByName?: string;
};

type SupplierLedger = {
  currentDebt: number;
  estimatedBalance: number;
  advanceTaken: number;
  grossEarnings?: number;
  leafPrice?: number;
  totalGrossEarnings?: number;
  payoutTotal?: number;
  currentMonthGrossEarnings?: number;
  qualityDeduction?: number;
  pendingAdvances?: number;
};

type SupplierIdentity = {
  supplierId: string;
  fullName: string;
  passbookNo: string;
  estateId?: string;
};

// ── Detail Modal Component ───────────────────────────────────────────────────
function CollectionDetailModal({ visible, item, onClose, _ }: any) {
  if (!item) return null;
  const d = new Date(item.collectedAt);
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', day: "2-digit", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isSynced = String(item.syncStatus).toUpperCase() === "SYNCED";

  // A collection is only processed when factory staff sets a real netWeight (> 0)
  // OR processedByName is set. netWeight=0 or null = still pending at the factory.
  const isProcessed = (
    item.processedByName != null ||
    (item.netWeight != null && Number(item.netWeight) > 0)
  );

  const gross = Number(Number(item.grossWeight || 0).toFixed(2));
  const net = isProcessed ? Number(Number(item.netWeight).toFixed(2)) : null;
  const deduction = isProcessed && net !== null ? Number(Math.max(0, gross - net).toFixed(2)) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        
        <View style={{ backgroundColor: '#111f38', borderRadius: 32, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <View>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{_("Collection Receipt")}</Text>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{_("Delivery Details")}</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Processing Status Banner */}
          {!isProcessed && (
            <View style={{ backgroundColor: 'rgba(243,156,18,0.1)', borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(243,156,18,0.3)' }}>
              <Ionicons name="time-outline" size={18} color="#f39c12" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: '#f39c12', fontSize: 12, fontWeight: '700' }}>Awaiting Factory Processing</Text>
                <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Net weight and deductions will appear after quality assessment.</Text>
              </View>
            </View>
          )}

          {/* Main Weight Stats */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>{_("GROSS")}</Text>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '900' }}>{gross.toFixed(2)}<Text style={{ fontSize: 12, fontWeight: '600' }}> kg</Text></Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: isProcessed ? palette.accentGreen : '#f39c12', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>
                {isProcessed ? _("NET YIELD") : "NET YIELD"}
              </Text>
              {isProcessed && net !== null ? (
                <Text style={{ color: palette.accentGreen, fontSize: 22, fontWeight: '900' }}>{net.toFixed(2)}<Text style={{ fontSize: 12, fontWeight: '600' }}> kg</Text></Text>
              ) : (
                <Text style={{ color: '#f39c12', fontSize: 14, fontWeight: '700', marginTop: 4 }}>Pending</Text>
              )}
            </View>
          </View>

          {/* Detail Rows */}
          <View style={{ gap: 18 }}>
            <DetailRow label={_("Date & Time")} value={`${dateStr}\n${timeStr}`} icon="calendar-outline" />
            <DetailRow label={_("Transport Agent")} value={item.transportAgentName || _("Assigned Agent")} icon="bus-outline" />
            <DetailRow 
              label={_("Quality Deduction")} 
              value={
                !isProcessed
                  ? "Awaiting processing"
                  : deduction != null && deduction > 0.001
                    ? `-${deduction.toFixed(2)} kg`
                    : _("No deductions")
              } 
              valueColor={!isProcessed ? '#f39c12' : deduction != null && deduction > 0.001 ? '#ff8a8a' : '#fff'} 
              icon="analytics-outline" 
            />
            {item.processedByName && (
              <DetailRow label={_("Processed By")} value={item.processedByName} icon="shield-checkmark-outline" />
            )}
            <DetailRow label={_("Sync Status")} value={isSynced ? _("Fully Synced") : _("Pending Sync")} valueColor={isSynced ? palette.accentGreen : '#f39c12'} icon="cloud-done-outline" />
          </View>

          {/* Footer Info */}
          <View style={{ marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}>ID: {item.collectionId || "REC-000000"}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, icon, valueColor = 'white' }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
        <Ionicons name={icon} size={18} color={palette.accentBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.muted, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: valueColor, fontSize: 14, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatKg = (value: number) => `${value} kg`;
const formatLKR = (value: number) => `Rs. ${Math.round(value).toLocaleString()}`;

const getSupplierId = (user: any) => user?.supplierId || user?.userId;
const getPassbookNo = (user: any) => user?.passbookNo || user?.passbook_no || null;

const normalizeLedger = (raw: any): SupplierLedger => {
  if (!raw || typeof raw !== "object") {
    return { currentDebt: 0, estimatedBalance: 0, advanceTaken: 0 };
  }

  return {
    currentDebt: toNumber(raw.currentDebt ?? raw.totalDebt ?? raw.outstanding ?? raw.deductions),
    estimatedBalance: toNumber(raw.estimatedBalance ?? raw.netBalance ?? raw.availableBalance ?? raw.netAmount),
    advanceTaken: toNumber(raw.advanceTaken ?? raw.totalAdvance ?? raw.advances),
    grossEarnings: toNumber(raw.grossEarnings),
    leafPrice: toNumber(raw.leafPrice)
  };
};

const fetchSupplierHistory = async (token: string, supplierId: string): Promise<SupplierHistoryItem[]> => {
  const data = await apiGet<SupplierHistoryItem[]>(`${CollectionAPI.history(supplierId)}?limit=250`, token);
  return Array.isArray(data) ? data : [];
};

const resolveSupplierIdentity = async (token: string, user: any): Promise<SupplierIdentity | null> => {
  const passbookNo = getPassbookNo(user);
  if (!token || !passbookNo) return null;

  const estateId = user?.estateId ? String(user.estateId) : undefined;
  const params = new URLSearchParams();
  params.set("search", passbookNo);
  params.set("limit", "20");
  if (estateId) params.set("estateId", estateId);

  const suppliers = await apiGet<any[]>(`${CollectionAPI.suppliers}?${params.toString()}`, token);
  const exactMatch = Array.isArray(suppliers)
    ? suppliers.find((item) => String(item?.passbookNo || "").trim().toLowerCase() === passbookNo.trim().toLowerCase())
    : null;

  if (!exactMatch?.supplierId) return null;

  return {
    supplierId: String(exactMatch.supplierId),
    fullName: String(exactMatch.fullName || user?.fullName || "Supplier"),
    passbookNo: String(exactMatch.passbookNo || passbookNo),
    estateId: exactMatch.estateId ? String(exactMatch.estateId) : undefined,
  };
};

export function SupplierHomeScreen({ user, token, navigation, lang }: any) {
  const getPassbook = (u: any) => u?.passbookNo || u?.passbook_no || "N/A";
  const initials = user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SH";
  const fallbackSupplierId = getSupplierId(user);
  const passbookNo = getPassbookNo(user);

  const [history, setHistory] = useState<SupplierHistoryItem[]>([]);
  const [ledger, setLedger] = useState<SupplierLedger>({ currentDebt: 0, estimatedBalance: 0, advanceTaken: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(fallbackSupplierId || null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SupplierHistoryItem | null>(null);

  const _ = (key: string) => getTranslation(key, lang);

  // Use stable primitives in deps to prevent infinite loops
  const userFullName = user?.fullName as string | undefined;

  const load = useCallback(async (isSilent = false) => {
    if (!token || !passbookNo) {
      setError("Missing supplier session data.");
      if (!isSilent) setLoading(false);
      return;
    }

    if (!isSilent) {
      setLoading(true);
      setError(null);
    }

    try {
      const identity = await resolveSupplierIdentity(token, { passbookNo, fullName: userFullName, supplierId: fallbackSupplierId }).catch(() => null);
      const supplierId = identity?.supplierId || fallbackSupplierId;

      if (!supplierId) {
        setError("Unable to resolve supplier record. Please re-login.");
        setLoading(false);
        return;
      }

      setResolvedSupplierId(supplierId);
      setResolvedLabel(identity?.fullName || userFullName || null);

      const qp = new URLSearchParams();
      qp.set("supplierId", String(supplierId));
      if (passbookNo) qp.set("passbookNo", String(passbookNo));

      const [historyData, ledgerData, txData, reqRes] = await Promise.all([
        fetchSupplierHistory(token, supplierId).catch(() => []),
        apiGet<any>(FinanceAPI.ledger(supplierId), token).catch(() => null),
        apiGet<any[]>(FinanceAPI.ledgerTransactions(supplierId), token).catch(() => []),
        apiGet<any[]>(`${ServicesAPI.history}?${qp.toString()}`, token).catch(() => [])
      ]);

      if (!ledgerData) {
        setError(`No finance ledger found for supplier ${supplierId || passbookNo}`);
      }

      setHistory(historyData);

      const pendingAdvances = (reqRes || [])
          .filter((r: any) => r.requestType === 'ADVANCE' && r.status === 'PENDING')
          .reduce((sum: number, r: any) => sum + Number(r.requestedAmount || r.amount || 0), 0);

      const pendingDebts = (reqRes || [])
          .filter((r: any) => r.requestType !== 'ADVANCE' && r.requestType !== 'ADVISORY' && r.status === 'PENDING')
          .reduce((sum: number, r: any) => sum + Number(r.requestedAmount || r.amount || r.estimatedCost || r.totalDeduction || 0), 0);

      const normLedger = normalizeLedger(ledgerData);
      // If ledger summary is zero but transactions show debts, derive a fallback sum
      try {
        const txSum = (txData || [])
          .filter((t:any) => (t.transactionType === 'DEBT' || t.transactionType === 'DEDUCTION' || String(t.type).toUpperCase().includes('DEBT')) && Number(t.amount || t.remaining || 0) > 0)
          .reduce((s:any,t:any) => s + Number(t.amount ?? t.remaining ?? 0), 0);
        if ((normLedger.currentDebt || 0) === 0 && txSum > 0) {
          console.debug('[SupplierHome] applying tx fallback currentDebt=', txSum);
          normLedger.currentDebt = txSum;
        }
      } catch (e) {
        console.debug('[SupplierHome] tx fallback error', e);
      }
      normLedger.advanceTaken = Math.max(0, normLedger.advanceTaken - pendingAdvances);
      normLedger.estimatedBalance = normLedger.estimatedBalance + pendingAdvances + pendingDebts;

      setLedger(normLedger);
    } catch (err: any) {
      if (!isSilent) setError(err?.message || "Failed to load supplier dashboard data.");
      if (!isSilent) setHistory([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [fallbackSupplierId, passbookNo, token, userFullName]);

  useFocusEffect(
    useCallback(() => {
      load(false); // Initial load with spinner

      const intervalId = setInterval(() => {
        load(true); // Silent real-time poll
      }, 5000);

      return () => clearInterval(intervalId);
    }, [load])
  );

  const weekStats = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekItems = history.filter((item) => new Date(item.collectedAt).getTime() >= cutoff);
    const grossRaw = weekItems.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
    const gross = Math.round(grossRaw * 1000) / 1000;
    const syncedCount = weekItems.filter((item) => String(item.syncStatus).toUpperCase() === "SYNCED").length;

    return { gross, syncedCount };
  }, [history]);

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: "#5b61f2" }]}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{initials}</Text>
          </View>
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>{lang === 'si' ? 'ආයුබෝවන්' : 'Hello'}, {user?.fullName || "Supplier"} 👋</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: palette.muted, fontSize: 13 }}>{getPassbook(user)}</Text>
              <Text style={{ color: palette.accentGreen, fontSize: 13, fontWeight: "600", marginLeft: 8 }}>✓ Verified</Text>
            </View>
          </View>
          <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 15 }}>
            <Ionicons name="notifications-outline" size={24} color={palette.muted} />
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Ionicons name="log-out-outline" size={24} color={palette.muted} />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={styles.onlineBadge}><Ionicons name="globe-outline" size={14} color={palette.accentGreen} /><Text style={styles.onlineBadgeText}> {_("Online Status")}</Text></View>
          <Text style={{ color: palette.muted, fontSize: 12 }}>
            Last update: {loading ? "Syncing..." : error ? "Offline" : "Live"}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!!error && (
          <View style={[styles.infoBox, { marginBottom: 14, borderColor: "rgba(231,76,60,0.35)", borderWidth: 1 }]}> 
            <Ionicons name="warning-outline" size={18} color="#e74c3c" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#ff8b8b", fontSize: 12 }}>Could not refresh all backend data: {error}</Text>
              {!!resolvedSupplierId && <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Supplier record: {resolvedSupplierId}</Text>}
            </View>
          </View>
        )}

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Financial Overview").toUpperCase()}</Text>
        
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <View style={[styles.supCard, { borderTopColor: palette.accentGreen }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(31,190,87,0.1)" }]}><MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} /></View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Weekly Supply")}</Text>
            <Text style={styles.supCardValue}>{formatKg(weekStats.gross)}</Text>
            <Text style={styles.supCardSub}>{weekStats.syncedCount} deliveries synced</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: "#e74c3c" }]}>
            <View style={[styles.supCardIcon, { backgroundColor: "rgba(231,76,60,0.1)" }]}><Ionicons name="clipboard-outline" size={20} color="#e74c3c" /></View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Service Debts")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.currentDebt)}</Text>
            <Text style={styles.supCardSub}>From finance ledger</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 25 }}>
          <View style={[styles.supCard, { borderTopColor: "#f39c12" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(243,156,18,0.1)" }]}><Ionicons name="wallet-outline" size={20} color="#f39c12" /></View>
              <View style={{ backgroundColor: palette.accentGreen, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>+ REQ</Text></View>
            </View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Advance")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.advanceTaken)}</Text>
            <Text style={styles.supCardSub}>From finance ledger</Text>
          </View>
          <View style={[styles.supCard, { borderTopColor: palette.accentBlue }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={[styles.supCardIcon, { backgroundColor: "rgba(46,168,255,0.1)" }]}><Ionicons name="cash-outline" size={20} color={palette.accentBlue} /></View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center" }}><Ionicons name="time-outline" size={10} color={palette.muted} /><Text style={{ color: palette.muted, fontSize: 10 }}> Pending</Text></View>
            </View>
            <Text style={[styles.supCardLabel, { letterSpacing: 0, fontSize: 12 }]}>{_("Estimated Balance")}</Text>
            <Text style={styles.supCardValue}>{formatLKR(ledger.estimatedBalance)}</Text>
            <Text style={styles.supCardSub}>Live estimate</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Services & Support").toUpperCase()}</Text>
        
        {(() => {
          const services = [
            { title: _("Fertilizer"),  icon: { lib: "mc",  name: "sprout" },                      color: "#1fbe57", status: "Approved", statusIcon: "checkmark-circle-outline", hideStatus: false, tab: "Requests", initialTab: "Fertilizer" },
            { title: _("Leaf Bags"),   icon: { lib: "ion", name: "bag-handle-outline" },           color: "#00d2d3", status: "Pending",  statusIcon: "time-outline",             hideStatus: false, tab: "Requests", initialTab: "Leaf Bags" },
            { title: "Circulars",     icon: { lib: "ion", name: "document-text-outline" },        color: "#9b59b6", status: "New",      statusIcon: "notifications-outline",    hideStatus: false, tab: "Circulars", initialTab: null, params: { lang } },
            { title: _("Transport"),  icon: { lib: "mc",  name: "truck-delivery-outline" },       color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true,  tab: "Requests", initialTab: "Transport" },
            { title: _("Advisory"),   icon: { lib: "ion", name: "chatbox-outline" },              color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true,  tab: "Requests", initialTab: "Advisory" },
            { title: "Settings",     icon: { lib: "ion", name: "settings-outline" },             color: "#607b96", status: "",         statusIcon: "",                         hideStatus: true,  tab: "Profile",  initialTab: null },
          ];
          const renderCard = (item: typeof services[0], idx: number) => {
            const isColored = !item.hideStatus;
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  const navParams = { 
                    ...(item.initialTab ? { initialTab: item.initialTab } : {}),
                    ...(item.params || {})
                  };
                  requestAnimationFrame(() => navigation.navigate(item.tab, Object.keys(navParams).length > 0 ? navParams : undefined));
                }}
                style={({ pressed }) => [{
                  flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 12, alignItems: "center",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
                  opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }]
                }]}
              >
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: isColored ? `${item.color}20` : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: isColored ? `${item.color}35` : "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  {item.icon.lib === "mc"
                    ? <MaterialCommunityIcons name={item.icon.name as any} size={26} color={item.color} />
                    : <Ionicons name={item.icon.name as any} size={26} color={item.color} />}
                </View>
                <Text style={{ color: isColored ? item.color : "#c0cfe0", fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>{item.title}</Text>
                {!item.hideStatus && (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: `${item.color}15`, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 }}>
                    <Ionicons name={item.statusIcon as any} size={10} color={item.color} />
                    <Text style={{ color: item.color, fontSize: 9, marginLeft: 2 }}>{item.status}</Text>
                  </View>
                )}
              </Pressable>
            );
          };
          return (
            <>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                {services.slice(0, 3).map(renderCard)}
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {services.slice(3, 6).map((item, idx) => renderCard(item, idx + 3))}
              </View>
            </>
          );
        })()}
        {/* RECENT HISTORY */}
        <View style={{ marginTop: 22, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1 }]}>{_("Recent History").toUpperCase()}</Text>
            {history.length > 5 && (
              <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{_("View All →")}</Text>
            )}
          </View>

          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: palette.muted, fontSize: 13 }}>{_("Loading history...")}</Text>
            </View>
          )}

          {!loading && history.length === 0 && (
            <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
              <MaterialCommunityIcons name="leaf-off" size={28} color={palette.muted} />
              <Text style={{ color: palette.muted, fontSize: 13, marginTop: 8 }}>{_("No delivery history yet")}</Text>
            </View>
          )}

          {!loading && history.slice(0, 5).map((item, idx) => {
            const d = new Date(item.collectedAt);
            const dateStr = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
            const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
            const isSynced = String(item.syncStatus).toUpperCase() === "SYNCED";
            const isGPS = String(item.gpsStatus).toUpperCase() === "GPS";
            const netWt = item.netWeight != null ? item.netWeight : null;
            return (
              <Pressable 
                key={item.collectionId || idx} 
                onPress={() => setSelectedItem(item)}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderLeftWidth: 3, borderLeftColor: isSynced ? palette.accentGreen : "#f39c12" },
                  pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.08)" }
                ]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(31,190,87,0.12)", borderWidth: 1, borderColor: "rgba(31,190,87,0.25)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <MaterialCommunityIcons name="leaf" size={20} color={palette.accentGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                    {_("Delivered")} {Number(item.grossWeight || 0).toFixed(2)} kg
                    {netWt != null && Math.abs(netWt - item.grossWeight) > 0.001 ? <Text style={{ color: palette.muted, fontWeight: "400", fontSize: 12 }}> ({_("Net:")} {Number(netWt).toFixed(2)} kg)</Text> : null}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 }}>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>{dateStr}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>·</Text>
                    <Text style={{ color: palette.accentBlue, fontSize: 12, fontWeight: "600" }}>{timeStr}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>·</Text>
                    <Ionicons name={isGPS ? "location" : "location-outline"} size={12} color={isGPS ? palette.accentGreen : palette.muted} />
                    <Text style={{ color: isSynced ? palette.accentGreen : "#f39c12", fontSize: 11, fontWeight: "600" }}>{isSynced ? _("Synced") : _("Pending")}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Pressable>
            );
          })}
        </View>

        <CollectionDetailModal 
          visible={!!selectedItem} 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          _={_} 
        />

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function SupplierSupplyScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Week");
  const [history, setHistory] = useState<SupplierHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fallbackSupplierId = getSupplierId(user);
  const passbookNo = getPassbookNo(user);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(fallbackSupplierId || null);
  const [selectedItem, setSelectedItem] = useState<SupplierHistoryItem | null>(null);

  // Stable primitive derived from user to prevent infinite loops
  const userFullNameSupply = user?.fullName as string | undefined;

  useEffect(() => {
    const load = async () => {
      if (!token || !passbookNo) {
        setError("Missing supplier session data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const identity = await resolveSupplierIdentity(token, { passbookNo, fullName: userFullNameSupply, supplierId: fallbackSupplierId }).catch(() => null);
        const supplierId = identity?.supplierId || fallbackSupplierId;

        if (!supplierId) {
          setError("Unable to resolve supplier record. Please re-login.");
          setLoading(false);
          return;
        }

        setResolvedSupplierId(supplierId);

        const historyData = await fetchSupplierHistory(token, supplierId);
        setHistory(historyData);
      } catch (err: any) {
        setError(err?.message || "Failed to load supply history.");
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fallbackSupplierId, passbookNo, token, userFullNameSupply]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return history.filter((item) => {
      const ts = new Date(item.collectedAt).getTime();
      if (activeTab === "Today") return ts >= startOfToday;
      if (activeTab === "Week") return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (activeTab === "Month") {
        const d = new Date(item.collectedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [activeTab, history]);

  const totals = useMemo(() => {
    const totalGross = filteredHistory.reduce((sum, item) => sum + toNumber(item.grossWeight), 0).toFixed(2);
    // Only count truly processed (netWeight != null) collections for TOTAL NET
    const totalNet = filteredHistory
      .filter(item => item.netWeight != null)
      .reduce((sum, item) => sum + toNumber(item.netWeight), 0)
      .toFixed(2);
    return {
      totalGross,
      totalNet,
      deliveries: filteredHistory.length,
    };
  }, [filteredHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Supply History")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        {!!error && (
          <View style={[styles.infoBox, { marginBottom: 12, borderColor: "rgba(231,76,60,0.35)", borderWidth: 1 }]}> 
            <Ionicons name="warning-outline" size={18} color="#e74c3c" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#ff8b8b", fontSize: 12 }}>Could not load supply history: {error}</Text>
              {!!resolvedSupplierId && <Text style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>Supplier record: {resolvedSupplierId}</Text>}
            </View>
          </View>
        )}

        <View style={styles.supplySummaryBox}>
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>{totals.totalGross}<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>{_("TOTAL GROSS")}</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center" }}>
             <Text style={styles.supplySummValue}>{totals.totalNet}<Text style={styles.supplySummUnit}> kg</Text></Text>
             <Text style={styles.supplySummLabel}>{_("TOTAL NET")}</Text>
          </View>
          <View style={styles.supSummDivider} />
          <View style={{ alignItems: "center", justifyContent: "center" }}>
             <Text style={styles.supplySummValue}>{totals.deliveries}</Text>
             <Text style={styles.supplySummLabel}>{_("DELIVERIES")}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {["Today", "Week", "Month", "All"].map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.filterChip, activeTab === tab && styles.filterChipActiveSup]}>
              <Text style={[styles.filterChipText, activeTab === tab && styles.filterChipTextActiveSup]}>{_(tab)}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.supplyHistItem}>
              <Text style={styles.supHistSub}>{_("Loading history...")}</Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={styles.supplyHistItem}>
              <Text style={styles.supHistSub}>{_("No delivery history yet")}</Text>
            </View>
          ) : filteredHistory.map((item) => (
            <Pressable 
              key={item.collectionId} 
              onPress={() => setSelectedItem(item)}
              style={({ pressed }) => [
                styles.supplyHistItem,
                pressed && { opacity: 0.7, backgroundColor: "rgba(255,255,255,0.08)" }
              ]}
            >
              <View>
                <Text style={styles.supHistDate}>{formatDate(item.collectedAt)}</Text>
                <Text style={styles.supHistSub}>{formatTime(item.collectedAt)} · {String(item.gpsStatus || "NO_GPS") === "GPS" ? "GPS" : "No GPS"}</Text>
              </View>
              <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 10 }}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.supHistGross}>{Number(toNumber(item.grossWeight)).toFixed(2)} kg</Text>
                  {item.netWeight != null
                    ? <Text style={styles.supHistSub}>{_("Net:")} {Number(toNumber(item.netWeight)).toFixed(2)} kg</Text>
                    : <Text style={[styles.supHistSub, { color: "#f39c12", fontSize: 10 }]}>⏳ {_("Awaiting Processing")}</Text>
                  }
                </View>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} style={{ alignSelf: 'center' }} />
              </View>
            </Pressable>
          ))}
          <View style={{height: 100}} />
        </ScrollView>
      </View>

      <CollectionDetailModal 
        visible={!!selectedItem} 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        _={_} 
      />
    </View>
  );
}

export function SupplierPaymentsScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const [activeTab, setActiveTab] = useState("Balance Payments");
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supplierId = getSupplierId(user);

  useEffect(() => {
    const fetchFinances = async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        if (!token) return;

        // Ensure we have the correct supplier UUID (matches Home screen logic)
        const identity = await resolveSupplierIdentity(token, {
          passbookNo: user?.passbookNo || user?.passbook_no,
          fullName: user?.fullName,
          supplierId: supplierId
        }).catch(() => null);
        const resolvedId = identity?.supplierId || supplierId;
        if (!resolvedId) return;

        const qp = new URLSearchParams();
        qp.set("supplierId", String(resolvedId));
        const passbookNo = identity?.passbookNo || user?.passbookNo || user?.passbook_no;
        if (passbookNo) qp.set("passbookNo", String(passbookNo));

        const [txRes, ledgerRes, historyRes, reqRes] = await Promise.all([
          apiGet<any[]>(FinanceAPI.ledgerTransactions(resolvedId), token).catch(() => []),
          apiGet<any>(FinanceAPI.ledger(resolvedId), token).catch(() => null),
          fetchSupplierHistory(token, resolvedId).catch(() => []),
          apiGet<any[]>(`${ServicesAPI.history}?${qp.toString()}`, token).catch(() => [])
        ]);

        const normalizedLedger = normalizeLedger(ledgerRes);

        const pendingAdvances = (reqRes || [])
            .filter((r: any) => r.requestType === 'ADVANCE' && r.status === 'PENDING')
            .reduce((sum: number, r: any) => sum + Number(r.requestedAmount || r.amount || 0), 0);

        // Calculate current month's Gross Earnings
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const currentMonthKg = historyRes
            .filter((item: any) => new Date(item.collectedAt).getTime() >= startOfMonth && item.netWeight != null)
            .reduce((sum: number, item: any) => sum + Number(item.netWeight), 0);

        const price = normalizedLedger.leafPrice || ledgerRes?.leafPrice || 240.0;
        let currentMonthGross = currentMonthKg * price;

        // Fallback: If current month weight is zero but the ledger has unpayout earnings, use those
        if (currentMonthGross === 0 && (normalizedLedger.totalGrossEarnings || 0) > 0) {
          currentMonthGross = Number(normalizedLedger.totalGrossEarnings) - Number(normalizedLedger.payoutTotal || 0);
        }

        normalizedLedger.currentMonthGrossEarnings = Math.max(0, currentMonthGross);
        
        // Final Net Balance = Gross - (Past Payouts) - Total Debt
        // But for the "Monthly View", we show Gross - This Month's Deductions
        const totalDeductions = (normalizedLedger.currentDebt || 0) + (normalizedLedger.advanceTaken || 0);
        normalizedLedger.estimatedBalance = Math.max(0, currentMonthGross - totalDeductions);
        normalizedLedger.qualityDeduction = 0;
        normalizedLedger.pendingAdvances = pendingAdvances;

        setTransactions(txRes || []);
        setLedger(normalizedLedger);
        setHistory(historyRes || []);
      } catch (err) {
        console.error("Failed to fetch payments:", err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };
    
    fetchFinances(false);
    
    const intervalId = setInterval(() => {
      fetchFinances(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [supplierId, token]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getMonthName = (dateStr: string) => {
    if (!dateStr) return "Unknown Payout";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Payout`;
  };

  const advances = transactions.filter((t) => t.transactionType === "ADVANCE");

  const payouts = useMemo(() => {
    const rawPayouts = transactions.filter((t) => t.transactionType === "PAYOUT");
    
    // Filter out duplicate payouts for the same month
    const uniqueRawPayouts = rawPayouts.reduce((acc: any[], current) => {
      const monthName = getMonthName(current.transactionDate);
      const existing = acc.find(item => getMonthName(item.transactionDate) === monthName);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueRawPayouts.map(payout => {
      const payoutDate = new Date(payout.transactionDate);
      const month = payoutDate.getMonth();
      const year = payoutDate.getFullYear();
      
      // Calculate Gross
      const monthHistory = history.filter((item: any) => {
        const d = new Date(item.collectedAt);
        return d.getMonth() === month && d.getFullYear() === year && item.netWeight != null;
      });
      const grossKg = monthHistory.reduce((sum: number, item: any) => sum + Number(item.netWeight), 0);
      const leafPrice = ledger?.leafPrice || 0;
      const grossAmount = grossKg * leafPrice;
      
      // Calculate Deductions
      const monthAdvances = transactions.filter((t: any) => {
        const d = new Date(t.transactionDate);
        return t.transactionType === 'ADVANCE' && d.getMonth() === month && d.getFullYear() === year;
      });
      const advAmount = monthAdvances.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const monthDebts = transactions.filter((t: any) => {
        const d = new Date(t.transactionDate);
        return t.transactionType === 'DEBT' && d.getMonth() === month && d.getFullYear() === year;
      });
      const debtAmount = monthDebts.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const deductions = advAmount + debtAmount;
      
      // Check if structured description exists (for future payouts or fallbacks)
      let parsedGross = grossAmount;
      let parsedDeductions = deductions;
      
      if (payout.description && payout.description.startsWith('STATEMENT_SUMMARY|')) {
        const parts = payout.description.split('|');
        parts.forEach((part: string) => {
          const [key, value] = part.split(':');
          if (key === 'Gross') parsedGross = Number(value);
          if (key === 'Adv') parsedDeductions = (parsedDeductions || 0) + Number(value);
          if (key === 'Debt') parsedDeductions = (parsedDeductions || 0) + Number(value);
        });
      }
      
      return {
        ...payout,
        grossAmount: parsedGross || payout.amount, // Fallback to amount if gross is 0
        deductions: parsedDeductions
      };
    });
  }, [transactions, history, ledger]);

  return (
    <View style={styles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={styles.headerTitle}>{_("Payments")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <View style={{ padding: 20, flex: 1 }}>
        <View style={styles.requestTabs}>
          <Pressable onPress={() => setActiveTab("Balance Payments")} style={[styles.reqTab, activeTab === "Balance Payments" && styles.reqTabActive]}>
            <Ionicons name="cash-outline" size={18} color={activeTab === "Balance Payments" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Balance Payments" && styles.reqTabTextActive]}>{_("Balance Payments")}</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab("Advances")} style={[styles.reqTab, activeTab === "Advances" && styles.reqTabActive]}>
            <Ionicons name="wallet-outline" size={18} color={activeTab === "Advances" ? palette.accentBlue : palette.muted} />
            <Text style={[styles.reqTabText, activeTab === "Advances" && styles.reqTabTextActive]}>{_("Advances")}</Text>
          </Pressable>
        </View>

        {activeTab === "Balance Payments" ? (
          <>


            <View style={styles.nextPayBox}>
              <Ionicons name="calendar-outline" size={24} color={palette.accentBlue} />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.nextPayTitle}>{_("Next Pay:")} 28 {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</Text>
                <Text style={styles.nextPaySub}>
                   {loading ? 'Calculating...' : `Est. Rs. ${(ledger?.estimatedBalance || 0).toLocaleString()} available`}
                </Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!loading && payouts.length === 0 && ledger && (
                <View style={styles.paymentCard}>
                  <View style={styles.payCardHeader}>
                    <View>
                      <Text style={styles.payCardTitle}>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Payout</Text>
                      <Text style={styles.payCardId}>ID: PENDING</Text>
                    </View>
                    <View style={styles.statusBadgeGrey}>
                      <Ionicons name="time-outline" size={10} color="#f39c12" />
                      <Text style={[styles.statusBadgeTextGrey, { color: '#f39c12' }]}> {_("Pending")}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.payRow, { marginTop: 15 }]}>
                    <Text style={styles.payLabel}>{_("Gross Earnings")}</Text>
                    <Text style={styles.payVal}>Rs. {(ledger?.currentMonthGrossEarnings || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>{_("Deductions")}</Text>
                    <Text style={styles.payValRed}>-Rs. {((ledger?.currentDebt || 0) + (ledger?.advanceTaken || 0) - (ledger?.pendingAdvances || 0)).toLocaleString()}</Text>
                  </View>
                  
                  <View style={[styles.payDivider, { marginVertical: 15 }]} />
                  
                  <View style={styles.payRow}>
                    <Text style={[styles.payTotalLabel, { fontSize: 18 }]}>{_("Net Amount")}</Text>
                    <Text style={[styles.payTotalVal, { fontSize: 20, color: palette.accentGreen }]}>Rs. {((ledger?.currentMonthGrossEarnings || 0) - ((ledger?.currentDebt || 0) + (ledger?.advanceTaken || 0) - (ledger?.pendingAdvances || 0))).toLocaleString()}</Text>
                  </View>
                  
                  <Text style={[styles.payFooterTextYellow, { marginTop: 15, fontWeight: 'bold' }]}>
                    Upcoming: 28 {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </Text>
                </View>
              )}

              {payouts.map((t, idx) => {
                let gross = t.grossAmount || (t.amount + (t.deductions || 0));
                let deductions = t.deductions || 0;
                let net = t.amount;
                
                if (t.description && t.description.startsWith('STATEMENT_SUMMARY|')) {
                  const parts = t.description.split('|');
                  parts.forEach((part: string) => {
                    const [key, value] = part.split(':');
                    if (key === 'Gross') gross = Number(value);
                    if (key === 'Adv') deductions += Number(value);
                    if (key === 'Debt') deductions += Number(value);
                    if (key === 'Net') net = Number(value);
                  });
                }
                
                return (
                  <View key={idx} style={styles.paymentCard}>
                    <View style={styles.payCardHeader}>
                      <View>
                        <Text style={styles.payCardTitle}>{getMonthName(t.transactionDate)}</Text>
                        <Text style={styles.payCardId}>ID: {t.transactionId?.slice(0, 8).toUpperCase()}</Text>
                      </View>
                      <View style={[styles.statusBadgeGrey, ['CLEARED', 'APPROVED', 'PAID'].includes(t.status) && { backgroundColor: 'rgba(46, 204, 113, 0.15)', borderColor: 'rgba(46, 204, 113, 0.3)' }]}><Ionicons name={['CLEARED', 'APPROVED', 'PAID'].includes(t.status) ? "layers-outline" : "time-outline"} size={10} color={['CLEARED', 'APPROVED', 'PAID'].includes(t.status) ? palette.success : t.status === 'AWAITING_APPROVAL' ? "#f39c12" : palette.muted} /><Text style={[styles.statusBadgeTextGrey, t.status === 'AWAITING_APPROVAL' && { color: '#f39c12' }, ['CLEARED', 'APPROVED', 'PAID'].includes(t.status) && { color: palette.success }]}> {['CLEARED', 'APPROVED', 'PAID'].includes(t.status) ? _("Paid") : t.status === 'AWAITING_APPROVAL' ? _("Pending Approval") : _(t.status.charAt(0) + t.status.slice(1).toLowerCase())}</Text></View>
                    </View>
                    <View style={styles.payRow}><Text style={styles.payLabel}>{_("Gross Earnings")}</Text><Text style={styles.payVal}>Rs. {gross.toLocaleString()}</Text></View>
                    <View style={styles.payRow}><Text style={styles.payLabel}>{_("Deductions")}</Text><Text style={styles.payValRed}>-Rs. {deductions.toLocaleString()}</Text></View>
                    <View style={styles.payDivider} />
                    <View style={styles.payRow}><Text style={styles.payTotalLabel}>{_("Net Amount")}</Text><Text style={styles.payTotalVal}>Rs. {net.toLocaleString()}</Text></View>
                    <Text style={['CLEARED', 'APPROVED', 'PAID'].includes(t.status) ? styles.payFooterTextDim : styles.payFooterTextYellow}>
                      {['CLEARED', 'APPROVED', 'PAID'].includes(t.status) ? `Finalized on ${formatDate(t.transactionDate)}` : `Upcoming: 28 ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                    </Text>
                  </View>
                );
              })}
              
              {payouts.length === 0 && !loading && !ledger && (
                <Text style={{color: palette.muted, textAlign: 'center', marginTop: 40}}>No payouts history available.</Text>
              )}
              <View style={{height: 100}} />
            </ScrollView>
          </>
        ) : (
          <>
            <Pressable style={[styles.mainBtn, {backgroundColor: palette.success}]} onPress={() => requestAnimationFrame(() => navigation.navigate('Requests', { initialTab: 'Advance' }))}>
              <Text style={styles.mainBtnText}>+ {_("New Advance Request")}</Text>
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} style={{marginTop: 20}}>
              {advances.map((t, idx) => (
                <View key={idx} style={styles.paymentCard}>
                  <View style={styles.payCardHeader}>
                    <View>
                      <Text style={styles.payCardTitle}>Rs. {t.amount}</Text>
                      <Text style={styles.payCardId}>ADV-{t.transactionId?.slice(0, 4).toUpperCase()} · {formatDate(t.transactionDate)}</Text>
                    </View>
                    <View style={styles.statusBadgeGrey}><Ionicons name="checkmark-circle-outline" size={12} color={palette.muted} /><Text style={styles.statusBadgeTextGrey}> {t.status === 'CLEARED' ? _("Cleared") : _(t.status.charAt(0) + t.status.slice(1).toLowerCase())}</Text></View>
                  </View>
                  <View style={styles.payRow}><Text style={styles.payLabel}>{_("Approved by")}</Text><Text style={styles.payVal}>{t.approverName || "—"}</Text></View>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>{_("Remaining")}</Text>
                    {t.status === 'CLEARED' ? (
                      <Text style={{color: palette.success, fontWeight: "600"}}>✓ Cleared</Text>
                    ) : (
                      <Text style={styles.payValRed}>Rs. {t.remaining || t.amount}</Text>
                    )}
                  </View>
                </View>
              ))}
              {advances.length === 0 && !loading && (
                <Text style={{color: palette.muted, textAlign: 'center', marginTop: 40}}>No advance history available.</Text>
              )}
              <View style={{height: 100}} />
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}


export function SupplierDebtsScreen({ user, token, navigation, lang }: any) {
  const _ = (key: string) => getTranslation(key, lang);
  const supplierId = getSupplierId(user);
  const [ledger, setLedger] = useState<any>(null);
  const [debtItems, setDebtItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getCategoryInfo = (desc: string) => {
    const d = desc?.toUpperCase() || '';
    if (d.includes('FERTILIZER')) return { label: _("Fertilizer"), rawKey: 'Fertilizer', icon: 'leaf', color: '#2ecc71', sub: desc };
    if (d.includes('BAG')) return { label: _("Leaf Bags"), rawKey: 'Leaf Bags', icon: 'bag-handle-outline', color: '#3498db', sub: desc };
    if (d.includes('ADVANCE')) return { label: _("Advance"), rawKey: 'Advance', icon: 'wallet-outline', color: '#f39c12', sub: desc };
    if (d.includes('TOOL') || d.includes('MACHINE')) return { label: _("Tools"), rawKey: 'Tools', icon: 'construct-outline', color: '#9b59b6', sub: desc };
    if (d.includes('TRANSPORT')) return { label: _("Transport"), rawKey: 'Transport', icon: 'car-outline', color: '#e67e22', sub: desc };
    return { label: desc || _("Other"), rawKey: 'Advisory', icon: 'receipt-outline', color: '#95a5a6', sub: desc };
  };

  const debtPassbookNo = user?.passbookNo || user?.passbook_no as string | undefined;

  const loadDebts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Resolve correct supplierId (UUID) from auth service
      const identity = await resolveSupplierIdentity(token, {
        passbookNo: user?.passbookNo || user?.passbook_no,
        fullName: user?.fullName,
        supplierId: supplierId
      }).catch(() => null);
      const resolvedId = identity?.supplierId || supplierId;
      if (!resolvedId) { setLoading(false); return; }

      const qp = new URLSearchParams();
      qp.set("supplierId", String(resolvedId));
      const passbookNo = identity?.passbookNo || user?.passbookNo || user?.passbook_no;
      if (passbookNo) qp.set("passbookNo", passbookNo);
      qp.set("size", "120");

      const [ledgerData, txData, reqData] = await Promise.all([
        apiGet<any>(FinanceAPI.ledger(resolvedId), token).catch(() => null),
        apiGet<any[]>(FinanceAPI.ledgerTransactions(resolvedId), token).catch(() => []),
        apiGet<any[]>(`${ServicesAPI.history}?${qp.toString()}`, token).catch(() => []),
      ]);
      const normLedger = normalizeLedger(ledgerData);
      
      // Derive currentDebt from transactions if ledger summary is zero (matches Home screen)
      try {
        const txSum = (txData || [])
          .filter((t: any) => (t.transactionType === 'DEBT' || t.transactionType === 'DEDUCTION' || String(t.type).toUpperCase().includes('DEBT')) && Number(t.amount || t.remaining || 0) > 0)
          .reduce((s: number, t: any) => s + Number(t.amount ?? t.remaining ?? 0), 0);
        if ((normLedger.currentDebt || 0) === 0 && txSum > 0) {
          normLedger.currentDebt = txSum;
        }
      } catch (e) { console.debug('[SupplierDebts] tx fallback error', e); }
      
      setLedger(normLedger);

      const ledgerDebts = (txData || []).filter((t: any) =>
        (t.transactionType === 'DEBT' || t.transactionType === 'ADVANCE') &&
        t.amount > 0 && t.status !== 'PENDING' &&
        !t.description?.toUpperCase().includes('ADVISORY')
      );

      const pendingReqs = (reqData || []).filter((r: any) =>
        (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'DISPATCHED' ||
         r.status === 'APPROVED_BY_EXT' || r.status === 'APPROVED_BY_MANAGER' || r.status === 'COMPLETED') &&
        r.requestType !== 'ADVISORY'
      ).map((r: any) => ({
        transactionDate: r.updatedAt || r.requestDate,
        description: r.requestType === 'FERTILIZER'
          ? `FERTILIZER: ${r.fertilizerItems?.map((f: any) => f.type).join(', ') || r.itemType || 'Fertilizer'}`
          : (r.itemType || r.requestType),
        amount: Number(r.approvedAmount || r.requestedAmount || r.totalDeduction || r.estimatedCost || r.amount || 0) || 0,
        isRequest: true,
        status: r.status,
        requestId: r.requestId
      }));

      const finalItems: any[] = [];
      const seenRequestIds = new Set<string>();
      ledgerDebts.forEach(ld => {
        const enrichedLd = { ...ld };
        if (enrichedLd.requestId) seenRequestIds.add(String(enrichedLd.requestId));
        
        // Try to find matching request to enrich description with actual itemType
        const matchingReq = (reqData || []).find((r: any) => String(r.requestId) === String(enrichedLd.requestId));
        if (matchingReq && matchingReq.itemType) {
          enrichedLd.description = matchingReq.itemType;
        } else if (enrichedLd.description?.toUpperCase().includes('LEAF_BAG')) {
          const leafReq = (reqData || []).find((r: any) => r.requestType === 'LEAF_BAG' && r.itemType);
          if (leafReq) enrichedLd.description = leafReq.itemType;
        }
        
        finalItems.push(enrichedLd);
      });
      pendingReqs.forEach(req => {
        if (req.requestId && seenRequestIds.has(String(req.requestId))) return;
        const cat = getCategoryInfo(req.description).label;
        const alreadyInLedger = ledgerDebts.some(ld =>
          getCategoryInfo(ld.description).label === cat &&
          Math.abs(Number(ld.amount) - Number(req.amount)) < 0.01
        );
        if (!alreadyInLedger) finalItems.push(req);
      });

      // Ledger fallback: if no breakdown items found but ledger shows outstanding debt,
      // create synthetic items from the ledger summary so the screen isn't blank
      if (finalItems.length === 0 && normLedger.currentDebt > 0) {
        finalItems.push({
          transactionDate: new Date().toISOString(),
          description: 'SERVICE DEBT',
          amount: Number(normLedger.currentDebt),
          isLedgerFallback: true,
          status: 'PENDING',
        });
      }
      if (finalItems.length === 0 && normLedger.advanceTaken > 0) {
        finalItems.push({
          transactionDate: new Date().toISOString(),
          description: 'ADVANCE',
          amount: Number(normLedger.advanceTaken),
          isLedgerFallback: true,
          status: 'PENDING',
        });
      }

      setDebtItems(finalItems);
    } catch (err) {
      console.error('Debts load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supplierId, token, user?.passbookNo, user?.passbook_no, user?.fullName]);  // debtPassbookNo excluded from deps — string but prevents loop on web

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const totalOutstanding = debtItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={localStyles.dashboardWrap}>
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={localStyles.headerBar}>
          <Pressable onPress={() => navigation.goBack()} style={localStyles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.muted} />
          </Pressable>
          <Text style={localStyles.headerTitle}>{_("Debts & Deductions")}</Text>
          <View style={{width: 40}} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={localStyles.debtSummaryCard}>
          <Text style={localStyles.debtTitle}>{_("Current Outstanding")}</Text>
          <Text style={localStyles.debtAmount}>{loading ? '...' : `Rs. ${totalOutstanding.toLocaleString()}`}</Text>
          <Text style={localStyles.debtSubTitle}>{_("Estimated for next payout")}</Text>
        </View>

        <View style={localStyles.infoBox}>
          <Ionicons name="information-circle" size={24} color={palette.accentBlue} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={localStyles.infoBoxTitle}>{_("How it works")}</Text>
            <Text style={localStyles.infoBoxText}>{_("Debts for services (fertilizer, tools) are deducted automatically.")}</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 13, color: palette.muted, letterSpacing: 1, marginTop: 10, textTransform: 'uppercase' }]}>{_("Detailed Breakdown")}</Text>

        {loading ? (
          <ActivityIndicator color={palette.accentBlue} style={{ marginVertical: 30 }} />
        ) : debtItems.length === 0 ? (
          <View style={localStyles.debtItemRow}>
            <Text style={{ color: palette.muted, flex: 1, textAlign: 'center' }}>{_("No outstanding debts found.")}</Text>
          </View>
        ) : (
          (() => {
            const formatDateLocalized = (date: Date) => {
              const day = date.getDate().toString().padStart(2, '0');
              const month = date.getMonth();
              const year = date.getFullYear();
              const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const monthsSi = ["ජන", "පෙබ", "මාර්", "අප්", "මැයි", "ජූනි", "ජූලි", "අගෝ", "සැප්", "ඔක්", "නොවැ", "දෙසැ"];
              const monthName = lang === 'si' ? monthsSi[month] : monthsEn[month];
              return `${day} ${monthName} ${year}`;
            };

            const groups: Record<string, { label: string, rawKey: string, icon: string, color: string, amount: number, date: Date, items: any[] }> = {};
            
            debtItems.forEach(item => {
              const info = getCategoryInfo(item.description);
              const key = info.label;
              if (!groups[key]) {
                groups[key] = { ...info, amount: 0, date: new Date(item.transactionDate), items: [] };
              }
              groups[key].amount += Number(item.amount || 0);
              groups[key].items.push(item);
              const itemDate = new Date(item.transactionDate);
              if (itemDate > groups[key].date) groups[key].date = itemDate;
            });

            // Sort groups descending by date (newest first)
            const sortedGroups = Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());

            return sortedGroups.map((group, idx) => {
              const dateStr = formatDateLocalized(group.date);
              const isExpanded = expandedCategory === group.label;
              
              return (
                <View key={idx} style={[localStyles.debtCardContainer, isExpanded && { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                  <Pressable 
                    onPress={() => setExpandedCategory(isExpanded ? null : group.label)}
                    style={localStyles.debtItemRow}
                  >
                    <View style={[localStyles.debtIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Ionicons name={group.icon as any} size={22} color={group.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.debtItemTitle}>{group.label}</Text>
                      <Text style={localStyles.debtItemDate}>{dateStr}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={localStyles.debtItemVal}>Rs. {group.amount.toLocaleString()}</Text>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color={palette.muted} 
                        style={{ marginLeft: 10 }} 
                      />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={localStyles.expandedContent}>
                      <View style={localStyles.divider} />
                      {group.items.map((item, iIdx) => {
                        let cleanDesc = item.description || group.label;
                        const upper = cleanDesc.toUpperCase();
                        
                        if (upper.startsWith("FERTILIZER:")) {
                          cleanDesc = cleanDesc.substring("FERTILIZER:".length).trim();
                        } else if (upper.startsWith("LEAF_BAG:") || upper === "LEAF_BAG") {
                          cleanDesc = _("Leaf Bags");
                        } else if (upper.startsWith("TOOL_PURCHASE:") || upper.startsWith("TOOL_RENT:")) {
                          cleanDesc = cleanDesc.substring(cleanDesc.indexOf(":") + 1).trim() || _("Tools");
                        } else if (upper.startsWith("TRANSPORT:")) {
                          cleanDesc = cleanDesc.substring("TRANSPORT:".length).trim();
                        } else if (upper === "ADVANCE") {
                          cleanDesc = _("Advance");
                        }

                        return (
                          <View key={iIdx} style={[localStyles.subItemRow, { alignItems: 'flex-start' }]}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={localStyles.subItemTitle}>{cleanDesc}</Text>
                              <Text style={{ fontSize: 11, color: palette.muted, marginTop: 4 }}>
                                {formatDateLocalized(new Date(item.transactionDate))}
                              </Text>
                            </View>
                            <Text style={localStyles.subItemVal}>Rs. {Number(item.amount || 0).toLocaleString()}</Text>
                          </View>
                        );
                      })}
                      
                      <Pressable 
                        onPress={() => navigation.navigate("Requests", { initialTab: group.rawKey })}
                        style={localStyles.historyLink}
                      >
                        <Text style={localStyles.historyLinkText}>Full Transaction History →</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            });
          })()
        )}

        <View style={localStyles.clarifyBox}>
          <Ionicons name="chatbubble-ellipses" size={24} color={palette.accentGreen} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={localStyles.clarifyTitle}>{_("Need clarification?")}</Text>
            <Text style={localStyles.clarifyText}>{_("Speak to your Extension Officer about these charges.")}</Text>
          </View>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function SupplierProfileScreen({ user, navigation, lang, setLang }: any) {
  const getPassbook = (u: any) => u?.passbookNo || u?.passbook_no || "N/A";
  const initials = user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SH";
  const _ = (key: string) => getTranslation(key, lang);

  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <View style={styles.dashboardWrap}>
      <PinChangeModal 
        visible={showPinModal} 
        onClose={() => setShowPinModal(false)} 
        user={user}
        _={_}
      />
      <SafeAreaView style={{ backgroundColor: "#111f38" }}>
        <View style={styles.headerBar}>
          <View style={{width: 40}} />
          <Text style={styles.headerTitle}>{_("My Profile")}</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={palette.muted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarBig}>
            <Text style={styles.profileAvatarBigText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.fullName || "Supplier"}</Text>
          <View style={styles.supplierBadge}>
            <Ionicons name="checkmark-circle-outline" size={14} color={palette.accentBlue} />
            <Text style={styles.supplierBadgeText}> {_("Verified Supplier")}</Text>
          </View>
          <View style={styles.supProfileIdBadge}>
            <Text style={styles.supProfileIdText}>SH-{user?.userId?.slice(-4) || "0000"} · {getPassbook(user)}</Text>
          </View>
        </View>

        <View style={styles.supDetailsBox}>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Land Name")}</Text><Text style={styles.supDetailVal}>{user?.estateName || "Not Assigned"}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("In-Charge")}</Text><Text style={styles.supDetailVal}>{user?.inChargeName || _("Pending Assignment")}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Passbook No.")}</Text><Text style={styles.supDetailVal}>{getPassbook(user)}</Text></View>
          <View style={styles.supDetailRow}><Text style={styles.supDetailKey}>{_("Supplier ID")}</Text><Text style={styles.supDetailVal}>SH-{user?.userId?.slice(-4) || "0000"}</Text></View>
        </View>

        <Text style={[styles.sectionHeader, { fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: 10 }]}>{_("ACCOUNT")}</Text>
        
        <View style={{ gap: 12 }}>
          {lang !== undefined && (
            <Pressable 
              style={[styles.settingItem, { borderColor: palette.accentBlue, borderWidth: 1 }]} 
              onPress={() => setLang(lang === 'en' ? 'si' : 'en')}
            >
              <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="language" size={20} color={palette.accentBlue} /></View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.settingItemTitle}>{_("Language Preference")}</Text>
                <Text style={styles.settingItemSub}>{_("Switch between Sinhala and English")}</Text>
              </View>
              <Text style={{ color: palette.accentBlue, fontWeight: "800", fontSize: 13, marginRight: 8 }}>{lang === 'en' ? 'ENGLISH' : 'SINHALA'}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.accentBlue} />
            </Pressable>
          )}

          <Pressable style={styles.settingItem} onPress={() => setShowPinModal(true)}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}><Ionicons name="lock-closed-outline" size={20} color="#e74c3c" /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Change PIN")}</Text><Text style={styles.settingItemSub}>{_("Update security access code")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(46, 168, 255, 0.15)" }]}><Ionicons name="chatbox-ellipses-outline" size={20} color={palette.accentBlue} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Contact Support")}</Text><Text style={styles.settingItemSub}>{_("Extension Officer")}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
          <Pressable 
            style={styles.settingItem} 
            onPress={async () => {
              await AsyncStorage.removeItem("dalupotha_session");
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
          >
            <View style={[styles.settingIconBg, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}><Ionicons name="log-out-outline" size={20} color={palette.muted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.settingItemTitle}>{_("Sign Out")}</Text><Text style={styles.settingItemSub}>{user?.fullName} · SH-{user?.userId?.slice(-4)}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Pressable>
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

export function PinChangeModal({ visible, onClose, user, _ }: any) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1);
    setOtp("");
    setNewPin("");
    setLoading(false);
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      setStep(2);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) return Alert.alert("Wait", "Please enter the OTP code");
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setStep(3);
    } catch (err: any) {
      Alert.alert("Error", "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePIN = async () => {
    if (newPin.length !== 4) return Alert.alert("Wait", "PIN must be 4 digits");
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1800));
      Alert.alert("Success", "Security PIN updated successfully!");
      onClose();
      reset();
    } catch (err: any) {
      Alert.alert("Error", "Failed to update PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: '#111f38', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
              <View>
                <Text style={{ color: palette.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{_("Security Center")}</Text>
                <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{_("Update PIN")}</Text>
              </View>
              <Pressable onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {step === 1 && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(46, 168, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Ionicons name="shield-checkmark" size={32} color={palette.accentBlue} />
                </View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>{_("Identity Verification")}</Text>
                <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 30 }}>{_("We will send a one-time verification code to your registered mobile number to confirm it's you.")}</Text>
                <Pressable style={[styles.mainBtn, { width: '100%', marginBottom: 0 }]} onPress={handleSendOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Send Verification Code")}</Text>}
                </Pressable>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 15 }}>{_("Enter the 6-digit code sent to your phone")}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TextInput 
                    style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 10, textAlign: 'center' }}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    autoFocus
                  />
                </View>
                <Pressable style={[styles.mainBtn, { width: '100%', marginBottom: 0 }]} onPress={handleVerifyOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Verify Code")}</Text>}
                </Pressable>
                <Pressable onPress={() => setStep(1)} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <Text style={{ color: palette.accentBlue, fontSize: 13, fontWeight: 'bold' }}>{_("Didn't receive code? Resend")}</Text>
                </Pressable>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 15 }}>{_("Set your new 4-digit security PIN")}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TextInput 
                    style={{ color: palette.accentGreen, fontSize: 32, fontWeight: 'bold', letterSpacing: 15, textAlign: 'center' }}
                    placeholder="0000"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={newPin}
                    onChangeText={setNewPin}
                    autoFocus
                  />
                </View>
                <Pressable style={[styles.mainBtn, { width: '100%', backgroundColor: palette.accentGreen, marginBottom: 0 }]} onPress={handleUpdatePIN} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>{_("Update Security PIN")}</Text>}
                </Pressable>
              </View>
            )}

          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  dashboardWrap: { flex: 1, backgroundColor: "#061224" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, paddingHorizontal: 20, backgroundColor: "#111f38" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  iconBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12 },
  sectionHeader: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  
  debtSummaryCard: { 
    backgroundColor: "rgba(130, 20, 20, 0.4)", 
    borderRadius: 32, 
    padding: 35, 
    alignItems: "center", 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: "rgba(255, 107, 107, 0.2)" 
  },
  debtTitle: { color: "#fff", fontSize: 16, marginBottom: 15, fontWeight: '700' },
  debtAmount: { color: "#ff8a8a", fontSize: 48, fontWeight: "900", marginBottom: 12 },
  debtSubTitle: { color: "#ffffff", fontSize: 15, fontWeight: '600' },

  infoBox: { 
    flexDirection: "row", 
    backgroundColor: "#11223b", 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: "rgba(46, 168, 255, 0.15)",
    alignItems: 'center'
  },
  infoBoxTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  infoBoxText: { color: "#ffffff", fontSize: 13, lineHeight: 20, fontWeight: '600' },

  debtItemRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#111f38", 
    padding: 18, 
    borderRadius: 24, 
    marginBottom: 0, 
  },
  debtIconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 18,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  debtItemTitle: { color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  debtItemDate: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  debtItemVal: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  debtCardContainer: { 
    borderRadius: 24, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.05)",
    overflow: 'hidden',
    backgroundColor: "#111f38",
  },
  expandedContent: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 15,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 5
  },
  subItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  subItemVal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyLink: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)'
  },
  historyLinkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textDecorationLine: 'underline'
  },

  clarifyBox: { 
    flexDirection: "row", 
    backgroundColor: "rgba(31, 190, 87, 0.08)", 
    padding: 20, 
    borderRadius: 24, 
    marginTop: 15, 
    borderWidth: 1, 
    borderColor: "rgba(31, 190, 87, 0.2)",
    alignItems: 'center'
  },
  clarifyTitle: { color: "#2ecc71", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  clarifyText: { color: "#ffffff", fontSize: 13, lineHeight: 20, fontWeight: '700' },
});
