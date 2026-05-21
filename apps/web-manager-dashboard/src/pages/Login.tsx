import { useState } from 'react'
import { Plus, ShieldCheck, ArrowLeft, ArrowRight, RefreshCw, Lock, User, Eye, EyeOff, Smartphone } from 'lucide-react'

import { UserRole } from '../App'
import { useLanguage } from '../hooks/useLanguage'


interface LoginProps {
  onLogin: (data: { role: UserRole, fullName: string, estateName: string, estateId?: string, employeeId?: string }) => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState(''); // This will be employeeId
  const [password, setPassword] = useState(''); // This will be PIN
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [estateForm, setEstateForm] = useState({ 
    name: '', 
    code: '',
    address: '',
    phone: '',
    managerName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [coverPicture, setCoverPicture] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { lang, setLang, t } = useLanguage();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (username === 'admin' && password === 'admin') {
         onLogin({ role: 'super-admin', fullName: 'System Admin', estateName: 'Dalupotha Central' });
         return;
      }
      // Demo role shortcuts (for testing)
      if (username === 'mg' && password === '1234') { onLogin({ role: 'manager', fullName: 'A. Wickramasinghe', estateName: 'Weliwita Estate', estateId: '76797998-e7a9-43ad-a366-04c2cc65d9f7', employeeId: 'MG-001' }); return; }
      if (username === 'ext' && password === '1234') { onLogin({ role: 'extension-officer', fullName: 'S. Rathnayake', estateName: 'Weliwita Estate', estateId: '76797998-e7a9-43ad-a366-04c2cc65d9f7', employeeId: 'EXT-001' }); return; }
      if (username === 'st' && password === '1234') { onLogin({ role: 'office-staff', fullName: 'P. Kumari', estateName: 'Weliwita Estate', estateId: '76797998-e7a9-43ad-a366-04c2cc65d9f7', employeeId: 'ST-001' }); return; }
      if (username === 'sk' && password === '1234') { onLogin({ role: 'store-keeper', fullName: 'R. Jayasinghe', estateName: 'Weliwita Estate', estateId: '76797998-e7a9-43ad-a366-04c2cc65d9f7', employeeId: 'SK-001' }); return; }
      if (username === 'ft' && password === '1234') { onLogin({ role: 'factory-staff', fullName: 'N. Perera', estateName: 'Weliwita Estate', estateId: '76797998-e7a9-43ad-a366-04c2cc65d9f7', employeeId: 'FT-001' }); return; }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: username, password: password })
      });

      const roleMap: Record<string, string> = {
        'mg': 'manager',
        'ext': 'extension-officer',
        'st': 'office-staff',
        'sk': 'store-keeper',
        'ft': 'factory-staff',
        'ta': 'manager', // TA logs in via mobile app, fallback
        'sh': 'manager', // SH logs in via mobile app, fallback
      };

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("current_user_id", data.userId || data.id || "");
        sessionStorage.setItem("current_estate_id", data.estateId || "");
        sessionStorage.setItem("estate_id", data.estateId || "");
        if (data.token) sessionStorage.setItem("auth_token", data.token);
        const mappedRole = roleMap[data.role?.toLowerCase()] || data.role?.toLowerCase();
        onLogin({ role: mappedRole as UserRole, fullName: data.fullName, estateName: data.estateName || '', estateId: data.estateId, employeeId: data.employeeId });
      } else {
        const err = await res.json();
        alert(err.message || t('Login failed. Please check your credentials.'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to reach auth gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estateForm.adminPassword !== confirmPassword) {
      alert(t('Passwords do not match.'));
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/estates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estateForm)
      });
      if (res.ok) {
        setIsRegistering(false);
        setRegStep(1);
        setEstateForm({ name: '', code: '', address: '', phone: '', managerName: '', adminEmail: '', adminPassword: '' });
        setConfirmPassword('');
        setCoverPicture(null);
        alert(t('Estate onboarded successfully! Access cleared for management.'));
      }
    } catch (err) {
      console.error(err);
      alert(t('Registration failed. Please check your connection.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-white relative overflow-hidden">
      {!isRegistering ? (
        <div className="flex flex-col lg:flex-row h-screen">
          <div className="flex-1 relative h-[30vh] lg:h-screen overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 z-10" />
            <img 
              src="/login-bg.jpg" 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-8 left-8 lg:top-10 lg:left-10 flex items-center gap-5 z-30">
               <div className="w-24 h-24 lg:w-32 lg:h-32 hover:scale-105 transition-transform duration-500 flex items-center justify-center rounded-full overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
               </div>
               <div className="text-white font-black leading-tight tracking-widest text-[28px] uppercase drop-shadow-lg">
                  දළුපොත<br />
                  <span className="text-[12px] tracking-[0.3em] font-bold text-green-300/90">Factory Digital Gateway</span>
               </div>
            </div>
            <div className="absolute top-0 right-0 h-full w-[120px] xl:w-[180px] pointer-events-none hidden lg:block z-20">
                <svg className="absolute inset-0 w-full h-full text-black/10 fill-current -translate-x-3 blur-md" viewBox="0 0 100 1000" preserveAspectRatio="none">
                   <path d="M100,0 L100,1000 L15,1000 C85,750 90,600 30,350 C10,200 60,80 0,0 Z" />
                </svg>
                <svg className="absolute inset-0 w-full h-full text-white fill-current" viewBox="0 0 100 1000" preserveAspectRatio="none">
                   <path d="M100,0 L100,1000 L15,1000 C85,750 90,600 30,350 C10,200 60,80 0,0 Z" />
                </svg>
            </div>
          </div>

          <div className="w-full lg:w-[400px] xl:w-[500px] flex flex-col shrink-0 p-8 sm:px-12 relative bg-white z-20 h-screen justify-center items-center">
            {/* Bottom-Left Minimalist Capsule Mobile App Download Button */}
            <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <a 
                 href="/dalupotha.apk"
                 target="_blank"
                 rel="noopener noreferrer"
                 title={lang === 'si' ? 'ජංගම යෙදුම බාගත කරන්න' : 'Download Mobile App'}
                 className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-3 py-1.5 rounded-full hover:bg-slate-50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] active:scale-95 group"
               >
                 <div className="w-7 h-7 rounded-full bg-[#3d7a2d] hover:bg-[#2d6a4f] text-white flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 shrink-0">
                   <Smartphone className="w-4 h-4 text-white" />
                 </div>
                 <div className="flex flex-col pr-1 text-left">
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                     {lang === 'si' ? 'ජංගම ඇප් එක' : 'Mobile App'}
                   </span>
                   <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider mt-0.5 leading-none">
                     {lang === 'si' ? 'බාගන්න' : 'Download'}
                   </span>
                 </div>
               </a>
            </div>
            {/* High-Visibility Premium 2-Way Language Switcher */}
            <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-[100] animate-in fade-in slide-in-from-top-4 duration-1000">
              <div className="bg-white/80 backdrop-blur-md p-0.5 rounded-full border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center relative w-[120px] h-[28px]">
                {/* Sliding Indicator */}
                <div 
                  className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-[#3d7a2d] rounded-full shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${lang === 'si' ? 'left-[calc(50%+1px)]' : 'left-0.5'}`}
                />
                
                <button 
                  onClick={() => setLang('en')}
                  type="button"
                  className={`relative flex-1 text-[8px] font-black tracking-[0.1em] transition-colors duration-500 z-10 ${lang === 'en' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLang('si')}
                  type="button"
                  className={`relative flex-1 text-[11px] font-black tracking-[0.1em] transition-colors duration-500 z-10 ${lang === 'si' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  සිංහල
                </button>
              </div>
            </div>

            <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="w-full space-y-8 mt-[-8vh]">
                   <div className="text-center mb-10 relative mt-4">
                    <div className="flex justify-center -mb-12 relative z-10 pointer-events-none">
                      <img 
                        src="/welcome.png" 
                        alt="Welcome" 
                        className="w-72 sm:w-80 h-auto select-none mix-blend-multiply contrast-125 saturate-110 animate-in fade-in zoom-in-95 duration-1000"
                      />
                    </div>
                    <h2 className="text-3xl lg:text-[34px] font-black text-slate-900 uppercase tracking-tight relative z-20" style={{ fontFamily: 'Georgia, serif' }}>
                      {t('Sign In')}
                    </h2>
                    <p className="text-[#3d7a2d] font-bold text-[10px] tracking-[0.4em] uppercase opacity-80 mt-2 relative z-20">
                      {t('To Access The Portal')}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="group space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-5 block transition-colors group-focus-within:text-[#3d7a2d]">{t('Username or Email')}</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                           <User className="text-slate-300 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                         </div>
                         <input 
                           type="text" 
                           placeholder={t('Enter username or email')}
                           value={username}
                           onChange={e => setUsername(e.target.value)}
                           className="w-full bg-slate-50 border-2 border-transparent rounded-full px-14 py-4 focus:bg-white focus:border-[#3d7a2d] focus:ring-8 focus:ring-[#3d7a2d]/5 outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400 shadow-inner"
                           required
                         />
                      </div>
                    </div>

                    <div className="group space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-5 block transition-colors group-focus-within:text-[#3d7a2d]">{t('Password')}</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <Lock className="text-slate-300 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                         </div>
                         <input 
                           type={showPassword ? 'text' : 'password'} 
                           placeholder="••••"
                           
                           value={password}
                           onChange={e => setPassword(e.target.value)}
                           className="w-full bg-slate-50 border-2 border-transparent rounded-full px-14 py-4 focus:bg-white focus:border-[#3d7a2d] focus:ring-8 focus:ring-[#3d7a2d]/5 outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400 shadow-inner"
                           required
                         />
                         <button 
                           type="button" 
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#3d7a2d] transition-colors p-1"
                         >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                      </div>
                    </div>

                    <div className="pt-6">
                       <button 
                         type="submit"
                         disabled={isSubmitting}
                         className="w-full bg-[#1bc36f] hover:bg-[#15a35c] text-white py-5 rounded-full font-black text-[15px] tracking-[0.1em] transition-all shadow-xl shadow-green-900/20 active:scale-[0.98] flex items-center justify-center gap-3 uppercase"
                       >
                         {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={22} />}
                         <span>{t('Login')}</span>
                       </button>
                       
                       <div className="flex items-center gap-4 py-6">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">{t('Deployment Access')}</span>
                          <div className="h-px flex-1 bg-slate-100" />
                       </div>

                       <div className="text-center pb-2">
                          <p className="text-xs font-semibold text-slate-400">
                             {t('New estate establishment?')}{' '}
                            <button 
                              type="button" 
                              onClick={() => { setIsRegistering(true); setRegStep(1); }}
                              className="text-[#3d7a2d] hover:text-[#2d6a4f] font-black tracking-wide transition-colors uppercase text-[11px] ml-1 hover:underline"
                            >
                               {t('Register here')}
                            </button>
                          </p>
                       </div>

                        <div className="flex flex-col items-center gap-2 py-6">
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                             © {new Date().getFullYear()} Knoweb(pvt) Ltd. All rights reserved.
                           </p>
                        </div>
                    </div>
                  </form>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12 z-50">
          <div className="absolute inset-0 z-0 scale-105 blur-sm">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />
            <img  src="/login-bg.jpg" alt="Background" className="w-full h-full object-cover" />
          </div>

          <div className="w-full max-w-[680px] bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] z-20 overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 flex flex-col">
            <div className="p-8 sm:p-12 pb-4 border-b border-slate-50">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => regStep === 1 ? setIsRegistering(false) : setRegStep(1)}
                        className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all border border-slate-100"
                      >
                         <ArrowLeft size={20} />
                      </button>
                      <div className="flex flex-col items-center">
                        <svg className="w-48 h-auto opacity-70 mb-1 text-[#3d7a2d]" viewBox="0 0 300 40" fill="currentColor">
                           <path d="M50 20 Q 150 5 250 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h2 className="text-3xl font-serif font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>{t('Onboarding')}</h2>
                        <p className="text-[10px] font-bold text-[#3d7a2d] uppercase tracking-[0.4em] mt-1 opacity-80">{t('Phase')} {regStep} {t('of')} 2</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-1.5">
                       <div className={`w-8 h-1 rounded-full transition-all duration-700 ${regStep >= 1 ? 'bg-[#3d7a2d]' : 'bg-slate-100'}`} />
                       <div className={`w-8 h-1 rounded-full transition-all duration-700 ${regStep >= 2 ? 'bg-[#3d7a2d]' : 'bg-slate-100'}`} />
                   </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto styled-scrollbar p-8 sm:p-12 pt-6">
                <form onSubmit={handleRegisterEstate} className="space-y-10 text-left">
                  {regStep === 1 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                          <div className="space-y-3 group md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('1. Estate Name')}</label>
                            <input type="text" placeholder="e.g. Riverside Highlands" value={estateForm.name} onChange={e => setEstateForm({...estateForm, name: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium text-slate-800" required />
                          </div>
                          <div className="space-y-3 group">
                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('2. Manager Full Name')}</label>
                             <input type="text" placeholder="A. Wickramasinghe" value={estateForm.managerName} onChange={e => setEstateForm({...estateForm, managerName: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium" required />
                          </div>
                          <div className="space-y-3 group">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('3. Contact Phone')}</label>
                            <input type="text" placeholder="+94 77 XXX XXXX" value={estateForm.phone} onChange={e => setEstateForm({...estateForm, phone: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium" required />
                          </div>
                        </div>
                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('4. Physical Address')}</label>
                          <textarea placeholder="Location details" value={estateForm.address} onChange={e => setEstateForm({...estateForm, address: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] min-h-[80px] resize-none" required />
                        </div>
                      <div className="pt-6 flex justify-end">
                        <button type="button" onClick={() => setRegStep(2)} disabled={!estateForm.name || !estateForm.managerName} className="bg-[#3d7a2d] hover:bg-[#2d6a4f] text-white px-10 py-4 rounded-full font-black text-xs tracking-[0.2em] transition-all flex items-center gap-3 uppercase disabled:opacity-20">
                          <span>{t('Next')}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                        <div className="space-y-3 group md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('5. Master Admin Email')}</label>
                          <input type="email" placeholder="manager@estate.com" value={estateForm.adminEmail} onChange={e => setEstateForm({...estateForm, adminEmail: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px]" required />
                        </div>
                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('6. Administrator Password')}</label>
                          <div className="relative">
                            <input type={showAdminPassword ? 'text' : 'password'} placeholder="••••••••" value={estateForm.adminPassword} onChange={e => setEstateForm({...estateForm, adminPassword: e.target.value})} className="w-full bg-transparent border-b-2 border-slate-100 py-3 focus:border-[#3d7a2d] outline-none text-base font-bold" required />
                            <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#3d7a2d] p-1">
                               {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">{t('7. Confirm Password')}</label>
                          <div className="relative">
                            <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full bg-transparent border-b-2 py-3 outline-none text-base font-bold ${confirmPassword && estateForm.adminPassword !== confirmPassword ? 'border-red-400' : 'border-slate-100 focus:border-[#3d7a2d]'}`} required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#3d7a2d] p-1">
                               {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="pt-10">
                         <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-sm tracking-[0.2em] transition-all flex items-center justify-center gap-3 uppercase">
                           {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                           <span>{t('Confirm & Register')}</span>
                         </button>
                      </div>
                    </div>
                  )}
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

