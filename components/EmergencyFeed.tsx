
import React, { useState } from 'react';
import { 
  Globe, 
  ChevronRight,
  Database,
  Loader2,
  Stethoscope,
  Building2,
  Smartphone,
  Volume2,
  ShieldCheck,
  Radio,
  Zap,
  Activity,
  Target
} from 'lucide-react';
import { EmergencyRequest, AuthenticatedUser } from '../services/types';
import { GeoCoords } from '../services/locationService';
import { fetchLiveAvailability, ERaktKoshStatus } from '../services/eraktkoshService';
import { speakEmergencyAlert } from '../services/geminiService';

interface FeedProps {
  requests: EmergencyRequest[];
  onMatch: (req: EmergencyRequest) => void;
  dengueMode: boolean;
  userLocation: GeoCoords | null;
  user?: AuthenticatedUser | null;
}

const EmergencyFeed: React.FC<FeedProps> = ({ requests, onMatch, user }) => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [checkingInventory, setCheckingInventory] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, ERaktKoshStatus>>({});
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

  const handleSpeech = async (req: EmergencyRequest) => {
    if (isSpeaking) return;
    setIsSpeaking(req.id);
    const briefingText = `Priority alert for ${req.bloodType} at ${req.hospital}. Urgent requirement: ${req.unitsNeeded} units. Status: ${req.status || req.urgency}.`;
    const audioData = await speakEmergencyAlert(briefingText);
    
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const dataInt16 = new Int16Array(audioData.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channel[i] = dataInt16[i] / 32768.0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(null);
      source.start();
    } else {
      setIsSpeaking(null);
    }
  };

  const handleInventoryCheck = async (requestId: string, hospitalName: string) => {
    setCheckingInventory(requestId);
    try {
      const status = await fetchLiveAvailability(hospitalName);
      setInventoryStatus(prev => ({ ...prev, [requestId]: status }));
    } finally {
      setCheckingInventory(null);
    }
  };

  const filtered = requests.filter(r => 
    r.patientName.toLowerCase().includes(filter.toLowerCase()) || 
    r.hospital.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Globe className="w-10 h-10 animate-spin-slow text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">National Network</h2>
              <div className="flex items-center gap-2 mt-1 text-emerald-400">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">State Command Relay: Online</p>
              </div>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>Grid</button>
            <button onClick={() => setViewMode('map')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>Sectors</button>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {filtered.map(req => {
          const isFulfilled = req.status === 'Received' || req.status === 'Fulfilled';
          
          return (
            <div key={req.id} className={`group relative bg-white rounded-[2.5rem] border transition-all hover:shadow-2xl overflow-hidden ${isFulfilled ? 'border-emerald-200 bg-emerald-50/20' : req.urgency === 'Critical' ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-100 shadow-lg'}`}>
              <div className="absolute top-0 right-0 flex gap-1 z-10">
                 {!isFulfilled && (
                    <button 
                      onClick={() => handleSpeech(req)}
                      className={`px-5 py-3 rounded-bl-[1.5rem] transition-all flex items-center gap-2 ${isSpeaking === req.id ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-red-600 hover:text-white'}`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Audio Briefing</span>
                    </button>
                 )}
                 {isFulfilled && (
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-bl-[1.5rem] flex items-center gap-2 shadow-lg">
                       <ShieldCheck className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Relay Complete</span>
                    </div>
                 )}
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-6">
                    <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-black text-3xl border-4 ${isFulfilled ? 'bg-white text-emerald-600 border-emerald-100' : req.isPlateletRequest ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {req.bloodType}
                      <span className="text-[8px] font-black opacity-40 uppercase">{req.isPlateletRequest ? 'PLT' : 'WB'}</span>
                    </div>
                    <div>
                      <h3 className={`font-black text-2xl tracking-tight mb-2 ${isFulfilled ? 'text-emerald-900' : 'text-slate-800'}`}>{req.patientName}</h3>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Building2 className={`w-3.5 h-3.5 ${isFulfilled ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">{req.hospital}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-4xl font-black ${isFulfilled ? 'text-emerald-600' : 'text-slate-900'}`}>{req.unitsNeeded}</p>
                     <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">Units Reqd</p>
                  </div>
                </div>

                {!isFulfilled && (
                  <div className={`p-6 rounded-[2rem] border-2 mb-6 ${inventoryStatus[req.id] ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inventoryStatus[req.id] ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>
                              {checkingInventory === req.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Target className="w-6 h-6" />}
                          </div>
                          <div>
                              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${inventoryStatus[req.id] ? 'text-emerald-700' : 'text-slate-400'}`}>e-RaktKosh Command Relay</p>
                              <h4 className={`text-sm font-black uppercase tracking-tight ${inventoryStatus[req.id] ? 'text-emerald-900' : 'text-white'}`}>
                                {inventoryStatus[req.id] ? `Stock Verified: ${inventoryStatus[req.id].region}` : 'Query state inventory...'}
                              </h4>
                          </div>
                        </div>
                        {!inventoryStatus[req.id] && (
                          <button 
                            onClick={() => handleInventoryCheck(req.id, req.hospital)}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-xl"
                          >
                            Synchronize
                          </button>
                        )}
                    </div>
                  </div>
                )}

                {isFulfilled ? (
                  <div className="bg-emerald-600 text-white p-5 rounded-[1.5rem] flex items-center justify-between shadow-lg">
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5" />
                        <h4 className="text-xs font-black uppercase tracking-tight">Units integrated at {req.hospital}</h4>
                     </div>
                     <p className="text-[9px] font-bold opacity-60">AuthID: RED-{req.id.slice(-6)}</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => onMatch(req)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all flex items-center justify-center gap-3">
                      <Zap className="w-4 h-4" /> Initiate Matchmaking
                    </button>
                    <a href={`tel:${req.contact}`} className="px-6 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                      <Smartphone className="w-5 h-5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmergencyFeed;
