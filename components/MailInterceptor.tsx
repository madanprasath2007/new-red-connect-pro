import React, { useState, useEffect } from 'react';
import { Mail, X, Check, Copy, Clock, ShieldCheck, Timer, Zap, Send } from 'lucide-react';

const MailInterceptor: React.FC = () => {
  const [intercepted, setIntercepted] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleMail = (e: any) => {
      setIntercepted(e.detail);
      const duration = e.detail.isFast ? 10000 : 120000;
      setTimeout(() => setIntercepted(null), duration);
    };
    window.addEventListener('RED_CONNECT_MAIL_INTERCEPT', handleMail);
    return () => window.removeEventListener('RED_CONNECT_MAIL_INTERCEPT', handleMail);
  }, []);

  if (!intercepted) return null;

  const copyOtp = () => {
    navigator.clipboard.writeText(intercepted.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`fixed top-8 right-8 z-[200] w-full max-w-sm bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border-2 overflow-hidden animate-in slide-in-from-right-8 duration-500 ${intercepted.isFast ? 'border-red-500 ring-8 ring-red-500/10' : 'border-slate-100'}`}>
      <div className={`${intercepted.isFast ? 'bg-red-600' : 'bg-slate-900'} p-5 flex items-center justify-between text-white border-b border-white/10`}>
        <div className="flex items-center gap-3">
          {intercepted.isFast ? <Zap className="w-5 h-5 animate-pulse text-amber-400" /> : <Mail className="w-5 h-5" />}
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{intercepted.isFast ? 'Fast Relay Node Active' : 'SMTP Command Relay'}</span>
        </div>
        <button onClick={() => setIntercepted(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-6">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 space-y-2">
           <div className="flex items-center gap-2">
              <Send className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase">FROM:</span>
              <span className="text-[10px] font-bold text-slate-600">{intercepted.from}</span>
           </div>
           <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase">TO:</span>
              <span className="text-[10px] font-bold text-slate-800">{intercepted.email}</span>
           </div>
        </div>

        <div className={`rounded-3xl p-6 border-2 relative group transition-all ${intercepted.isFast ? 'bg-red-50/50 border-red-100' : 'bg-indigo-50/30 border-slate-100'}`}>
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Key</p>
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${intercepted.isFast ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}>
              <Timer className="w-3 h-3" /> {intercepted.isFast ? '10s Tactical' : '2m Secure'}
            </div>
          </div>
          <p className="text-5xl font-black text-slate-900 tracking-[0.25em] font-mono text-center mb-2">{intercepted.otp}</p>
          <button 
            onClick={copyOtp}
            className={`w-full mt-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'KEY COPIED' : 'COPY AUTH TOKEN'}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Relay: {intercepted.timestamp}
          </div>
          <div className="flex items-center gap-1">
             <Zap className="w-3 h-3 text-amber-500" /> AES-256
          </div>
        </div>
      </div>
      
      <div className="h-2 w-full bg-slate-100">
         <div 
           className={`h-full transition-all linear ${intercepted.isFast ? 'bg-red-500' : 'bg-indigo-600'}`} 
           style={{ 
             width: '100%',
             animation: `shrink ${intercepted.isFast ? '10s' : '120s'} linear forwards` 
           }}
         ></div>
      </div>
    </div>
  );
};

export default MailInterceptor;