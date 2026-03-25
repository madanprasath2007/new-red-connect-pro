
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Droplet, LayoutDashboard, Bell, LogOut, PlusSquare, Database, Users, 
  CalendarDays, Stethoscope, Trophy, Radar, Globe, Zap, ClipboardCheck,
  Droplets, Activity, MonitorPlay, Sparkles, Maximize2, RefreshCw, Shield,
  WifiOff, CloudOff, Target
} from 'lucide-react';
import EmergencyFeed from './components/EmergencyFeed';
import BloodDriveList from './components/BloodDriveList';
import NearbyScanner from './components/NearbyScanner';
import AIAssistant from './components/AIAssistant';
import LoginPage from './components/LoginPage';
import HospitalRequestForm from './components/HospitalRequestForm';
import StockManagement from './components/StockManagement';
import DonorDatabase from './components/DonorDatabase';
import BloodAllocation from './components/BloodAllocation';
import BloodCollection from './components/BloodCollection';
import ChatBot from './components/ChatBot';
import DonationSchedule from './components/DonationSchedule';
import EligibilityChecker from './components/EligibilityChecker';
import Leaderboard from './components/Leaderboard';
import HospitalStatusDashboard from './components/HospitalStatusDashboard';
import CampaignGenerator from './components/CampaignGenerator';
import { EmergencyRequest, AuthenticatedUser } from './services/types';
import { getCurrentPosition, GeoCoords, startLocationWatch } from './services/locationService';
import { subscribeToNetwork, NetworkEvent } from './services/networkService';
import { backendService } from './services/backendService';

