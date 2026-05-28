import React, { useState, useEffect, useMemo, cloneElement, useCallback, useRef } from 'react'
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  History, 
  RefreshCw, 
  Settings, 
  Search, 
  Download, 
  TrendingDown,
  Box,
  Layers,
  X,
  RotateCcw
} from 'lucide-react'
import { InventoryAPI, InventoryItem, FinanceAPI } from '../../services/api'
import { useLanguage } from '../../hooks/useLanguage'
import { Snackbar, Alert } from '@mui/material'

export interface InventoryHistoryLog {
  logId: string;
  itemId: string;
  itemName: string;
  timestamp: string;
  actionType: 'INITIAL_IMPORT' | 'STOCK_REFILL' | 'STOCK_DECREASE' | 'REFILL_REQUEST' | 'PRICE_UPDATE';
  quantityChanged: string;
  currentStock: string;
  operatorName: string;
  operatorRole: string;
  notes?: string;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
};

function addHistoryLog(
  itemId: string,
  itemName: string,
  actionType: InventoryHistoryLog['actionType'],
  quantityChanged: string,
  currentStock: string,
  notes?: string
) {
  const STORAGE_KEY = 'dalupotha_inventory_history_v1';
  const name = sessionStorage.getItem('user_name') || 'Don Dinuka';
  const roleName = sessionStorage.getItem('user_role') === 'store-keeper' ? 'Store Keeper' : 'Manager';

  const newLog: InventoryHistoryLog = {
    logId: generateUUID(),
    itemId,
    itemName,
    timestamp: new Date().toISOString(),
    actionType,
    quantityChanged,
    currentStock,
    operatorName: name,
    operatorRole: roleName,
    notes
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...logs, newLog]));
  } catch (e) {
    console.error("Failed to save history log", e);
  }
}

