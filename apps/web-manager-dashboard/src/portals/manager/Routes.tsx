import { useState, useEffect } from 'react';
import { Route, MapPin, Trash2, Plus, RefreshCw, AlertCircle, Compass, Milestone, X, Users, Car, ChevronRight, UserCheck, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AuthAPI } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../hooks/useToast';

interface RouteItem { routeId: string; name: string; code: string; }
interface AgentItem { userId: string; fullName: string; employeeId: string; routeName: string; }
interface UserItem { userId: string; id: string; name: string; role: string; status: string; }

export default function RoutesPage() {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeCode, setRouteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Route Detail Drawer
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [estateAgents, setEstateAgents] = useState<AgentItem[]>([]);
  const [estateUsers, setEstateUsers] = useState<UserItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const estateId = sessionStorage.getItem('current_estate_id') || '';

  const fetchRoutes = async () => {
    if (!estateId) { setError("Estate session not found"); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const data = await AuthAPI.getEstateRoutes(estateId);
      setRoutes(data);
    } catch (err: any) {
      setError("Failed to load estate collection routes");
    } finally { setIsLoading(false); }
  };

  const fetchDetailData = async () => {
    if (!estateId) return;
    setDetailLoading(true);
    try {
      const [agents, users] = await Promise.all([
        fetch(`/api/auth/estates/${estateId}/agents`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } }).then(r => r.json()),
        AuthAPI.getUsers(estateId),
      ]);
      setEstateAgents(Array.isArray(agents) ? agents : []);
      setEstateUsers(Array.isArray(users) ? users : []);
    } catch { /* silently fail — drawer shows empty state */ }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { fetchRoutes(); }, [estateId]);

  const openRouteDetail = (route: RouteItem) => {
    setSelectedRoute(route);
    fetchDetailData();
  };

  // Filter helpers
  const routeAgents = selectedRoute
    ? estateAgents.filter(a =>
        a.routeName && a.routeName.split(',').map(s => s.trim()).some(r =>
          r === `${selectedRoute.name} (${selectedRoute.code})`
        )
      )
    : [];

  const routeSuppliers = selectedRoute
    ? estateUsers.filter(u => {
        if (u.role !== 'SH' && u.role !== 'Supplier') return false;
        // Suppliers are linked to agents — match those whose agent covers this route
        const agentIds = routeAgents.map(a => a.userId);
        return agentIds.length > 0; // all suppliers of route agents
      })
    : [];

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !routeCode.trim()) { setFormError("Route name and code are required"); return; }
    setIsSubmitting(true); setFormError(null);
    try {
      await AuthAPI.createEstateRoute(estateId, { name: routeName.trim(), code: routeCode.trim().toUpperCase() });
      success(t('Route created successfully!'));
      setRouteName(''); setRouteCode(''); setIsAddModalOpen(false);
      fetchRoutes();
    } catch { setFormError("Route name already exists in this estate"); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteRoute = async (routeId: string) => {
    setConfirmDialog({
      open: true,
      title: t('Delete Route'),
      message: t('Are you sure you want to delete this route? Smallholders and Transport Agents assigned to this route will need manual adjustment.'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await AuthAPI.deleteEstateRoute(estateId, routeId);
          success(t('Collection route deleted successfully!'));
          fetchRoutes();
        } catch {
          toastError(t("Failed to delete collection route"));
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Collection Route Management')}</h1>
          <p className="text-slate-500 text-sm">{t('Define and monitor specific leaf collection divisions within the estate')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRoutes} className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-all" title={t('Refresh')}>
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setFormError(null); setIsAddModalOpen(true); }} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
            <Plus size={18} /><span>{t('Add Route')}</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100"><Route className="text-emerald-600" size={24} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{routes.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('Total Estate Routes')}</p>
            <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">{t('Fully configured & active')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100"><Compass className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{new Set(routes.map(r => r.code)).size}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('Unique Area Codes')}</p>
            <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">{t('Dynamic division code prefixes')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100"><Milestone className="text-orange-600" size={24} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">Active</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('System Integration')}</p>
            <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">{t('Live matching with agents & suppliers')}</p>
          </div>
        </div>
      </div>

      {/* Routes Grid */}
      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-150">
          <RefreshCw size={36} className="animate-spin text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">{t('Loading Collection Routes...')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /><span className="text-sm font-semibold">{error}</span>
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white text-center py-20 rounded-2xl border border-slate-200">
          <MapPin size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700">{t('No Collection Routes Mapped')}</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">{t('You must define the leaf collection routes in this estate so that Transport Agents and Suppliers can assign and lock onto their target zones.')}</p>
          <button onClick={() => { setFormError(null); setIsAddModalOpen(true); }} className="mt-6 bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md inline-flex items-center gap-2">
            <Plus size={16} /><span>{t('Define First Route')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <div
              key={route.routeId}
              onClick={() => openRouteDetail(route)}
              className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all flex flex-col group cursor-pointer"
            >
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-[#2d6a4f]" />
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="bg-emerald-50 text-[#2d6a4f] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-emerald-100">Code: {route.code}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.routeId); }}
                      className="text-slate-300 hover:text-red-600 transition-colors p-1"
                      title={t('Delete Route')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mt-4 leading-tight">{route.name}</h3>
                  <p className="text-slate-500 text-[10px] font-mono mt-2 tracking-wide uppercase">ID: {route.routeId.substring(0, 8)}...</p>
                </div>
                <div className="border-t border-slate-50 mt-6 pt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">● {t('Live System Mapping')}</span>
                  <span className="text-[#2d6a4f] text-xs font-black tracking-widest uppercase flex items-center gap-1">
                    {route.code} Division
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Route Detail Drawer ────────────────────────────────────────────── */}
      {selectedRoute && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedRoute(null)} />
          {/* Drawer Panel */}
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-[#2d6a4f]" />
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Code: {selectedRoute.code}</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">{selectedRoute.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedRoute.routeId.substring(0, 12)}...</p>
              </div>
              <button onClick={() => setSelectedRoute(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw size={28} className="animate-spin text-slate-300" />
                  <p className="text-slate-400 text-sm font-semibold">Loading route assignments...</p>
                </div>
              ) : (
                <>
                  {/* Assigned Transport Agents */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <Car size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Transport Agents</h3>
                        <p className="text-[10px] text-slate-400">{routeAgents.length} assigned to this route</p>
                      </div>
                    </div>
                    {routeAgents.length === 0 ? (
                      <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                        <Car size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">No transport agents assigned to this route yet.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Go to User Management to assign agents.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {routeAgents.map(agent => (
                          <div key={agent.userId} className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-black text-blue-700">{agent.fullName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{agent.fullName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{agent.employeeId}</p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">TA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Suppliers */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Users size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Suppliers</h3>
                        <p className="text-[10px] text-slate-400">
                          {routeAgents.length === 0
                            ? 'Assign agents first to see suppliers'
                            : `Suppliers under ${routeAgents.length} agent(s) on this route`}
                        </p>
                      </div>
                    </div>
                    {routeAgents.length === 0 ? (
                      <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                        <UserCheck size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">No agents on this route — suppliers will appear once agents are assigned.</p>
                      </div>
                    ) : (
                      <>
                        {/* Per-agent supplier breakdown */}
                        {routeAgents.map(agent => {
                          const agentSuppliers = estateUsers.filter(u =>
                            (u.role === 'SH' || u.role === 'Supplier') &&
                            (u as any).inChargeId === agent.userId
                          );
                          return (
                            <div key={agent.userId} className="mb-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                <Car size={10} /> Under {agent.fullName}
                              </p>
                              {agentSuppliers.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                  <p className="text-[11px] text-slate-400">No suppliers assigned to this agent yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {agentSuppliers.map(sup => (
                                    <div key={sup.userId} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-black text-amber-700">{sup.name.charAt(0)}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{sup.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{sup.id}</p>
                                      </div>
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">SH</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all p-6">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Route className="text-[#2d6a4f]" size={20} /><span>{t('Define Collection Route')}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-950 uppercase mb-1">{t('Route Division Name')}</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800" value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="e.g. Bulugahapitiya Route" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-950 uppercase mb-1">{t('Route Prefix Code')}</label>
                <input required type="text" maxLength={5} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold text-slate-800" value={routeCode} onChange={e => setRouteCode(e.target.value)} placeholder="e.g. BG" />
                <p className="text-[10px] text-slate-500 mt-1 italic">{t('Unique 2-3 digit prefix code used for invoice headers & route matching.')}</p>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} /><span>{formError}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 font-bold text-slate-600 hover:text-slate-800" disabled={isSubmitting}>{t('Cancel')}</button>
                <button type="submit" className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors" disabled={isSubmitting}>{isSubmitting ? t('Saving...') : t('Create Route')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Inline Confirmation Dialog */}
      {confirmDialog && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="px-5 py-2 font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all">
                {t('Cancel')}
              </button>
              <button onClick={confirmDialog.onConfirm} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md">
                {t('Confirm')}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
