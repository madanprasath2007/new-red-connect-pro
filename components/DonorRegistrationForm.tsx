import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, User, Mail, Droplets, Phone, MapPin, ShieldCheck, Activity, Lock, AlertCircle, Camera, Trash2, ArrowRight, ChevronRight, KeyRound, Loader2, RefreshCw, Eye, EyeOff, CheckCircle2, Calendar, ArrowLeft } from 'lucide-react';
import { BloodType } from '../services/types';
import { extractLicenseDetails } from '../services/geminiService';
import { backendService } from '../services/backendService';
import { getCurrentPosition } from '../services/locationService';

interface DonorRegistrationFormProps {
  onRegister: (donorData: any) => void;
  onBack: () => void;
  isOffline: boolean;
}

const DonorRegistrationForm: React.FC<DonorRegistrationFormProps> = ({ onRegister, onBack, isOffline }) => {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [showKey, setShowKey] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: 'O+' as BloodType,
    phone: '',
    permanentAddress: '',
    medicalIssues: '',
    idNumber: '',
    isAvailable: true,
    profilePicture: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined
  });

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idVerified, setIdVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) timer = window.setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    getCurrentPosition().then(coords => {
      setFormData(prev => ({ ...prev, lat: coords.latitude, lng: coords.longitude }));
    }).catch(() => {});
  }, []);

  const calculateAge = (dobStr: string): string => {
    if (!dobStr) return "";
    let birthDate: Date;
    if (dobStr.includes('/')) {
      const parts = dobStr.split('/');
      if (parts.length === 3) {
        birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        birthDate = new Date(dobStr);
      }
    } else {
      birthDate = new Date(dobStr);
    }
    if (isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age.toString();
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, profilePicture: base64 }));
      setIsScanning(true);
      setError(null);
      try {
        const details = await extractLicenseDetails(base64);
        if (details) {
          const calculatedAge = details.date_of_birth ? calculateAge(details.date_of_birth) : (details.age?.toString() || "");
          setFormData(prev => ({
            ...prev,
            name: details.full_name || prev.name,
            age: calculatedAge || prev.age,
            phone: details.mobile_number || prev.phone,
            idNumber: details.id_number || prev.idNumber,
            permanentAddress: details.address || prev.permanentAddress
          }));
          setIdVerified(true);
        }
      } catch (err) {
        setError("AI Scanning failed. Please enter details manually.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const keysMatch = formData.password && formData.password === formData.confirmPassword;

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setError("Registration requires an active internet connection.");
      return;
    }
    if (!keysMatch) {
      setError("Security Access Keys do not match.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await backendService.requestOtp(formData.email);
      if (res.success) {
        setStep('otp');
      } else {
        setError(res.message || "Failed to send verification token.");
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setError("Registration requires an active internet connection.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await backendService.verifyOtp(formData.email, otp);
      if (res.success) {
        const { confirmPassword, ...dataToSave } = formData;
        onRegister({ ...dataToSave, age: parseInt(formData.age) || 18, idVerified, createdAt: new Date().toISOString() });
      } else {
        setError(res.message || "Verification failed.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1";
  const inputClass = "w-full pl-6 pr-6 py-4 bg-[#f8fafc] border-2 border-slate-50 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all font-bold text-slate-800 text-sm";

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="p-3 bg-[#f8fafc] hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-red-600 transition-all border border-slate-50"
          title="Back to Login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Create Identity</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Donor Registry Node</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={handleInitialSubmit} className="space-y-6">
          {/* AADHAAR SCAN MODULE - Top Aligned */}
          <div className="bg-[#f8fafc] border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 text-center group hover:bg-white hover:border-red-600 transition-all relative">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">AADHAAR ID CARD SCAN</h3>
            <div className="flex flex-col items-center justify-center">
              {formData.profilePicture ? (
                <div className="relative">
                  <img src={formData.profilePicture} alt="ID Scan" className="w-56 h-36 object-cover rounded-[1.5rem] border-4 border-white shadow-2xl" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-900/80 rounded-[1.5rem] flex flex-col items-center justify-center backdrop-blur-sm">
                      <Activity className="w-10 h-10 text-white animate-spin mb-2" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Vision OCR Active</span>
                    </div>
                  )}
                  <button type="button" onClick={() => { setFormData(prev => ({ ...prev, profilePicture: '' })); setIdVerified(false); }} className="absolute -top-3 -right-3 p-2 bg-red-600 text-white rounded-full shadow-2xl border-2 border-white hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-100 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 hover:bg-white transition-all group-hover:border-red-100">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-300 group-hover:text-red-500 transition-all" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SCAN AADHAAR FOR AUTO-FILL</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdUpload} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="group">
              <label className={labelClass}>FULL LEGAL NAME</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" required placeholder="Name as per Aadhaar" className={`${inputClass} pl-14`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            {/* TRIPLE COLUMN ROW - Matching Density of Elite Design */}
            <div className="grid grid-cols-3 gap-3">
              <div className="group">
                <label className={labelClass}>BLOOD TYPE</label>
                <select className={inputClass} value={formData.bloodType} onChange={(e) => setFormData({...formData, bloodType: e.target.value as BloodType})}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="group">
                <label className={labelClass}>AGE</label>
                <input type="number" required placeholder="18+" min="18" className={inputClass} value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
              </div>
              <div className="group">
                <label className={labelClass}>MOBILE</label>
                <input type="tel" required placeholder="+91..." className={inputClass} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            <div className="group">
              <label className={labelClass}>PERMANENT ADDRESS</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" required placeholder="Address as per Aadhaar" className={`${inputClass} pl-14`} value={formData.permanentAddress} onChange={(e) => setFormData({...formData, permanentAddress: e.target.value})} />
              </div>
            </div>

            <div className="group">
              <label className={labelClass}>EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="email" required placeholder="name@example.com" className={`${inputClass} pl-14`} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className={labelClass}>SECURITY ACCESS KEY</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type={showKey ? "text" : "password"} required placeholder="••••••••" className={`${inputClass} pl-14 pr-14 ${keysMatch ? 'border-emerald-500 bg-emerald-50/20' : ''}`} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
              </div>
              <div className="group">
                <label className={labelClass}>CONFIRM ACCESS KEY</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type={showKey ? "text" : "password"} required placeholder="••••••••" className={`${inputClass} pl-14 ${keysMatch ? 'border-emerald-500 bg-emerald-50/20' : ''}`} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <button 
              type="submit" 
              disabled={isSubmitting || isScanning || !keysMatch || isOffline} 
              className="w-full bg-[#0f172a] text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>GENERATE SECURE OTP <ChevronRight className="w-4 h-4" /></>}
            </button>
            <button 
              type="button" 
              onClick={onBack}
              className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-600 transition-colors py-2"
            >
              ABORT & RETURN TO LOGIN
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="space-y-12 animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100">
              <ShieldCheck className="w-10 h-10 text-red-600 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Security Relay</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Check Mail: {formData.email}</p>
          </div>
          
          <div className="space-y-6">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Verify 6-Digit Token</label>
            <div className="flex gap-2 justify-center">
               <input type="text" maxLength={6} placeholder="000000" className="w-full max-w-[280px] py-5 bg-[#f8fafc] border-2 border-slate-50 rounded-[1.5rem] focus:ring-4 focus:ring-red-600/5 focus:border-red-600 font-black text-2xl tracking-[0.5em] text-center text-slate-800" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <button type="button" onClick={() => {}} disabled={cooldown > 0 || isOffline} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${cooldown > 0 || isOffline ? 'text-slate-300' : 'text-red-600 hover:text-red-700'}`}>
                {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Request New Verification Token'}
              </button>
              <button type="button" onClick={() => setStep('details')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Edit Details</button>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || otp.length < 6 || isOffline} className="w-full bg-red-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>AUTHORIZE ACCOUNT & SYNC <ShieldCheck className="w-5 h-5" /></>}
          </button>
        </form>
      )}
    </div>
  );
};

export default DonorRegistrationForm;
