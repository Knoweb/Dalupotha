import { useState } from 'react'
import { Plus, ShieldCheck, ArrowLeft, ArrowRight, RefreshCw, Lock, User, Eye, EyeOff } from 'lucide-react'

interface LoginProps {
  onLogin: (role: 'manager' | 'super-admin') => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [estateForm, setEstateForm] = useState({ 
    name: '', 
    code: '',
    address: '',
    phone: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [coverPicture, setCoverPicture] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin') {
      onLogin('super-admin');
    } else {
      onLogin('manager');
    }
  };

  const handleRegisterEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estateForm.adminPassword !== confirmPassword) {
      alert('Passwords do not match.');
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
        setEstateForm({ name: '', code: '', address: '', phone: '', adminEmail: '', adminPassword: '' });
        setConfirmPassword('');
        setCoverPicture(null);
        alert('Estate onboarded successfully! Access cleared for management.');
      }
    } catch (err) {
      console.error(err);
      alert('Registration failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-white relative overflow-hidden">
      {!isRegistering ? (
        <div className="flex flex-col lg:flex-row h-screen">
          {/* Left Side: Cinematic Hero */}
          <div className="flex-1 relative h-[30vh] lg:h-screen overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 z-10" />
            <img 
              src="/login-bg.jpg" 
              alt="Dalupotha Estate Background" 
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* System Icon on Left Top */}
            <div className="absolute top-8 left-8 lg:top-10 lg:left-10 flex items-center gap-5 z-30">
               <div className="w-24 h-24 lg:w-32 lg:h-32 hover:scale-105 transition-transform duration-500 flex items-center justify-center rounded-full overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
               </div>
               <div className="text-white font-black leading-tight tracking-widest text-[28px] uppercase drop-shadow-lg">
                  දළුපොත<br />
                  <span className="text-[12px] tracking-[0.3em] font-bold text-green-300/90">Factory Digital Gateway</span>
               </div>
            </div>

            {/* Wavy Decorative Divider */}
            <div className="absolute top-0 right-0 h-full w-[120px] xl:w-[180px] pointer-events-none hidden lg:block z-20">
                <svg className="absolute inset-0 w-full h-full text-black/10 fill-current -translate-x-3 blur-md" viewBox="0 0 100 1000" preserveAspectRatio="none">
                   <path d="M100,0 L100,1000 L15,1000 C85,750 90,600 30,350 C10,200 60,80 0,0 Z" />
                </svg>
                <svg className="absolute inset-0 w-full h-full text-white fill-current" viewBox="0 0 100 1000" preserveAspectRatio="none">
                   <path d="M100,0 L100,1000 L15,1000 C85,750 90,600 30,350 C10,200 60,80 0,0 Z" />
                </svg>
            </div>
          </div>

          {/* Right Side: White Authentication Panel */}
          <div className="w-full lg:w-[400px] xl:w-[500px] flex flex-col shrink-0 p-8 sm:px-12 relative bg-white z-20 h-screen justify-center items-center">
            <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="w-full space-y-8 mt-[-8vh]">
                  <div className="text-center mb-10 relative mt-4">
                    {/* Welcome Art */}
                    <div className="flex justify-center -mb-12 relative z-10 pointer-events-none">
                      <img 
                        src="/welcome.png" 
                        alt="Welcome" 
                        className="w-72 sm:w-80 h-auto select-none mix-blend-multiply contrast-125 saturate-110 animate-in fade-in zoom-in-95 duration-1000"
                      />
                    </div>

                    <h2 className="text-3xl lg:text-[34px] font-black text-slate-900 uppercase tracking-tight relative z-20" style={{ fontFamily: 'Georgia, serif' }}>
                      Sign In
                    </h2>
                    <p className="text-[#3d7a2d] font-bold text-[10px] tracking-[0.4em] uppercase opacity-80 mt-2 relative z-20">
                      To Access The Portal
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    {/* Login Form Fields */}
                    <div className="group space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-5 block transition-colors group-focus-within:text-[#3d7a2d]">User Identifier</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                           <User className="text-slate-300 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                         </div>
                         <input 
                           type="email" 
                           placeholder="Enter your credential"
                           value={username}
                           onChange={e => setUsername(e.target.value)}
                           className="w-full bg-slate-50 border-2 border-transparent rounded-full px-14 py-4 focus:bg-white focus:border-[#3d7a2d] focus:ring-8 focus:ring-[#3d7a2d]/5 outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400 shadow-inner"
                           required
                         />
                      </div>
                    </div>

                    <div className="group space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-5 block transition-colors group-focus-within:text-[#3d7a2d]">Access Secret</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <Lock className="text-slate-300 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                         </div>
                         <input 
                           type={showPassword ? 'text' : 'password'} 
                           placeholder="••••••••"
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
                         <span>Identify & Portal</span>
                       </button>
                       
                       <div className="flex items-center gap-4 py-6">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Deployment Access</span>
                          <div className="h-px flex-1 bg-slate-100" />
                       </div>

                       <div className="text-center pb-2">
                          <p className="text-xs font-semibold text-slate-400">
                            New estate establishment?{' '}
                            <button 
                              type="button" 
                              onClick={() => { setIsRegistering(true); setRegStep(1); }}
                              className="text-[#3d7a2d] hover:text-[#2d6a4f] font-black tracking-wide transition-colors uppercase text-[11px] ml-1 hover:underline"
                            >
                              Register here
                            </button>
                          </p>
                       </div>

                       <div className="flex justify-between items-center px-2 pt-10 mt-6 border-t border-slate-50">
                          <button type="button" className="text-[9px] font-bold text-slate-300 uppercase tracking-widest hover:text-slate-600 transition-colors">Strategic Support</button>
                          <span className="text-[9px] font-medium text-slate-200 uppercase tracking-tighter italic">Dalupotha Terminal v1.2.4</span>
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
            <img 
              src="/login-bg.jpg" 
              alt="Background" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* System Icon for Registration Screen (Top Left) */}
          <div className="absolute top-8 left-8 lg:top-10 lg:left-10 flex items-center gap-5 z-[60]">
             <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-full overflow-hidden bg-white/10 backdrop-blur-md border border-white/20">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <div className="text-white font-black leading-tight tracking-widest text-[22px] uppercase drop-shadow-lg">
                දළුපොත
             </div>
          </div>

          <div className="w-full max-w-[680px] bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] z-20 overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 flex flex-col">
            {/* Header Sticky */}
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
                        <h2 className="text-3xl font-serif font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Onboarding</h2>
                        <p className="text-[10px] font-bold text-[#3d7a2d] uppercase tracking-[0.4em] mt-1 opacity-80">Phase {regStep} of 2</p>
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
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                          <div className="space-y-3 group md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">1. Official Estate Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Riverside Highlands Plantation"
                              value={estateForm.name}
                              onChange={e => setEstateForm({...estateForm, name: e.target.value})}
                              className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400"
                              required
                            />
                          </div>

                          <div className="space-y-3 group">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">2. Division Code</label>
                            <input 
                              type="text" 
                              placeholder="DIV-012"
                              value={estateForm.code}
                              onChange={e => setEstateForm({...estateForm, code: e.target.value})}
                              className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-mono font-semibold text-slate-800 uppercase tracking-widest placeholder:text-slate-400"
                              required
                            />
                          </div>

                          <div className="space-y-3 group">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">3. Contact Phone</label>
                            <input 
                              type="text" 
                              placeholder="+94 77 XXX XXXX"
                              value={estateForm.phone}
                              onChange={e => setEstateForm({...estateForm, phone: e.target.value})}
                              className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">4. Physical Address</label>
                          <textarea 
                            placeholder="Full physical location details"
                            value={estateForm.address}
                            onChange={e => setEstateForm({...estateForm, address: e.target.value})}
                            className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400 min-h-[80px] resize-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-6 flex justify-end">
                        <button 
                          type="button"
                          onClick={() => setRegStep(2)}
                          disabled={!estateForm.name || !estateForm.code}
                          className="bg-[#3d7a2d] hover:bg-[#2d6a4f] text-white px-10 py-4 rounded-full font-black text-xs tracking-[0.2em] transition-all shadow-lg active:scale-[0.98] flex items-center gap-3 uppercase disabled:opacity-20 disabled:grayscale"
                        >
                          <span>Next</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                        <div className="space-y-3 group md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">5. Master Admin Email</label>
                          <input 
                            type="email" 
                            placeholder="manager@estate.com"
                            value={estateForm.adminEmail}
                            onChange={e => setEstateForm({...estateForm, adminEmail: e.target.value})}
                            className="w-full bg-transparent border-b-2 border-slate-200 py-3 focus:border-[#3d7a2d] outline-none transition-all text-[15px] font-medium text-slate-800 placeholder:text-slate-400"
                            required
                          />
                        </div>

                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">6. Administrator Password</label>
                          <div className="relative">
                            <input 
                              type={showAdminPassword ? 'text' : 'password'} 
                              placeholder="••••••••"
                              value={estateForm.adminPassword}
                              onChange={e => setEstateForm({...estateForm, adminPassword: e.target.value})}
                              className="w-full bg-transparent border-b-2 border-slate-100 py-3 focus:border-[#3d7a2d] outline-none transition-all text-base font-bold text-slate-800"
                              required
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowAdminPassword(!showAdminPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#3d7a2d] transition-colors p-1"
                            >
                               {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 group">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block transition-colors group-focus-within:text-[#3d7a2d]">7. Confirm Password</label>
                          <div className="relative">
                            <input 
                              type={showConfirmPassword ? 'text' : 'password'} 
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className={`w-full bg-transparent border-b-2 py-3 outline-none transition-all text-base font-bold text-slate-800 ${
                                confirmPassword && estateForm.adminPassword !== confirmPassword 
                                  ? 'border-red-400' 
                                  : 'border-slate-100 focus:border-[#3d7a2d]'
                              }`}
                              required
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#3d7a2d] transition-colors p-1"
                            >
                               {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {confirmPassword && estateForm.adminPassword !== confirmPassword && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">Passwords do not match</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-10">
                         <button 
                           type="submit"
                           disabled={isSubmitting}
                           className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-sm tracking-[0.2em] transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98] flex items-center justify-center gap-3 uppercase"
                         >
                           {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                           <span>Confirm & Register</span>
                         </button>
                         <div className="mt-8 flex flex-col items-center">
                            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                               <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                               Secure Estate Initialization
                            </p>
                         </div>
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
