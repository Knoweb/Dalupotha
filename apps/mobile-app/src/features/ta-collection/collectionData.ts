import AsyncStorage from "@react-native-async-storage/async-storage";
import { CollectionAPI, apiPost } from "../../services/api";

export type SyncStatus = "QUEUED" | "SYNCING" | "SYNCED" | "FAILED";

export type OfflineCollectionItem = {
  clientRef: string;
  supplierId: string;
  supplierName?: string;
  passbookNo?: string;
  transportAgentId: string;
  transportAgentName?: string;
  grossWeight: number;
  netWeight?: number;
  gpsLat?: number;
  gpsLong?: number;
  gpsStatus: "GPS" | "NO_GPS" | "MANUAL";
  manualOverride: boolean;
  overrideReason?: string;
  collectedAt: string;
  syncStatus: SyncStatus;
};

type SyncResult = {
  clientRef: string;
  collectionId: string | null;
  status: "SYNCED" | "FAILED";
  message: string;
};

type SyncResponse = {
  syncedCount: number;
  failedCount: number;
  results: SyncResult[];
};

export const OFFLINE_COLLECTIONS_KEY = "OFFLINE_COLLECTIONS";

// Internal helper for raw management
async function _getAllOfflineCollections(): Promise<OfflineCollectionItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_COLLECTIONS_KEY);
  return raw ? (JSON.parse(raw) as OfflineCollectionItem[]) : [];
}

export async function getOfflineCollections(transportAgentId: string): Promise<OfflineCollectionItem[]> {
  const all = await _getAllOfflineCollections();
  // SECURITY: Only return items that belong to THIS transport agent
  return all.filter((item) => item.transportAgentId === transportAgentId);
}

export async function setOfflineCollections(items: OfflineCollectionItem[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_COLLECTIONS_KEY, JSON.stringify(items));
}

export async function enqueueOfflineCollection(item: OfflineCollectionItem): Promise<void> {
  const current = await _getAllOfflineCollections();
  current.push(item);
  await setOfflineCollections(current);
}

export async function syncQueuedCollections(token: string, transportAgentId: string): Promise<{ synced: number; failed: number }> {
  const all = await _getAllOfflineCollections();
  // Only sync items for the current agent
  const agentItems = all.filter(item => item.transportAgentId === transportAgentId);
  const pending = agentItems.filter((item) => item.syncStatus === "QUEUED" || item.syncStatus === "FAILED");

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  // Mark only THIS agent's items as syncing
  const updatedWithSyncing = all.map((item) =>
    (item.transportAgentId === transportAgentId && pending.some((p) => p.clientRef === item.clientRef)) 
      ? { ...item, syncStatus: "SYNCING" as const } : item
  );
  await setOfflineCollections(updatedWithSyncing);

  const payload = {
    collections: pending.map((item) => ({
      clientRef: item.clientRef,
      supplierId: item.supplierId,
      transportAgentId: item.transportAgentId,
      grossWeight: item.grossWeight,
      netWeight: item.netWeight,
      gpsLat: item.gpsLat,
      gpsLong: item.gpsLong,
      gpsStatus: item.gpsStatus,
      manualOverride: item.manualOverride,
      overrideReason: item.overrideReason,
      supplierName: item.supplierName,
      passbookNo: item.passbookNo,
      transportAgentName: item.transportAgentName,
      collectedAt: item.collectedAt,
    })),
  };

  let response: SyncResponse;
  try {
    response = await apiPost<SyncResponse>(CollectionAPI.sync, payload, token);
  } catch (err) {
    console.error("Sync request failed:", err);
    // REVERT syncing status to QUEUED if network/server failed
    const finalAll = await _getAllOfflineCollections();
    const reverted = finalAll.map((item) =>
      (item.transportAgentId === transportAgentId && item.syncStatus === "SYNCING")
        ? { ...item, syncStatus: "QUEUED" as const } : item
    );
    await setOfflineCollections(reverted);
    throw err;
  }

  const resultMap = new Map(response.results.map((item) => [item.clientRef, item]));

  const finalUpdate = all
    .map((item) => {
      // Only process results for this agent
      if (item.transportAgentId !== transportAgentId) return item;
      
      const result = resultMap.get(item.clientRef);
      if (!result) {
        // If it was syncing but not in result, revert to QUEUED
        return item.syncStatus === "SYNCING" ? { ...item, syncStatus: "QUEUED" as const } : item;
      }

      if (result.status === "SYNCED") {
        return { ...item, syncStatus: "SYNCED" as const };
      }
      return { ...item, syncStatus: "FAILED" as const };
    })
    .filter((item) => item.syncStatus !== "SYNCED");

  await setOfflineCollections(finalUpdate);
  return { synced: response.syncedCount, failed: response.failedCount };
}

// ─────────────────────────────────────────────────────────────
// Supplier Caching (Self-Healing Offline Data)
// ─────────────────────────────────────────────────────────────

export const SUPPLIER_CACHE_KEY = "SUPPLIER_CACHE";

export type CachedSupplier = {
  supplierId: string;
  fullName: string;
  passbookNo: string;
  landName: string;
  estateId?: string;
};

export async function cacheSuppliers(suppliers: CachedSupplier[]): Promise<void> {
  await AsyncStorage.setItem(SUPPLIER_CACHE_KEY, JSON.stringify(suppliers));
}

export async function getCachedSuppliers(): Promise<CachedSupplier[]> {
  const raw = await AsyncStorage.getItem(SUPPLIER_CACHE_KEY);
  return raw ? (JSON.parse(raw) as CachedSupplier[]) : [];
}
