const API_BASE = '/api';

const getHeaders = () => {
  const token = sessionStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export type RequestStatus = 'PENDING' | 'APPROVED_BY_EXT' | 'REJECTED' | 'DISPATCHED' | 'CANCELLED';

export interface ServiceRequest {
  requestId: string;
  supplierId: string;
  supplierName?: string;
  passbookNo?: string;
  createdById: string;
  requestType: string;
  requestedAmount: number;
  quantity?: number;
  itemType?: string;
  itemDetails?: string;
  creatorName?: string;
  creatorId?: string;
  status: RequestStatus;
  requestDate: string;
  updatedAt: string;
  notes?: string;
  approverId?: string;
  approverComment?: string;
  approvedAmount?: number;
}

export const FinanceAPI = {
  getRequests: async (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/services/request${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json() as Promise<ServiceRequest[]>;
  },
  
  updateStatus: async (requestId: string, status: RequestStatus, approverId: string, approverComment?: string, approvedAmount?: number) => {
    const res = await fetch(`${API_BASE}/services/request/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approverId, approverComment, amount: approvedAmount })
    });
    if (!res.ok) throw new Error('Failed to update request status');
    return res.json() as Promise<ServiceRequest>;
  },

  getSupplierLedger: async (supplierId: string) => {
    const res = await fetch(`${API_BASE}/finance/ledger/${supplierId}`);
    if (!res.ok) throw new Error('Failed to fetch supplier ledger');
    return res.json() as Promise<{
      currentDebt: number;
      advanceTaken: number;
      payoutTotal: number;
      estimatedBalance: number;
    }>;
  },

  getLedgerTransactions: async (supplierId: string) => {
    const res = await fetch(`${API_BASE}/finance/ledger/${supplierId}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch ledger transactions');
    return res.json() as Promise<any[]>;
  },

  processPayout: async (data: { supplierId: string; amount: number; requesterId: string; description?: string; immediate?: boolean }) => {
    const res = await fetch(`${API_BASE}/finance/payout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to process payout');
    return res.json();
  },

  processBulkPayout: async (supplierIds: string[], requesterId: string, immediate: boolean = false) => {
    const query = new URLSearchParams({
      supplierIds: supplierIds.join(','),
      requesterId,
      immediate: immediate.toString(),
    }).toString();
    const res = await fetch(`${API_BASE}/finance/payout/bulk?${query}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to process bulk payout');
    return res.json();
  }
};

export interface CollectionItem {
  collectionId: string;
  supplierId: string;
  supplierName: string;
  passbookNo: string;
  grossWeight: number;
  netWeight: number;
  collectedAt: string;
  syncStatus: string;
  gpsStatus: string;
  manualOverride: boolean;
  transportAgentId: string;
  transportAgentName: string;
  gpsLat?: number;
  gpsLong?: number;
}

export interface SupplierCollectionHistoryItem {
  collectionId: string;
  supplierId: string;
  grossWeight?: number;
  netWeight?: number;
  collectedAt: string;
}

export const CollectionAPI = {
  getSupplierHistory: async (supplierId: string, limit: number = 250) => {
    const res = await fetch(`${API_BASE}/collection/history/${supplierId}?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch supplier history');
    return res.json() as Promise<SupplierCollectionHistoryItem[]>;
  },

  getRecentCollections: async (limit: number = 50, estateId?: string) => {
    const estateParam = estateId ? `&estateId=${estateId}` : '';
    const res = await fetch(`${API_BASE}/collection/recent?limit=${limit}${estateParam}`);
    if (!res.ok) {
       console.warn('Realtime fetch failed, using fallback');
       return [] as CollectionItem[];
    }
    return res.json() as Promise<CollectionItem[]>;
  }
};

export interface UserSummary {
  id: string;
  userId: string;
  supplierId?: string;
  name: string;
  role: string;
  status: string;
  active: string;
}

export interface DetailedUser extends UserSummary {
  contact: string;
  email?: string;
  estateId?: string;
  estateName?: string;
  passbookNo?: string;
  landName?: string;
  address?: string;
  arcs?: number;
  inChargeName?: string;
  inChargeId?: string;
  routeName?: string;
}

export const AuthAPI = {
  getSuppliers: async (params?: { estateId?: string; search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.estateId) query.set('estateId', params.estateId);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    const res = await fetch(`${API_BASE}/auth/suppliers${query.toString() ? `?${query.toString()}` : ''}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json() as Promise<Array<{
      supplierId: string;
      fullName: string;
      passbookNo: string;
      landName?: string;
      estateId?: string;
      arcs?: number;
    }>>;
  },

  getUsers: async (estateId?: string) => {
    const query = estateId ? `?estateId=${estateId}` : '';
    const res = await fetch(`${API_BASE}/auth/users${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json() as Promise<UserSummary[]>;
  },

  createUser: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  registerAgent: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/agent/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to register agent');
    return res.json();
  },

  registerSmallHolder: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/small-holder/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to register small holder');
    return res.json();
  },

  deleteUser: async (userId: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },

  updateStatus: async (userId: string, status: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update status');
  },

  getDetailedUser: async (userId: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/detailed`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch detailed user');
    return res.json() as Promise<DetailedUser>;
  },

  updateUser: async (userId: string, data: Partial<DetailedUser>) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errMsg = `Update failed (${res.status})`;
      try { const body = await res.json(); errMsg = body.message || body.error || JSON.stringify(body); } catch {}
      throw new Error(errMsg);
    }
    try { return await res.json(); } catch { return; }
  },

  getEstateRoutes: async (estateId: string) => {
    const res = await fetch(`${API_BASE}/auth/estates/${estateId}/routes`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch estate routes');
    return res.json() as Promise<Array<{ routeId: string; name: string; code: string }>>;
  },

  createEstateRoute: async (estateId: string, data: { name: string; code: string }) => {
    const res = await fetch(`${API_BASE}/auth/estates/${estateId}/routes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create route');
    return res.json();
  },

  deleteEstateRoute: async (estateId: string, routeId: string) => {
    const res = await fetch(`${API_BASE}/auth/estates/${estateId}/routes/${routeId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete route');
  },
};

export interface InventoryItem {
  itemId: string;
  itemCategory: string;
  itemName: string;
  quantityInStock: number;
  reservedQuantity: number;
  reorderLevel: number;
  unit: string;
  unitCost: number;
  lastUpdated?: string;
  createdAt?: string;
}

export const InventoryAPI = {
  getItems: async () => {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory items');
    return res.json() as Promise<InventoryItem[]>;
  },

  getItem: async (itemId: string) => {
    const res = await fetch(`${API_BASE}/inventory/${itemId}`);
    if (!res.ok) throw new Error('Failed to fetch inventory item');
    return res.json() as Promise<InventoryItem>;
  },

  createItem: async (item: Partial<InventoryItem>) => {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to create inventory item');
    return res.json() as Promise<InventoryItem>;
  },

  updateItem: async (itemId: string, item: Partial<InventoryItem>) => {
    const res = await fetch(`${API_BASE}/inventory/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to update inventory item');
    return res.json() as Promise<InventoryItem>;
  },
};
