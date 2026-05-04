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
}

export const FinanceAPI = {
  getRequests: async (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/services/request${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json() as Promise<ServiceRequest[]>;
  },
  
  updateStatus: async (requestId: string, status: RequestStatus, approverId: string, approverComment?: string) => {
    const res = await fetch(`${API_BASE}/services/request/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approverId, approverComment })
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
  }
};

export interface UserSummary {
  id: string;
  userId: string;
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
