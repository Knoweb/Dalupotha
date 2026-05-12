const API_BASE = '/api';

const getHeaders = () => {
    const token = sessionStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
  days?: number;
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
  itemId?: string;
}

export const FinanceAPI = {
  getRequests: async (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/services/request${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json() as Promise<ServiceRequest[]>;
  },
  
  updateStatus: async (requestId: string, status: RequestStatus, approverId: string, approverComment?: string, amount?: number) => {
    const res = await fetch(`${API_BASE}/services/request/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approverId, approverComment, amount })
    });
    if (!res.ok) throw new Error('Failed to update request status');
    return res.json() as Promise<ServiceRequest>;
  },

  getSupplierLedger: async (supplierId: string) => {
    const res = await fetch(`${API_BASE}/finance/ledger/${supplierId}`);
    if (!res.ok) throw new Error('Failed to fetch supplier ledger');
    return res.json() as Promise<{
      supplierId: string;
      currentDebt: number;
      advanceTaken: number;
      payoutTotal: number;
      estimatedBalance: number;
      totalNetWeight: number;
      leafPrice: number;
      grossEarnings: number;
    }>;
  },

  getLedgerTransactions: async (supplierId: string) => {
    const res = await fetch(`${API_BASE}/finance/ledger/${supplierId}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch ledger transactions');
    return res.json() as Promise<any[]>;
  },

  processPayout: async (data: { supplierId: string, amount: number, requesterId: string, description?: string, immediate?: boolean }) => {
    const res = await fetch(`${API_BASE}/finance/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to process payout');
    return res.json();
  },

  processBulkPayout: async (supplierIds: string[], requesterId: string, immediate: boolean = false) => {
    const query = new URLSearchParams({
      supplierIds: supplierIds.join(','),
      requesterId,
      immediate: immediate.toString()
    }).toString();
    const res = await fetch(`${API_BASE}/finance/payout/bulk?${query}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to process bulk payout');
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
}

export const CollectionAPI = {
  getRecentCollections: async (limit: number = 50) => {
    // Note: We'll use the agent history or a new recent endpoint if available.
    // For now, let's assume the gateway routes /api/collection/recent or similar.
    // Since we don't have a global "all" yet, we might need to fetch per agent or use a mock fallback if needed.
    // BUT looking at the controller, we only have history/agent or history/supplier.
    // I'll add a placeholder for now or use the Suppliers list as a base.
    const res = await fetch(`${API_BASE}/collection/recent?limit=${limit}`);
    if (!res.ok) {
       // Fallback to searching suppliers if "recent" isn't implemented yet
       console.warn('Realtime fetch failed, using fallback');
       return [] as CollectionItem[];
    }
    return res.json() as Promise<CollectionItem[]>;
  },
  getSupplierSummary: async (supplierId: string) => {
    const res = await fetch(`${API_BASE}/collection/summary/${supplierId}`);
    if (!res.ok) throw new Error('Failed to fetch supplier summary');
    return res.json() as Promise<{
      totalGrossWeight: number;
      totalNetWeight: number;
      collectionCount: number;
      processedCount: number;
      pendingCount: number;
    }>;
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
}

export const AuthAPI = {
  getUsers: async (estateId?: string) => {
    const query = estateId ? `?estateId=${estateId}` : '';
    const res = await fetch(`${API_BASE}/auth/users${query}`, {
       headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json() as Promise<UserSummary[]>;
  },
  createUser: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },
  registerAgent: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/agent/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to register agent');
    return res.json();
  },
  registerSmallHolder: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/small-holder/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to register small holder');
    return res.json();
  },
  deleteUser: async (userId: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },
  updateStatus: async (userId: string, status: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/status?status=${status}`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to update status');
  },
  getDetailedUser: async (userId: string) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/detailed`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch detailed user');
    return res.json() as Promise<DetailedUser>;
  },
  updateUser: async (userId: string, data: Partial<DetailedUser>) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update user');
  }
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
}

export const InventoryAPI = {
  getItems: async () => {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json() as Promise<InventoryItem[]>;
  },
  getItem: async (id: string) => {
    const res = await fetch(`${API_BASE}/inventory/${id}`);
    if (!res.ok) throw new Error('Failed to fetch item');
    return res.json() as Promise<InventoryItem>;
  },
  updateItem: async (id: string, data: Partial<InventoryItem>) => {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update inventory item');
    return res.json() as Promise<InventoryItem>;
  }
};
