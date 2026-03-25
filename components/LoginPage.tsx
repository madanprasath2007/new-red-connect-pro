import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplet, Mail, Lock, ChevronRight, User, Building2, Landmark, 
  ShieldCheck, ArrowLeft, AlertCircle, Loader2, Sparkles, Eye, 
  EyeOff, Shield, Zap, Clock, RefreshCw, CheckCircle2, UserPlus 
} from 'lucide-react';
import { UserRole, AuthenticatedUser } from '../services/types';
import { backendService } from '../services/backendService';
import InstitutionalRegistrationForm from './InstitutionalRegistrationForm';
import DonorRegistrationForm from './DonorRegistrationForm';
import OtpInput from './OtpInput';
import MailInterceptor from './MailInterceptor';

interface LoginPageProps {
  onLogin: (user: AuthenticatedUser) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register-bank' | 'register-hospital' | 'register-donor'>('login');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [role, setRole] = useState<UserRole>('Donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // OTP Timer State
  const [timeLeft, setTimeLeft] = useState(120);
  const [maxTime, setMaxTime] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (duration: number = 120) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    setMaxTime(duration);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await backendService.authenticate(email, password, role);
      if (!user) {
        setError(`Identity Mismatch: Check credentials for ${role} profile.`);
        setIsLoading(false);
        return;
      }