type TabType = 'feed' | 'scanner' | 'drives' | 'new-request' | 'register-donor' | 'my-stock' | 'donor-db' | 'allocation' | 'schedule' | 'eligibility' | 'leaderboard' | 'collection' | 'hospital-status' | 'campaign-studio';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [allRequests, setAllRequests] = useState<EmergencyRequest[]>([]);
  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
  const [newNotifPulse, setNewNotifPulse] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [systemStatus, setSystemStatus] = useState({ gps: 'waiting', cloud: 'online' });

  const refreshData = useCallback(() => {
    setAllRequests(backendService.getEmergencyRequests());
  }, []);

  const chatContextSummary = useMemo(() => {
    const pending = allRequests.filter(r => r.status === 'Pending').length;
    return `System Status: ${allRequests.length} total requests, ${pending} unallocated. Role: ${user?.role}.`;
  }, [allRequests, user]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshData();
    const unsubscribe = subscribeToNetwork((e: NetworkEvent) => {
      if (e.type === 'GLOBAL_SOS') {
        setNewNotifPulse(true);
        refreshData();
        setTimeout(() => setNewNotifPulse(false), 3000);
      } else if (e.type === 'DATA_CHANGE') {
        refreshData();
      }
    });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [refreshData]);

  useEffect(() => {
    getCurrentPosition().then(coords => {
      setUserLocation(coords);
      setSystemStatus(prev => ({ ...prev, gps: 'active' }));
    }).catch(() => {
      setUserLocation({ latitude: 13.0827, longitude: 80.2707, accuracy: 'fixed' });
      setSystemStatus(prev => ({ ...prev, gps: 'manual' }));
    });
    const saved = localStorage.getItem('redconnect_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleCreateRequest = (data: Partial<EmergencyRequest>) => {
    const newReq: EmergencyRequest = {
      id: `REQ-${Date.now()}`,
      patientName: data.patientName || 'Emergency Case',
      bloodType: data.bloodType!,
      unitsNeeded: data.unitsNeeded!,
      hospital: user?.name || 'Medical Facility',
      location: 'Emergency Wing',
      urgency: data.urgency || 'Normal',
      isPlateletRequest: data.isPlateletRequest || false,
      contact: user?.email || 'Medical Desk',
      timestamp: 'Just now',
      coordinates: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined,
      status: 'Pending'
    };
    backendService.saveEmergencyRequest(newReq);
    setActiveTab('hospital-status'); 
  };

  if (!user) return <LoginPage onLogin={u => { setUser(u); localStorage.setItem('redconnect_user', JSON.stringify(u)); }} />;

  const NavButton = ({ tab, icon: Icon, label, color = 'bg-red-600' }: { tab: TabType, icon: any, label: string, color?: string }) => (
    <button onClick={() => setActiveTab(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === tab ? `${color} text-white shadow-xl` : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0 bg-slate-50/50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg"><Droplet className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">RED COMMAND<span className="text-red-600">PRO</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${systemStatus.gps === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tactical Signal: {systemStatus.gps.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-4 px-6 py-2 bg-slate-900 rounded-2xl border border-white/5 mr-4 shadow-inner">
               <div className="flex flex-col items-start pr-4 border-r border-white/10">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active SITREP</span>
                  <span className="text-[10px] font-bold text-white uppercase">{activeTab.replace('-', ' ')}</span>
               </div>
               <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">State Relay</span>
                  <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-bold text-emerald-400 uppercase">Authenticated</span></div>
               </div>
            </div>
            
            <button onClick={toggleFullScreen} className={`p-2.5 rounded-xl transition-all ${isFullScreen ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-white'}`}><Maximize2 className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-white transition-all"><RefreshCw className="w-4 h-4" /></button>
            <div className="w-px h-8 bg-slate-100 mx-2"></div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden"><img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /></div>
          </div>
        </div>
      </header>

      {isOffline && <div className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 text-center flex items-center justify-center gap-2"><CloudOff className="w-3 h-3" /> Connectivity Lost • Local Storage Active</div>}

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid md:grid-cols-12 md:gap-8">
        <nav className="hidden md:flex md:col-span-3 flex-col h-[calc(100vh-140px)] sticky top-28 space-y-2 overflow-y-auto scrollbar-hide">
          {user.role === 'Hospital' && (
            <div className="space-y-2 mb-4">
              <button onClick={() => handleCreateRequest({ bloodType: 'O-', unitsNeeded: 1, urgency: 'Critical' })} className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-red-600 rounded-2xl font-black text-white shadow-xl hover:bg-red-700 transition-all active:scale-95 group">
                <Zap className="w-5 h-5 group-hover:scale-125 transition-transform" /><span className="uppercase text-xs tracking-widest">SOS BROADCAST</span>
              </button>
              <NavButton tab="new-request" icon={PlusSquare} label="Submit Case" color="bg-slate-900" />
              <NavButton tab="hospital-status" icon={MonitorPlay} label="Status Tracking" color="bg-red-600" />
            </div>
          )}
          {user.role === 'BloodBank' && (
            <div className="space-y-2 mb-4">
              <NavButton tab="collection" icon={Droplets} label="New Collection" color="bg-red-600" />
              <NavButton tab="allocation" icon={ClipboardCheck} label="Dispatch Terminal" color="bg-slate-900" />
              <NavButton tab="my-stock" icon={Database} label="Vault Inventory" color="bg-slate-900" />
              <NavButton tab="donor-db" icon={Users} label="Donor Registry" color="bg-slate-900" />
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-4">Global Intelligence</h3>
            <NavButton tab="feed" icon={LayoutDashboard} label="Operations Feed" color="bg-red-600" />
            <NavButton tab="scanner" icon={Radar} label="Nearby Scanner" color="bg-slate-900" />
            <NavButton tab="leaderboard" icon={Trophy} label="Rankings" color="bg-amber-500" />
          </div>
          <div className="flex-grow"></div>
          <button onClick={() => { backendService.purgeSessionData(); setUser(null); localStorage.removeItem('redconnect_user'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-slate-400 hover:text-red-600 transition-all"><LogOut className="w-5 h-5" />Logoff Hub</button>
        </nav>

        <section className="md:col-span-9">
          {activeTab === 'feed' && <EmergencyFeed requests={allRequests} onMatch={setSelectedRequest} dengueMode={false} userLocation={userLocation} user={user} />}
          {activeTab === 'scanner' && <NearbyScanner initialLocation={userLocation} />}
          {activeTab === 'drives' && <BloodDriveList user={user} initialLocation={userLocation} />}
          {activeTab === 'new-request' && <HospitalRequestForm hospitalName={user.name} onSubmit={handleCreateRequest} />}
          {activeTab === 'hospital-status' && <HospitalStatusDashboard hospitalName={user.name} requests={allRequests} />}
          {activeTab === 'my-stock' && <StockManagement bankId={user.id} bankName={user.name} />}
          {activeTab === 'donor-db' && <DonorDatabase bankId={user.id} userLocation={userLocation} />}
          {activeTab === 'allocation' && <BloodAllocation bankId={user.id} bankName={user.name} />}
          {activeTab === 'collection' && <BloodCollection bankId={user.id} bankName={user.name} userLocation={userLocation} />}
          {activeTab === 'schedule' && <DonationSchedule lastDonationDate="2025-12-12" bloodType="O+" onNavigateToDrives={() => setActiveTab('drives')} />}
          {activeTab === 'eligibility' && <EligibilityChecker onVerified={a => {}} />}
          {activeTab === 'leaderboard' && <Leaderboard userLocation={userLocation} />}
          {activeTab === 'campaign-studio' && <CampaignGenerator />}
        </section>
      </main>
      <AIAssistant request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      {!isOffline && <ChatBot currentTab={activeTab} contextSummary={chatContextSummary} />}
    </div>
  );
};

export default App;
