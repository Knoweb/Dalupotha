import { Plus, User, Search, MoreVertical, Edit2, ShieldAlert, X, Trash2, Save, LogOut, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthAPI, UserSummary, DetailedUser } from '../../services/api';
import { useLanguage } from '../../hooks/useLanguage';

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [addingRoleCategory, setAddingRoleCategory] = useState<string>('ST');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    username: '',
    email: '',
    contact: '',
    nic: '',
    birthdate: '',
    role: 'ST',
    estateId: '',
    password: '',
    confirmPassword: ''
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detailedUser, setDetailedUser] = useState<DetailedUser | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [estates, setEstates] = useState<{estateId:string, name:string}[]>([]);
  const [transportAgents, setTransportAgents] = useState<UserSummary[]>([]);

  const [taData, setTaData] = useState({
    fullName: '',
    employeeId: '',
    contact: '',
    pin: '',
    confirmPin: '',
    estateId: ''
  });

  const [shData, setShData] = useState({
    fullName: '',
    passbookNo: '',
    contact: '',
    pin: '',
    confirmPin: '',
    landName: '',
    inChargeId: '',
    estateId: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const estateId = sessionStorage.getItem('current_estate_id');
      console.log('Fetching users for estate:', estateId);
      const data = await AuthAPI.getUsers(estateId || undefined);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullRoleName = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'MG': return t('Manager');
      case 'EXT': return t('Extension Officer');
      case 'ST': return t('Office Staff');
      case 'SK': return t('Store Keeper');
      case 'FT': return t('Factory Staff');
      case 'TA': return t('Transport Agent');
      case 'SH': return t('Supplier');
      default: return role;
    }
  };

  useEffect(() => {
    fetchUsers();
    fetch('/api/auth/estates', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` } })
       .then(r => r.json())
       .then(setEstates).catch(console.error);
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const estateId = sessionStorage.getItem('current_estate_id') || '';
      await AuthAPI.createUser({ ...formData, estateId });
      closeModal();
      fetchUsers();
    } catch (err) {
      alert("Failed to create user. Ensure Employee ID is unique.");
    }
  };

  const handleCreateTA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taData.pin !== taData.confirmPin) {
      alert("PINs do not match!");
      return;
    }
    try {
      const estateId = taData.estateId || sessionStorage.getItem('current_estate_id');
      await AuthAPI.registerAgent({ ...taData, otpCode: 'MANUAL', estateId });
      closeModal();
      fetchUsers();
    } catch (err) {
      alert("Failed to create Transport Agent. Contact already exists.");
    }
  };

  const handleCreateSH = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shData.pin !== shData.confirmPin) {
      alert("PINs do not match!");
      return;
    }
    try {
      const estateId = shData.estateId || sessionStorage.getItem('current_estate_id');
      await AuthAPI.registerSmallHolder({ ...shData, otpCode: 'MANUAL', estateId });
      closeModal();
      fetchUsers();
    } catch (err) {
      alert(t("Failed to create Small Holder. Passbook No / Contact might exist."));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStep(1);
    setAddingRoleCategory('ST');
    setShowPin(false);
    setShowConfirmPin(false);
    setFormData({ fullName: '', employeeId: '', username: '', email: '', contact: '', nic: '', birthdate: '', role: 'ST', password: '', confirmPassword: '', estateId: '' });
    setTaData({ fullName: '', employeeId: '', contact: '', pin: '', confirmPin: '', estateId: '' });
    setShData({ fullName: '', passbookNo: '', contact: '', pin: '', confirmPin: '', landName: '', inChargeId: '', estateId: '' });
  };

  const handleViewProfile = async (userId: string) => {
    setIsActionLoading(true);
    try {
      const data = await AuthAPI.getDetailedUser(userId);
      setDetailedUser(data);
      setIsProfileModalOpen(true);
      // Load transport agents for this estate when viewing a supplier profile
      if (data.role === 'SH') {
        const estateId = data.estateId || sessionStorage.getItem('current_estate_id') || '';
        const allUsers = await AuthAPI.getUsers(estateId || undefined);
        setTransportAgents(allUsers.filter(u => u.role === 'TA' || getFullRoleName(u.role) === 'Transport Agent'));
      }
    } catch (err) {
      alert("Failed to fetch user details.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserSummary) => {
    const newStatus = (user.status === 'ACTIVE' || user.status === 'Active') ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} this user?`)) return;
    
    try {
      await AuthAPI.updateStatus(user.userId, newStatus);
      fetchUsers();
    } catch (err) {
       alert("Failed to update status.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to REMOVE this user from the system? This action cannot be undone.")) return;
    try {
       await AuthAPI.deleteUser(userId);
       setIsProfileModalOpen(false);
       fetchUsers();
    } catch (err) {
       alert("Failed to delete user.");
    }
  };

  const handleUpdateUser = async () => {
    if (!detailedUser) return;
    try {
       await AuthAPI.updateUser(detailedUser.userId, detailedUser);
       setIsEditing(false);
       handleViewProfile(detailedUser.userId);
       fetchUsers();
    } catch (err) {
       alert("Failed to update user.");
    }
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'ALL') return true;
    return getFullRoleName(user.role) === roleFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{t('User Management')}</h1>
           <p className="text-slate-950 text-sm">{t('Control system access and role assignments')}</p>
        </div>
        <div className="flex items-center gap-4">
           <select 
             className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#2d6a4f] shadow-sm"
             value={roleFilter}
             onChange={e => setRoleFilter(e.target.value)}
           >
              <option value="ALL">All Roles</option>
              <option value="Manager">Manager</option>
              <option value="Extension Officer">Extension Officer</option>
              <option value="Office Staff">Office Staff</option>
              <option value="Factory Staff">Factory Staff</option>
              <option value="Store Keeper">Store Keeper</option>
              <option value="Transport Agent">Transport Agent</option>
              <option value="Supplier">Supplier</option>
           </select>
           <button onClick={() => setIsModalOpen(true)} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold">
             <Plus size={18} />
             <span>Add User</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">{t('USER ID')}</th>
              <th className="px-8 py-4">{t('NAME')}</th>
              <th className="px-8 py-4 text-center">{t('ROLE')}</th>
              <th className="px-8 py-4 text-center">{t('STATUS')}</th>
              <th className="px-8 py-4">{t('LAST ACTIVE')}</th>
              <th className="px-8 py-4 text-right">{t('ACTIONS')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               <tr><td colSpan={6} className="text-center py-8 text-slate-900">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan={6} className="text-center py-8 text-slate-900">No users found.</td></tr>
            ) : filteredUsers.map((user, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5 font-mono text-xs font-bold text-slate-900">{user.id}</td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                         <User size={16} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{user.name}</span>
                   </div>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap ${
                     user.role === 'MG' || user.role === 'Manager' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                     user.role === 'TA' || user.role === 'Transport Agent' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                     user.role === 'ST' || user.role === 'Accountant' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                     'bg-orange-50 text-orange-600 border border-orange-200'
                   }`}>{getFullRoleName(user.role)}</span>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     user.status === 'ACTIVE' || user.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                   }`}>{user.status}</span>
                </td>
                <td className="px-8 py-5 text-slate-900 text-xs font-medium">{user.active}</td>
                 <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                     <button 
                      onClick={() => handleViewProfile(user.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">
                       <Edit2 size={12} />
                       {t('Profile')}
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-transparent transition-all ${
                         (user.status === 'ACTIVE' || user.status === 'Active') 
                         ? 'text-red-500 hover:bg-red-50 hover:border-red-100' 
                         : 'text-green-600 hover:bg-green-50 hover:border-green-100'
                      }`}>
                       <ShieldAlert size={12} />
                       {(user.status === 'ACTIVE' || user.status === 'Active') ? t('Deactivate') : t('Activate')}
                    </button>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && document.body && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {step === 1 && t("Select User Role")}
                {step === 2 && addingRoleCategory !== 'TA' && addingRoleCategory !== 'SH' && t("Create System User")}
                {step === 2 && addingRoleCategory === 'TA' && t("Create Transport Agent")}
                {step === 2 && addingRoleCategory === 'SH' && t("Create Supplier")}
              </h2>
              <button onClick={closeModal} className="text-slate-900 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto w-full">
              {step === 1 && (
                <div className="mb-2">
                   <label className="block text-sm font-bold text-slate-950 mb-3">{t('Please select the role you wish to create:')}</label>
                   <select 
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#2d6a4f] shadow-sm mb-6"
                      value={addingRoleCategory} 
                      onChange={e => {
                        const val = e.target.value;
                        setAddingRoleCategory(val);
                        if (val !== 'TA' && val !== 'SH') {
                            setFormData({...formData, role: val});
                        }
                      }}>
                      <option value="MG">{t('Manager')}</option>
                      <option value="EXT">{t('Extension Officer')}</option>
                      <option value="ST">{t('Office Staff')}</option>
                      <option value="FT">{t('Factory Staff')}</option>
                      <option value="SK">{t('Store Keeper')}</option>
                      <option value="TA">{t('Transport Agent')}</option>
                      <option value="SH">{t('Supplier (Small Holder)')}</option>
                   </select>

                   <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                      <button type="button" onClick={closeModal} className="px-5 py-2 font-bold text-slate-950 hover:text-slate-700">{t('Cancel')}</button>
                      <button type="button" onClick={() => setStep(2)} className="bg-[#2d6a4f] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#1b4332] shadow-md transition-colors">{t('Next')}</button>
                   </div>
                </div>
              )}

              {step === 2 && addingRoleCategory !== 'TA' && addingRoleCategory !== 'SH' && (
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Full Name</label>
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. Ruwan Perera" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Employee ID</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} placeholder="e.g. FT-001" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Username</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="e.g. ruwan.p" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Email Address</label>
                      <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="employee@dalupotha.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Contact Number</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="07XXXXXXXX" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">NIC Number</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} placeholder="e.g. 199012345678" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Date of Birth</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Initial Password</label>
                      <div className="relative">
                        <input required type={showPin ? "text" : "password"} minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Confirm Password</label>
                      <div className="relative">
                        <input required type={showConfirmPin ? "text" : "password"} minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-red-500 text-xs font-bold">Passwords do not match</p>
                  )}
                  <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-5 py-2 font-bold text-slate-950 hover:text-slate-700">{t('Back')}</button>
                    <button type="submit" className="bg-[#2d6a4f] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#1b4332] shadow-md transition-colors">{t('Create Staff')}</button>
                  </div>
                </form>
              )}

              {step === 2 && addingRoleCategory === 'TA' && (
                <form onSubmit={handleCreateTA} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Full Name</label>
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={taData.fullName} onChange={e => setTaData({...taData, fullName: e.target.value})} placeholder="e.g. TA Kumara" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Agent ID</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={taData.employeeId} onChange={e => setTaData({...taData, employeeId: e.target.value})} placeholder="e.g. TA-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Contact Number</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none font-medium" value={taData.contact} onChange={e => setTaData({...taData, contact: e.target.value})} placeholder="07XXXXXXXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-950 uppercase mb-1">{t('Estate Processing Hub')}</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none font-medium text-slate-700" value={taData.estateId} onChange={e => setTaData({...taData, estateId: e.target.value})}>
                       <option value="">{t('Global / Master TA')}</option>
                       {estates.map(es => <option key={es.estateId} value={es.estateId}>{es.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Create PIN <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input required type={showPin ? "text" : "password"} minLength={4} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={taData.pin} onChange={e => setTaData({...taData, pin: e.target.value})} placeholder="4-digit PIN" />
                        <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Confirm PIN <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input required type={showConfirmPin ? "text" : "password"} minLength={4} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={taData.confirmPin} onChange={e => setTaData({...taData, confirmPin: e.target.value})} placeholder="Re-enter PIN" />
                        <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {taData.pin && taData.confirmPin && taData.pin !== taData.confirmPin && (
                    <p className="text-red-500 text-xs font-bold mt-1">PINs do not match</p>
                  )}
                  <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-5 py-2 font-bold text-slate-950 hover:text-slate-700">{t('Back')}</button>
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors">{t('Create TA')}</button>
                  </div>
                </form>
              )}

              {step === 2 && addingRoleCategory === 'SH' && (
                <form onSubmit={handleCreateSH} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Full Name</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={shData.fullName} onChange={e => setShData({...shData, fullName: e.target.value})} placeholder="e.g. Bandara" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Passbook No</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={shData.passbookNo} onChange={e => setShData({...shData, passbookNo: e.target.value})} placeholder="e.g. B-001" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Contact Number</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={shData.contact} onChange={e => setShData({...shData, contact: e.target.value})} placeholder="07XXXXXXXX" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Land Name (Optional)</label>
                       <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none" value={shData.landName} onChange={e => setShData({...shData, landName: e.target.value})} placeholder="Green View Land" />
                    </div>
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Field In-Charge (TA) <span className="text-red-500">*</span></label>
                     <select required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none font-medium text-slate-700" value={shData.inChargeId} onChange={e => setShData({...shData, inChargeId: e.target.value})}>
                        <option value="">Select Transport Agent...</option>
                        {users.filter(u => getFullRoleName(u.role) === 'Transport Agent').map(ta => (
                           <option key={ta.userId} value={ta.userId}>{ta.name} ({ta.id})</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Create Login PIN <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input required type={showPin ? "text" : "password"} minLength={4} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={shData.pin} onChange={e => setShData({...shData, pin: e.target.value})} placeholder="4-digit PIN" />
                        <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-950 uppercase mb-1">Confirm PIN <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input required type={showConfirmPin ? "text" : "password"} minLength={4} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm outline-none" value={shData.confirmPin} onChange={e => setShData({...shData, confirmPin: e.target.value})} placeholder="Re-enter PIN" />
                        <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-600">
                           {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {shData.pin && shData.confirmPin && shData.pin !== shData.confirmPin && (
                    <p className="text-red-500 text-xs font-bold mt-1">PINs do not match</p>
                  )}
                  <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-5 py-2 font-bold text-slate-950 hover:text-slate-700">{t('Back')}</button>
                    <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 shadow-md transition-colors">{t('Create Supplier')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>, document.body)}
      {isProfileModalOpen && detailedUser && document.body && createPortal(
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] p-8">
               <button onClick={() => { setIsProfileModalOpen(false); setIsEditing(false); }} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors">
                 <X size={24} />
               </button>
               <div className="absolute -bottom-12 left-10 w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-900">
                    <User size={48} />
                  </div>
               </div>
            </div>

            {/* Profile Content */}
            <div className="pt-16 px-10 pb-10 overflow-y-auto w-full">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{detailedUser.name}</h2>
                    <p className="text-slate-950 font-bold">{getFullRoleName(detailedUser.role)} • {detailedUser.id}</p>
                    <div className="mt-2 flex items-center gap-2">
                       <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          (detailedUser.status === 'ACTIVE' || detailedUser.status === 'Active') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>{detailedUser.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                       <>
                         <button 
                           onClick={() => setIsEditing(true)}
                           className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-all">
                            <Edit2 size={16} />
                            <span>{t('Edit Profile')}</span>
                         </button>
                         <button 
                           onClick={() => handleDeleteUser(detailedUser.userId)}
                           className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold transition-all">
                            <Trash2 size={16} />
                            <span>{t('Remove User')}</span>
                         </button>
                       </>
                    ) : (
                       <button 
                         onClick={handleUpdateUser}
                         className="flex items-center gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg">
                          <Save size={16} />
                          <span>{t('Save Changes')}</span>
                       </button>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('Contact Information')}</h3>
                     <div className="space-y-3">
                        <div>
                           <label className="text-xs font-bold text-slate-900">{t('Full Name')}</label>
                           {isEditing ? (
                              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.name} onChange={e => setDetailedUser({...detailedUser, name: e.target.value})} />
                           ) : (
                              <p className="text-sm font-bold text-slate-700">{detailedUser.name}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-900">{t('Phone Number')}</label>
                           {isEditing ? (
                              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.contact} onChange={e => setDetailedUser({...detailedUser, contact: e.target.value})} />
                           ) : (
                              <p className="text-sm font-bold text-slate-700">{detailedUser.contact}</p>
                           )}
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-900">{t('Email Address')}</label>
                           {isEditing ? (
                              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.email} onChange={e => setDetailedUser({...detailedUser, email: e.target.value})} />
                           ) : (
                              <p className="text-sm font-bold text-slate-700">{detailedUser.email || 'N/A'}</p>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('System Metadata')}</h3>
                     <div className="space-y-3">
                        <div>
                           <label className="text-xs font-bold text-slate-900">{t('Current Estate')}</label>
                           {isEditing ? (
                              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.estateId || ''} onChange={e => setDetailedUser({...detailedUser, estateId: e.target.value})}>
                                 <option value="">Global (No Estate)</option>
                                 {estates.map(es => <option key={es.estateId} value={es.estateId}>{es.name}</option>)}
                              </select>
                           ) : (
                              <p className="text-sm font-bold text-slate-700">{detailedUser.estateName || 'Not Assigned'}</p>
                           )}
                        </div>
                        {detailedUser.role === 'SH' && (
                           <>
                              <div>
                                 <label className="text-xs font-bold text-slate-900">Passbook No</label>
                                 <p className="text-sm font-bold text-slate-700">{detailedUser.passbookNo}</p>
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-slate-900">Assigned Transport Agent</label>
                                 {isEditing ? (
                                   <select
                                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                                     value={detailedUser.inChargeId || ''}
                                     onChange={e => setDetailedUser({ ...detailedUser, inChargeId: e.target.value })}
                                   >
                                     <option value="">— {t('Not Assigned')} —</option>
                                     {transportAgents.map(ta => (
                                       <option key={ta.userId} value={ta.userId}>
                                         {ta.name} ({ta.id})
                                       </option>
                                     ))}
                                   </select>
                                 ) : (
                                   <p className="text-sm font-bold text-slate-700">{detailedUser.inChargeName || t('Not Appointed')}</p>
                                 )}
                              </div>
                           </>
                        )}
                     </div>
                  </div>
               </div>

               {detailedUser.role === 'SH' && (
                  <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8">
                     <div>
                        <label className="text-xs font-bold text-slate-900">{t('Land Name')}</label>
                        {isEditing ? (
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.landName} onChange={e => setDetailedUser({...detailedUser, landName: e.target.value})} />
                        ) : (
                           <p className="text-sm font-bold text-slate-700">{detailedUser.landName}</p>
                        )}
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-900">{t('Total Arcs')}</label>
                        {isEditing ? (
                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#2d6a4f]" value={detailedUser.arcs} onChange={e => setDetailedUser({...detailedUser, arcs: Number(e.target.value)})} />
                        ) : (
                           <p className="text-sm font-bold text-slate-700">{detailedUser.arcs} {t('Arcs')}</p>
                        )}
                     </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