      const res = await backendService.requestOtp(email);
      if (res.success) {
        setStep('otp');
        const duration = email === '24cc024@nandhaengg.org' ? 10 : 120;
        startTimer(duration);
      } else {
        setError(res.message || "Relay gateway busy.");
      }
    } catch (err) {
      setError("Secure handshake failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await backendService.requestOtp(email);
      if (res.success) {
        const duration = email === '24cc024@nandhaengg.org' ? 10 : 120;
        startTimer(duration);
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("Resend aborted.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otp: string) => {
    if (timeLeft === 0) {
      setError("Handshake Timeout: Token expired.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await backendService.verifyOtp(email, otp);
      if (res.success) {
        const authenticatedUser = await backendService.authenticate(email, password, role);
        if (authenticatedUser) onLogin(authenticatedUser);
      } else {
        setError(res.message || "Sequence validation failed.");
      }
    } catch (err) {
      setError("Verification node unreachable.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demo: { email: string; pass: string; role: UserRole }) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setRole(demo.role);
    setShowDemo(false);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return maxTime <= 10 ? `${secs}s` : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const demoAccounts = [
    { label: 'Nandha Engineering (10s Fast)', email: '24cc024@nandhaengg.org', pass: 'Madan@2007..', role: 'BloodBank' as UserRole },
    { label: 'Donor: Arjun (O-)', email: 'arjun@donor.com', pass: 'password123', role: 'Donor' as UserRole },
    { label: 'Blood Bank: IRT', email: 'irt@tnhealth.gov.in', pass: 'irt123', role: 'BloodBank' as UserRole },
    { label: 'Hospital: Metro ER', email: 'er@metrolife.com', pass: 'hosp123', role: 'Hospital' as UserRole },
  ];

  const RoleButton = ({ r, title, sub, icon: Icon }: { r: UserRole, title: string, sub: string, icon: any }) => (
    <button
      type="button"
      onClick={() => { setRole(r); setError(null); }}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group ${
        role === r 
          ? 'bg-white border-red-600 shadow-md ring-1 ring-red-600/10' 
          : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
        role === r ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className={`text-xs font-black uppercase tracking-widest ${role === r ? 'text-slate-900' : 'text-slate-600'}`}>{title}</h4>
        <p className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 ${role === r ? 'text-slate-400' : 'text-slate-300'}`}>{sub}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <MailInterceptor />
      
      <div className="w-full max-w-[1200px] min-h-[750px] grid md:grid-cols-2 bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden relative border border-slate-100">
        
        <div className="hidden md:flex flex-col justify-between p-16 bg-[#0f172a] text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/40">
                <Droplet className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight uppercase">RED CONNECT<span className="text-red-500">PRO</span></h1>
            </div>
            
            <div className="space-y-10">
              <h2 className="text-5xl font-black leading-tight tracking-tight max-w-sm">
                Elite <span className="text-red-500 underline decoration-red-500 underline-offset-[12px] decoration-[3px]">Bio-Link</span> Authentication.
              </h2>
              <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xs">
                Personalized SMTP Relay enabled for `madanprasath2007@gmail.com`.
              </p>
              
              <div className="space-y-5 pt-4">
                {[
                  { text: 'Fast Relay Protocol: Active', icon: Zap },
                  { text: '10s Tactical Window', icon: Clock },
                  { text: 'SMTP Master Identity Linked', icon: ShieldCheck }
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <f.icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-12">
            <button 
              onClick={() => setShowDemo(!showDemo)} 
              className="text-indigo-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:text-indigo-300 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> SECURE HANDSHAKE KEYS
            </button>
            {showDemo && (
              <div className="mt-4 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {demoAccounts.map(demo => (
                  <button key={demo.label} onClick={() => fillDemo(demo)} className="text-left px-4 py-2 bg-white/5 rounded-xl text-[9px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5">{demo.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 sm:p-16 flex flex-col justify-center bg-white overflow-y-auto max-h-[95vh] scrollbar-hide">
          {view === 'login' ? (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              {step === 'credentials' ? (
                <div className="space-y-10">
                  <div className="space-y-3">
                    <RoleButton r="Donor" title="Blood Donor" sub="Donate blood or track recovery" icon={User} />
                    <RoleButton r="BloodBank" title="Blood Bank" sub="Nandha Engineering Node" icon={Landmark} />
                    <RoleButton r="Hospital" title="Hospital" sub="Post urgent medical cases" icon={Building2} />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
                      <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleInitialSubmit} className="space-y-6">
                    <div className="space-y-5">
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Institutional Identity</label>
                        <div className="relative">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input type="email" required placeholder="24cc024@nandhaengg.org" className="w-full pl-14 pr-6 py-5 bg-[#f8fafc] border-2 border-slate-50 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all font-bold text-slate-800 text-sm" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Access Token</label>
                        <div className="relative">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input type={showPass ? "text" : "password"} required placeholder="••••••••" className="w-full pl-14 pr-14 py-5 bg-[#f8fafc] border-2 border-slate-50 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all font-bold text-slate-800 text-sm" value={password} onChange={e => setPassword(e.target.value)} />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[#0f172a] text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>GENERATE SECURE OTP <ChevronRight className="w-4 h-4" /></>}</button>
                  </form>

                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="space-y-4">
                      <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">NEW MEDICAL PROFESSIONAL REGISTRY</p>
                      
                      <button 
                        onClick={() => setView('register-donor')} 
                        className="w-full flex items-center justify-center gap-3 px-4 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 group"
                      >
                        <UserPlus className="w-4 h-4 group-hover:scale-125 transition-transform" /> Become a Verified Donor
                      </button>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setView('register-bank')} 
                          className="flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-red-600 transition-all group"
                        >
                          <Landmark className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Register Bank</span>
                        </button>
                        <button 
                          onClick={() => setView('register-hospital')} 
                          className="flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-red-600 transition-all group"
                        >
                          <Building2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Register Hospital</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-12 animate-in zoom-in-95 duration-500 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-10">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <svg className="absolute inset-0 transform -rotate-90 w-24 h-24">
                      <circle
                        className={`transition-all duration-1000 ${timeLeft < (maxTime/3) ? 'text-red-500' : 'text-indigo-600'}`}
                        strokeWidth="4"
                        strokeDasharray={220}
                        strokeDashoffset={220 - (220 * timeLeft) / maxTime}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="35"
                        cx="48"
                        cy="48"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Clock className={`w-5 h-5 mb-1 ${timeLeft < (maxTime/3) ? 'text-red-500' : 'text-slate-400'}`} />
                      <span className={`text-xs font-black ${timeLeft < (maxTime/3) ? 'text-red-500' : 'text-slate-900'}`}>{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Security Handshake</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                      {maxTime <= 10 ? 'FAST TACTICAL RELAY' : 'SMTP HUB RELAY'} TO {email}
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest animate-in shake">
                      <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <OtpInput onComplete={handleOtpComplete} disabled={isLoading || timeLeft === 0} />
                  
                  <div className="flex flex-col gap-6 pt-4">
                    <button 
                      onClick={handleResendOtp}
                      disabled={!canResend || isLoading}
                      className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 mx-auto ${canResend ? 'text-red-600 hover:text-red-700' : 'text-slate-300 cursor-not-allowed'}`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> RE-INITIATE TACTICAL TOKEN
                    </button>
                    
                    <button onClick={() => setStep('credentials')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-2 mx-auto">
                      <ArrowLeft className="w-4 h-4" /> ABORT HANDSHAKE
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                <button onClick={() => setView('login')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-600 uppercase tracking-[0.2em] transition-colors mb-8">
                  <ArrowLeft className="w-4 h-4" /> BACK TO SECURE HUB
                </button>
                {view === 'register-donor' ? (
                  <DonorRegistrationForm onRegister={d => { backendService.saveDonor(d); setView('login'); }} onBack={() => setView('login')} isOffline={false} />
                ) : (
                  <InstitutionalRegistrationForm type={view === 'register-bank' ? 'BloodBank' : 'Hospital'} onRegister={d => { backendService.saveInstitution(d, view === 'register-bank' ? 'BloodBank' : 'Hospital'); setView('login'); }} />
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;