export default function InventoryPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All Categories")
  const [showUpdateModal, setShowUpdateModal] = useState<InventoryItem | null>(null)
  const [updateQuantity, setUpdateQuantity] = useState<string>("")
  const [updateUnitCost, setUpdateUnitCost] = useState<string>("")
  const [updating, setUpdating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({ itemName: '', itemCategory: 'FERTILIZER', quantityInStock: '0', reorderLevel: '0', unit: 'kg', unitCost: '0' })
  const [addingItem, setAddingItem] = useState(false)
  const [viewHistoryItem, setViewHistoryItem] = useState<InventoryItem | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [notifiedItems, setNotifiedItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('dalupotha_notified_refills');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const showToast = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const userRole = sessionStorage.getItem('user_role') || 'store-keeper'

  const handleOpenUpdate = (item: InventoryItem) => {
    setShowUpdateModal(item)
    setUpdateQuantity(item.quantityInStock.toString())
    setUpdateUnitCost(item.unitCost.toString())
  }

  const handleUpdateSave = async () => {
    if (!showUpdateModal) return
    setUpdating(true)
    try {
      const oldQty = showUpdateModal.quantityInStock;
      const newQty = Number(updateQuantity);
      const diff = newQty - oldQty;
      const changeStr = diff >= 0 ? `+${diff} ${showUpdateModal.unit}` : `${diff} ${showUpdateModal.unit}`;
      const action = diff >= 0 ? 'STOCK_REFILL' : 'STOCK_DECREASE';

      await InventoryAPI.updateItem(showUpdateModal.itemId, {
        ...showUpdateModal,
        quantityInStock: newQty,
        unitCost: Number(updateUnitCost)
      })

      addHistoryLog(
        showUpdateModal.itemId,
        showUpdateModal.itemName,
        action,
        changeStr,
        `${newQty} ${showUpdateModal.unit}`,
        `Stock manual update. Unit cost set to Rs. ${updateUnitCost}`
      );

      await loadInventory()
      setShowUpdateModal(null)
      showToast(t("Stock updated successfully!"), "success")
    } catch (err) {
      console.error("Failed to update item", err)
      showToast(t("Failed to update item"), "error")
    } finally {
      setUpdating(false)
    }
  }

  const handleAddItemSave = async () => {
    if (!newItem.itemName.trim()) {
      showToast(t("Item name is required"), "error");
      return;
    }
    setAddingItem(true);
    try {
      const estateId = sessionStorage.getItem('estate_id');
      await InventoryAPI.createItem({
        itemName: newItem.itemName,
        itemCategory: newItem.itemCategory,
        quantityInStock: Number(newItem.quantityInStock) || 0,
        reorderLevel: Number(newItem.reorderLevel) || 0,
        unit: newItem.unit,
        unitCost: Number(newItem.unitCost) || 0,
        reservedQuantity: 0,
        ...((estateId ? { estateId } : {}) as any)
      });
      await loadInventory();
      setShowAddModal(false);
      setNewItem({ itemName: '', itemCategory: 'FERTILIZER', quantityInStock: '0', reorderLevel: '0', unit: 'kg', unitCost: '0' });
      showToast(t("Item added successfully!"), "success");
    } catch (err) {
      console.error("Failed to add item", err);
      showToast(t("Failed to add item"), "error");
    } finally {
      setAddingItem(false);
    }
  }

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${itemName}?`)) return;
    try {
      await InventoryAPI.deleteItem(itemId);
      await loadInventory();
      showToast(t("Item deleted successfully!"), "success");
    } catch (err) {
      console.error("Failed to delete item", err);
      showToast(t("Failed to delete item"), "error");
    }
  };

  const handleNotifyRefill = async (item: InventoryItem) => {
    setNotifyingId(item.itemId);
    try {
      const storeKeeperName = sessionStorage.getItem('user_name') || 'Store Keeper';
      const payload = {
        type: 'system',
        title: 'Refill Required',
        message: `[Store Keeper Alert] Refill requested for ${item.itemName} (Current stock: ${item.quantityInStock} ${item.unit})`,
        targetRole: 'manager',
        timestamp: new Date().toISOString(),
        meta: {
          estateId: sessionStorage.getItem('current_estate_id') || sessionStorage.getItem('estate_id')
        }
      };

      const res = await fetch('/api/notifications/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to publish notification");

      addHistoryLog(
        item.itemId,
        item.itemName,
        'REFILL_REQUEST',
        'Refill Notify',
        `${item.quantityInStock} ${item.unit}`,
        `Sent refill request alert to Manager.`
      );

      showToast(t("Notification sent successfully to the Manager!"), "success");
      setNotifiedItems(prev => {
        const next = [...prev, item.itemId];
        localStorage.setItem('dalupotha_notified_refills', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.error("Failed to send refill notification", err);
      showToast(t("Failed to send notification."), "error");
    } finally {
      setNotifyingId(null);
    }
  };
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true)
    const estateId = sessionStorage.getItem('estate_id') || undefined;
    try {
      const data = await InventoryAPI.getItems(estateId)
      setItems(data)
      setNotifiedItems(prev => {
        const stillLow = prev.filter(id => {
          const matched = data.find(i => i.itemId === id);
          return matched ? matched.quantityInStock <= matched.reorderLevel : false;
        });
        localStorage.setItem('dalupotha_notified_refills', JSON.stringify(stillLow));
        return stillLow;
      });
    } catch (err) {
      console.error("Failed to load inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["All Categories", "Fertilizer", "Bags", "Tools"]

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase())
      const matchesCat = activeCategory === "All Categories" || 
                        (activeCategory === "Fertilizer" && item.itemCategory === "FERTILIZER") ||
                        (activeCategory === "Bags" && item.itemCategory === "LEAF_BAG") ||
                        (activeCategory === "Tools" && item.itemCategory === "TOOLS")
      return matchesSearch && matchesCat
    })
  }, [items, search, activeCategory])

  const stats = useMemo(() => {
    const fertilizerTotal = items.filter(i => i.itemCategory === 'FERTILIZER').reduce((sum, i) => sum + i.quantityInStock, 0)
    const bagsTotal = items.filter(i => i.itemCategory === 'LEAF_BAG').reduce((sum, i) => sum + i.quantityInStock, 0)
    const toolsTotal = items.filter(i => i.itemCategory === 'TOOLS').reduce((sum, i) => sum + i.quantityInStock, 0)
    const lowStockAlerts = items.filter(i => i.quantityInStock <= i.reorderLevel).length

    return { fertilizerTotal, bagsTotal, toolsTotal, lowStockAlerts }
  }, [items])

  return (
    <div className="w-full space-y-4 px-4 py-3 animate-in fade-in duration-700">
      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-5">
         <StatCard label={t("TOTAL FERTILIZER STOCK")} value={`${stats.fertilizerTotal} ${t('kg')}`} sub={t("Urea + TSP + MOP")} icon={<Package size={20} className="text-emerald-500"/>} color="border-emerald-500" />
         <StatCard label={t("TOTAL LEAF BAGS")} value={`${stats.bagsTotal} ${t('bags')}`} sub={t("Standard + Large")} icon={<Layers size={20} className="text-emerald-500"/>} color="border-emerald-500" />
         <StatCard label={t("LOW STOCK ALERTS")} value={stats.lowStockAlerts.toString()} sub={t("Items needing attention")} icon={<AlertTriangle size={20} className="text-rose-500"/>} color="border-rose-500" />
         <StatCard label={t("TOOLS UNITS")} value={`${stats.toolsTotal} ${t('units')}`} sub={t("Active Inventory")} icon={<Settings size={20} className="text-amber-500"/>} color="border-amber-500" />
      </div>

      {items.find(i => i.quantityInStock <= i.reorderLevel) && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-xs">
                 <AlertTriangle className="text-rose-500" size={20} />
              </div>
              <p className="text-[13px] text-rose-800 font-medium tracking-tight">
                 <span className="font-semibold">{items.find(i => i.quantityInStock <= i.reorderLevel)?.itemName}</span> {t('stock is below reorder level')} ({items.find(i => i.quantityInStock <= i.reorderLevel)?.quantityInStock} {items.find(i => i.quantityInStock <= i.reorderLevel)?.unit} {t('remaining')}, {t('reorder at')} {items.find(i => i.quantityInStock <= i.reorderLevel)?.reorderLevel} {items.find(i => i.quantityInStock <= i.reorderLevel)?.unit}).
              </p>
           </div>
            {(() => {
              const lowItem = items.find(i => i.quantityInStock <= i.reorderLevel);
              if (!lowItem) return null;
              const alreadyNotified = notifiedItems.includes(lowItem.itemId);
              return (
                <button 
                  onClick={() => {
                    if (userRole === 'manager') {
                      handleOpenUpdate(lowItem);
                    } else if (!alreadyNotified) {
                      handleNotifyRefill(lowItem);
                    }
                  }}
                  disabled={alreadyNotified && userRole !== 'manager'}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-semibold transition-all shadow-sm ${
                    alreadyNotified && userRole !== 'manager'
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <RefreshCw size={14} className={notifyingId === lowItem.itemId ? 'animate-spin' : ''} />
                  {userRole === 'manager' 
                    ? t('Update Stock') 
                    : alreadyNotified 
                      ? t('Refill Notified') 
                      : t('Notify Refill')}
                </button>
              );
            })()}
        </div>
      )}

      {/* Inventory Items Section */}
      <div className="space-y-4 pt-2">
         <div className="flex justify-between items-center">
         <h2 className="text-[14px] font-semibold text-slate-700 uppercase tracking-widest">{t('Inventory Items')}</h2>
         {userRole === 'manager' && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm">
               <Plus size={15} /> {t('Add Item')}
            </button>
         )}
         </div>

         {/* Filters row */}
         <div className="flex items-center gap-4">
            <div className="relative w-80">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-900" size={16} />
               <input 
                  type="text" 
                  placeholder={t("Search item...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] font-medium placeholder:text-slate-900 focus:border-emerald-200 outline-none transition-all shadow-sm"
               />
            </div>
            <div className="flex items-center gap-3">
               {categories.map(c => (
                  <button 
                     key={c}
                     onClick={() => setActiveCategory(c)}
                   className={`px-5 py-1.5 rounded-full text-[12px] font-medium transition-all border ${activeCategory === c ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-white text-slate-950 border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                     {t(c)}
                  </button>
               ))}
               <button className="flex items-center gap-2 ml-1 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <Download size={16} /> {t('Export')}
               </button>
            </div>
         </div>

         {/* Table */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-300">
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('ITEM')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('CATEGORY')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('AVAILABLE STOCK')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('REORDER LEVEL')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('STOCK STATUS')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('UNIT COST')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('STATUS')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider text-right">{t('ACTIONS')}</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredItems.map((item) => {
                     const isLow = item.quantityInStock <= item.reorderLevel;
                     const progress = Math.min((item.quantityInStock / (item.reorderLevel * 2)) * 100, 100);
                     return (
                        <tr key={item.itemId} className="hover:bg-emerald-50/40 transition-colors border-slate-100">
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.itemName}</td>
                           <td className="px-6 py-5 text-[14px] font-semibold text-slate-800">{t(item.itemCategory.charAt(0) + item.itemCategory.slice(1).toLowerCase().replace('_', ' '))}</td>
                           <td className="px-6 py-5 text-[14px] font-bold text-emerald-700">{item.quantityInStock} <span className="text-slate-600">{t(item.unit)}</span></td>
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.reorderLevel} <span className="text-slate-600">{t(item.unit)}</span></td>
                           <td className="px-6 py-5 w-48">
                              <div className="space-y-2">
                                 <div className="flex justify-between text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                                    <span>{item.quantityInStock} {t(item.unit)} {t('Available')}</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${isLow ? 'bg-rose-500' : 'bg-emerald-600'}`} style={{ width: `${Math.min((item.quantityInStock / (item.reorderLevel * 1.5)) * 100, 100)}%` }} />
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">Rs. {item.unitCost.toLocaleString()}</td>
                           <td className="px-6 py-5">
                              <span className={`px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider ${isLow ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                 {isLow ? t('Low Stock') : t('OK')}
                              </span>
                           </td>
                            <td className="px-6 py-5 text-right">
                               <div className="flex items-center justify-end gap-3">
                                  <button onClick={() => setViewHistoryItem(item)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-slate-900 hover:bg-slate-200 transition-all border border-slate-300 hover:border-slate-400">
                                     <History size={15} /> {t('History')}
                                  </button>
                                  {userRole === 'manager' ? (
                                     <>
                                        <button onClick={() => handleOpenUpdate(item)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 text-[12px] font-bold transition-all shadow-md">
                                           <RefreshCw size={15} /> {t('Update')}
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.itemId, item.itemName)} className="flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all" title={t('Remove Item')}>
                                           <X size={15} />
                                        </button>
                                     </>
                                  ) : (
                                     <button 
                                       onClick={() => handleNotifyRefill(item)} 
                                       disabled={notifyingId === item.itemId || notifiedItems.includes(item.itemId)} 
                                       className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all shadow-md ${
                                         notifiedItems.includes(item.itemId)
                                           ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                           : 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600'
                                       }`}
                                     >
                                        <RefreshCw size={15} className={notifyingId === item.itemId ? 'animate-spin' : ''} /> 
                                        {notifiedItems.includes(item.itemId) ? t('Notified') : t('Notify Refill')}
                                     </button>
                                  )}
                               </div>
                            </td>
                        </tr>
                     )
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('Update Stock')}</h3>
                <button onClick={() => setShowUpdateModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-900"><X size={18} /></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50"><Package size={20} /></div>
                   <div>
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{t('SELECTED ITEM')}</p>
                      <p className="text-sm font-bold text-slate-900">{showUpdateModal.itemName}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">{t('New Stock')}</label>
                       <input type="number" value={updateQuantity} onChange={(e) => setUpdateQuantity(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-200 outline-none transition-all text-sm" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">{t('Unit Cost')}</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
                          <input type="number" value={updateUnitCost} onChange={(e) => setUpdateUnitCost(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-200 outline-none transition-all text-sm" />
                       </div>
                    </div>
                </div>
             </div>
             <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button onClick={() => setShowUpdateModal(null)} disabled={updating} className="flex-1 py-2.5 text-xs font-bold text-slate-900">{t('Cancel')}</button>
                <button onClick={handleUpdateSave} disabled={updating} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/10">
                  {updating ? t('Saving...') : t('Save Changes')}
                </button>
             </div>
          </div>
        </div>
      )}

      {viewHistoryItem && (
        <HistoryModal 
          item={viewHistoryItem} 
          onClose={() => setViewHistoryItem(null)} 
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                     <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{t('Add New Item')}</h2>
                    <p className="text-xs text-slate-500 font-medium">{t('Add a new item to inventory')}</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Item Name')}</label>
                  <input type="text" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder={t('e.g. Urea Fertilizer')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Category')}</label>
                    <select value={newItem.itemCategory} onChange={e => setNewItem({...newItem, itemCategory: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 transition-all">
                      <option value="FERTILIZER">Fertilizer</option>
                      <option value="LEAF_BAG">Leaf Bags</option>
                      <option value="TOOLS">Tools</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Unit')}</label>
                    <select value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 transition-all">
                      <option value="kg">{t('kg')}</option>
                      <option value="units">{t('units')}</option>
                      <option value="bags">{t('bags')}</option>
                      <option value="liters">{t('liters')}</option>
                      <option value="packets">{t('packets')}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Init. Stock')}</label>
                    <input type="number" value={newItem.quantityInStock} onChange={e => setNewItem({...newItem, quantityInStock: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Reorder Lvl')}</label>
                    <input type="number" value={newItem.reorderLevel} onChange={e => setNewItem({...newItem, reorderLevel: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('Unit Cost')}</label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
                       <input type="number" value={newItem.unitCost} onChange={e => setNewItem({...newItem, unitCost: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-colors">{t('Cancel')}</button>
                <button disabled={addingItem} onClick={handleAddItemSave} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50">
                  {addingItem ? t('Saving...') : t('Save Item')}
                </button>
              </div>
           </div>
        </div>
      )}

      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
          severity={toast.severity} 
          sx={{ 
            width: '100%', 
            borderRadius: '16px', 
            fontWeight: 700, 
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            border: '1px solid',
            borderColor: toast.severity === 'success' ? '#CEEAD6' : '#FAD2E1',
            bgcolor: toast.severity === 'success' ? '#E6F4EA' : '#FCE8E6',
            color: toast.severity === 'success' ? '#137333' : '#C5221F',
            fontFamily: 'inherit',
            fontSize: '0.8rem'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

function HistoryModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const [logs, setLogs] = useState<InventoryHistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const estateId = sessionStorage.getItem('estate_id') || undefined;
      try {
        const allRequests = await FinanceAPI.getRequests(estateId ? { estateId } : undefined);
        const itemRequests = allRequests.filter(req => req.itemId === item.itemId);

        const requestLogs: InventoryHistoryLog[] = itemRequests.map(req => {
          const isDispatched = req.status === 'DISPATCHED';
          const isApproved = req.status === 'APPROVED_BY_EXT';
          const changeStr = `-${req.quantity || 0} ${item.unit || 'units'}`;

          let statusText = '';
          if (isDispatched) {
            statusText = 'Dispatched to Supplier';
          } else if (isApproved) {
            statusText = 'Approved (Pending Dispatch)';
          } else {
            statusText = `Requested (${req.status.toLowerCase()})`;
          }

          return {
            logId: req.requestId,
            itemId: item.itemId,
            itemName: item.itemName,
            timestamp: req.updatedAt || req.requestDate || new Date().toISOString(),
            actionType: 'STOCK_DECREASE',
            quantityChanged: changeStr,
            currentStock: '-',
            operatorName: req.approverName || req.creatorName || 'System',
            operatorRole: req.approverId ? 'Manager' : 'Officer',
            notes: `${statusText}: ${req.supplierName || 'Supplier'} (Passbook: ${req.passbookNo || 'N/A'}). Notes: ${req.notes || 'None'}`
          };
        });

        let manualLogs: InventoryHistoryLog[] = [];
        try {
          const STORAGE_KEY = 'dalupotha_inventory_history_v1';
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            manualLogs = (JSON.parse(raw) as InventoryHistoryLog[]).filter(l => l.itemId === item.itemId);
          }
        } catch (e) {
          console.error("Failed to load manual logs from localStorage", e);
        }

        const combined = [...requestLogs, ...manualLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setLogs(combined);
      } catch (err) {
        console.error("Failed to load inventory history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [item]);

  const actionStyle: Record<string, { bg: string; text: string; label: string }> = {
    INITIAL_IMPORT: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Initial Setup' },
    STOCK_REFILL: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Stock Refill' },
    STOCK_DECREASE: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'Stock Dispatched' },
    REFILL_REQUEST: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Refill Request Alert' },
    PRICE_UPDATE: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: 'Price Update' },
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(lang === 'si' ? 'si-LK' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('Stock History Log')}</h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{item.itemName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-900"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw size={24} className="text-emerald-500 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">{t('Loading transaction history...')}</p>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-900 font-medium">{t('No history records found.')}</p>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-6 py-2">
              {logs.map((log) => {
                const style = actionStyle[log.actionType] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', label: log.actionType };
                return (
                  <div key={log.logId} className="relative">
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-emerald-500 shadow-sm" />
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.text}`}>
                          {t(style.label)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatDate(log.timestamp)}</span>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-semibold text-slate-700">{log.notes || t('No details provided.')}</p>
                          <span className={`text-xs font-bold whitespace-nowrap ml-2 ${log.quantityChanged.startsWith('+') ? 'text-emerald-600' : log.quantityChanged.startsWith('-') ? 'text-rose-600' : 'text-amber-600'}`}>
                            {log.quantityChanged}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-1.5 mt-1.5 font-semibold">
                          <span>{t('By')}: <span className="font-bold text-slate-600">{log.operatorName}</span> ({t(log.operatorRole)})</span>
                          <span>{t('Stock')}: <span className="font-bold text-slate-600">{log.currentStock}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 hover:bg-slate-50 transition-colors shadow-sm">{t('Close')}</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className={`bg-white p-6 rounded-[24px] border-t-[4px] border-x border-b border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between h-[155px] ${color}`}>
       <div className="flex justify-between items-start">
          <div className="p-2.5 bg-white border border-slate-50 rounded-xl shadow-xs">{cloneElement(icon, { size: 20 })}</div>
          <div className="w-2 h-2 rounded-full bg-slate-50" />
       </div>
       <div>
         <h3 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-1">{value}</h3>
         <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-[0.08em]">{label}</p>
         <p className="text-[11px] text-slate-900 font-normal uppercase tracking-tight">{sub}</p>
       </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
       {[...Array(9)].map((_, i) => (
         <td key={i} className="px-6 py-4"><div className="h-3 bg-slate-100 rounded w-full" /></td>
       ))}
    </tr>
  )
}
