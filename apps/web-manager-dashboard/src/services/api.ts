const API_BASE = '/api';

export type RequestStatus = 'PENDING' | 'APPROVED_BY_EXT' | 'APPROVED_BY_FIN' | 'REJECTED' | 'DISPATCHED' | 'CANCELLED';

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
  creatorName?: string;
  creatorId?: string;
  status: RequestStatus;
  requestDate: string;
  updatedAt: string;
  notes?: string;
  approverId?: string;
}

export const FinanceAPI = {
  getRequests: async (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/services/request${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json() as Promise<ServiceRequest[]>;
  },
  
  updateStatus: async (requestId: string, status: RequestStatus, approverId: string) => {
    const res = await fetch(`${API_BASE}/services/request/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approverId })
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
