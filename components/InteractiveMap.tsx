
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Landmark, Heart, User, Navigation, ExternalLink, Loader2, Calendar, MapPin, Activity, Target, Info, ShieldCheck, Wifi, Droplets, Clock, Radio } from 'lucide-react';
import { calculateDistance } from '../services/locationService';
import { fetchLiveAvailability, ERaktKoshStatus } from '../services/eraktkoshService';

const createIcon = (color: string, iconType: 'bank' | 'drive' | 'user', isLive?: boolean, isConfirmed?: boolean, isSelected?: boolean) => {
  const finalColor = isConfirmed ? '#10b981' : isSelected ? '#dc2626' : color;
  const iconHtml = `
    <div class="relative flex items-center justify-center" style="width: 44px; height: 44px;">
      ${(isLive || isConfirmed || isSelected) ? `<div class="absolute inset-0 ${isConfirmed ? 'bg-emerald-500/20' : 'bg-red-500/30'} rounded-full animate-pulse"></div>` : ''}
      <div class="relative z-10" style="background-color: ${finalColor}; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 10px 20px -5px rgb(0 0 0 / 0.3);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${isConfirmed ? '<path d="M20 6L9 17l-5-5"/>' : 
            iconType === 'bank' ? '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' : 
            iconType === 'drive' ? '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' :
            '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>'}
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-marker',
    html: iconHtml,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44]
  });
};

const RecenterMap = ({ lat, lng, isTracking }: { lat: number, lng: number, isTracking?: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isTracking) {
      map.flyTo([lat, lng], 14, { duration: 1.5 });
    } else {
      map.setView([lat, lng], 13);
    }
  }, [lat, lng, map, isTracking]);
  return null;
};

interface MapProps {
  userLat: number;
  userLng: number;
  banks?: any[];
  drives?: any[];
  isTracking?: boolean;
  onSelectDrive?: (drive: any) => void;
  reservingId?: string | null;
  confirmedId?: string | null;
}

const InteractiveMap: React.FC<MapProps> = ({ userLat, userLng, banks = [], drives = [], isTracking = false, onSelectDrive, reservingId, confirmedId }) => {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [bankStatuses, setBankStatuses] = useState<Record<string, ERaktKoshStatus>>({});
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  
  const getBankCoords = (bank: any) => {
    const lat = bank.lat ?? bank.location?.lat;
    const lng = bank.lng ?? bank.location?.lng;
    return { lat, lng };
  };

  const handleBankClick = async (bank: any) => {
    const { lat, lng } = getBankCoords(bank);
    const bankId = bank.id || `${lat}-${lng}`;
    setSelectedBankId(bankId);
    if (!bankStatuses[bankId]) {
      setLoadingStatus(bankId);
      try {
        const status = await fetchLiveAvailability(bank.name);
        setBankStatuses(prev => ({ ...prev, [bankId]: status }));
      } finally {
        setLoadingStatus(null);
      }
    }
  };

  const confirmedDrive = useMemo(() => drives.find(d => d.id === confirmedId), [drives, confirmedId]);

  return (
    <div className="w-full h-[600px] md:h-[700px] rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-100 relative z-0">
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4">
          <Target className="w-5 h-5 text-red-500 animate-pulse" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Command HUD</p>
            <h4 className="text-[11px] font-black uppercase tracking-tight">{drives.length + banks.length} Tactical Nodes Active</h4>
          </div>
        </div>
        {confirmedDrive && (
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-4 animate-in zoom-in">
            <ShieldCheck className="w-5 h-5" />
            <h4 className="text-[11px] font-black uppercase tracking-tight">Active: {calculateDistance(userLat, userLng, confirmedDrive.coordinates.lat, confirmedDrive.coordinates.lng)} KM TO GO</h4>
          </div>
        )}
      </div>

      <MapContainer center={[userLat, userLng]} zoom={13} scrollWheelZoom={false} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap lat={userLat} lng={userLng} isTracking={isTracking} />
        {confirmedDrive && <Polyline positions={[[userLat, userLng], [confirmedDrive.coordinates.lat, confirmedDrive.coordinates.lng]]} pathOptions={{ color: '#10b981', weight: 3, dashArray: '8, 8' }} />}
        <Circle center={[userLat, userLng]} radius={5000} pathOptions={{ fillColor: '#ef4444', color: '#ef4444', weight: 1, opacity: 0.1, fillOpacity: 0.05 }} />
        <Marker position={[userLat, userLng]} icon={createIcon('#3b82f6', 'user')} />
        
        {drives.map((drive, i) => (
          <Marker key={`drive-${i}`} position={[drive.coordinates.lat, drive.coordinates.lng]} icon={createIcon(drive.date === 'TODAY' ? '#dc2626' : '#f59e0b', 'drive', drive.date === 'TODAY', confirmedId === drive.id)}>
            <Popup>
              <div className="p-4 min-w-[240px]">
                <h4 className="text-lg font-black text-slate-900 mb-4">{drive.title}</h4>
                <div className="space-y-2 mb-6 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {drive.date}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {drive.location}</div>
                </div>
                {onSelectDrive && (
                  <button onClick={() => onSelectDrive(drive)} disabled={reservingId === drive.id || confirmedId === drive.id} className="w-full py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                    {confirmedId === drive.id ? 'Slot Secured' : 'Reserve Slot'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {banks.map((bank, i) => {
          const { lat, lng } = getBankCoords(bank);
          if (lat === undefined || lng === undefined) return null;
          
          return (
            <Marker key={`bank-${i}`} position={[lat, lng]} icon={createIcon('#dc2626', 'bank')} eventHandlers={{ click: () => handleBankClick(bank) }}>
              <Popup>
                <div className="p-4 min-w-[280px]">
                  <h4 className="text-lg font-black text-slate-900 mb-2">{bank.name}</h4>
                  <p className="text-xs text-slate-500 mb-6">{bank.address || bank.location?.address || 'Medical Facility'}</p>
                  {loadingStatus === (bank.id || `${lat}-${lng}`) ? (
                    <div className="flex items-center justify-center py-4 gap-2 text-[10px] font-black uppercase text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Querying e-RaktKosh...</div>
                  ) : bankStatuses[bank.id || `${lat}-${lng}`] ? (
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(bankStatuses[bank.id || `${lat}-${lng}`].availability).map(([type, count]) => (
                        <div key={type} className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black">{type}</span>
                          <span className={`text-[11px] font-black ${Number(count) > 0 ? 'text-red-600' : 'text-slate-300'}`}>{count as number}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[9px] font-black text-slate-400 text-center uppercase">Click to verify live supply chain</p>}
                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)} className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> Tactical Route
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
