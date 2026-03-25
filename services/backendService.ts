import { Donor, BloodBank, AuthenticatedUser, UserRole, BloodType, EmergencyRequest, BloodBag } from './types';
import { MOCK_DONORS, MOCK_BANKS, MOCK_HOSPITALS } from '../constants';
import { broadcastToNetwork } from './networkService';

const DB_KEYS = {
  DONORS: 'redconnect_donor_db',
  BANKS: 'redconnect_bank_db',
  HOSPITALS: 'redconnect_hospital_db',
  REQUESTS: 'redconnect_request_db',
  BAGS: 'redconnect_blood_bags_db',
  OTP_STORE: 'redconnect_otp_relay',
  ACTION_QUEUE: 'redconnect_action_queue'
};

const OTP_EXPIRY_MS = 120000; // Standard 2m
const FAST_RELAY_EXPIRY_MS = 10000; // Accelerated 10s for Nandha Engineering Node

const SecureVault = {
  encode: (val: string) => btoa(val),
  decode: (val: string) => {
    try { return atob(val); } catch { return val; }
  }
};

class BackendService {
  private isSyncing = false;

  constructor() {
    this.initializeDB();
    window.addEventListener('online', this.processActionQueue.bind(this));
  }

  private notifyNetwork(entity: string) {
    window.dispatchEvent(new CustomEvent('RED_CONNECT_API_RELOAD', { detail: { entity, timestamp: Date.now() } }));
    broadcastToNetwork({ type: 'DATA_CHANGE', payload: { entity } });
  }

  private initializeDB() {
    const init = (key: string, defaultData: any) => {
      if (!localStorage.getItem(key)) {
        const obfuscated = defaultData.map((d: any) => ({
          ...d,
          password: d.password ? SecureVault.encode(d.password) : undefined,
          accessKey: d.accessKey ? SecureVault.encode(d.accessKey) : undefined
        }));
        localStorage.setItem(key, JSON.stringify(obfuscated));
      }
    };
    
    // Inject Nandha Engineering Node into Initial State
    const extendedBanks = [...MOCK_BANKS, {
      id: 'nandha-01',
      institutionName: 'Nandha Engineering Hub',
      email: '24cc024@nandhaengg.org',
      accessKey: SecureVault.encode('Madan@2007..'),
      inventory: { 'A+': 50, 'A-': 5, 'B+': 40, 'B-': 2, 'AB+': 10, 'AB-': 1, 'O+': 80, 'O-': 15 },
      plateletsCount: 100,
      location: { lat: 11.3410, lng: 77.7172, address: 'Perundurai Main Road, Erode' },
      source: 'Local',
      lastSync: new Date().toISOString(),
      phone: '0424-222222'
    }];

    init(DB_KEYS.DONORS, MOCK_DONORS);
    init(DB_KEYS.BANKS, extendedBanks);
    init(DB_KEYS.HOSPITALS, MOCK_HOSPITALS);
    init(DB_KEYS.REQUESTS, []);
    init(DB_KEYS.BAGS, []);
    init(DB_KEYS.ACTION_QUEUE, []);
  }

  private queueAction(action: string, payload: any[]) {
      const queue = JSON.parse(localStorage.getItem(DB_KEYS.ACTION_QUEUE) || '[]');
      queue.push({ action, payload });
      localStorage.setItem(DB_KEYS.ACTION_QUEUE, JSON.stringify(queue));
  }

  public async processActionQueue() {
    if (!navigator.onLine || this.isSyncing) return;
    const queue = JSON.parse(localStorage.getItem(DB_KEYS.ACTION_QUEUE) || '[]');
    if (queue.length === 0) return;
    this.isSyncing = true;
    for (const item of queue) {
        if (typeof (this as any)[item.action] === 'function') {
            try { await (this as any)[item.action](...item.payload); } catch (e) {}
        }
    }
    localStorage.setItem(DB_KEYS.ACTION_QUEUE, JSON.stringify([]));
    this.isSyncing = false;
  }

  public purgeSessionData() {
    const donors = this.getDonors().map(d => ({ ...d, profilePicture: undefined, idNumber: undefined }));
    localStorage.setItem(DB_KEYS.DONORS, JSON.stringify(donors));
  }

  getEmergencyRequests(): EmergencyRequest[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.REQUESTS) || '[]');
  }

  saveEmergencyRequest(request: EmergencyRequest) {
    if (!navigator.onLine) { this.queueAction('saveEmergencyRequest', [request]); return; }
    const requests = this.getEmergencyRequests();
    const newReq = { ...request, status: 'Pending' as const };
    localStorage.setItem(DB_KEYS.REQUESTS, JSON.stringify([newReq, ...requests]));
    this.notifyNetwork('emergency_requests');
    broadcastToNetwork({ type: 'GLOBAL_SOS', payload: { hospitalName: request.hospital, request: newReq } });
  }

  updateEmergencyRequestStatus(requestId: string, status: EmergencyRequest['status']) {
    const requests = this.getEmergencyRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      requests[idx].status = status;
      localStorage.setItem(DB_KEYS.REQUESTS, JSON.stringify(requests));
      this.notifyNetwork('emergency_requests');
      return true;
    }
    return false;
  }

  async allocateBlood(requestId: string, bagIds: string[]) {
    const requests = this.getEmergencyRequests();
    const reqIdx = requests.findIndex(r => r.id === requestId);
    if (reqIdx !== -1) {
      requests[reqIdx].status = 'Allocated';
      requests[reqIdx].allocatedBagIds = bagIds;
      localStorage.setItem(DB_KEYS.REQUESTS, JSON.stringify(requests));
    }
    const bags = this.getBloodBags();
    bagIds.forEach(id => {
      const bagIdx = bags.findIndex(b => b.id === id);
      if (bagIdx !== -1) bags[bagIdx].status = 'Allocated';
    });
    localStorage.setItem(DB_KEYS.BAGS, JSON.stringify(bags));
    this.notifyNetwork('emergency_requests');
    this.notifyNetwork('bags');
    return { success: true };
  }

  getDonors(): Donor[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.DONORS) || '[]');
  }

  saveDonor(donor: Donor) {
    const donors = this.getDonors();
    const secureDonor = { ...donor, password: donor.password ? SecureVault.encode(donor.password) : undefined };
    localStorage.setItem(DB_KEYS.DONORS, JSON.stringify([secureDonor, ...donors]));
    this.notifyNetwork('donors');
  }

  saveInstitution(data: any, role: 'BloodBank' | 'Hospital') {
    const dbKey = role === 'BloodBank' ? DB_KEYS.BANKS : DB_KEYS.HOSPITALS;
    const insts = JSON.parse(localStorage.getItem(dbKey) || '[]');
    const secureInst = { ...data, accessKey: data.accessKey ? SecureVault.encode(data.accessKey) : undefined, id: `inst-${Date.now()}` };
    localStorage.setItem(dbKey, JSON.stringify([secureInst, ...insts]));
    this.notifyNetwork(role === 'BloodBank' ? 'banks' : 'hospitals');
  }

  getBloodBags(): BloodBag[] {
    return JSON.parse(localStorage.getItem(DB_KEYS.BAGS) || '[]');
  }

  saveBloodBag(bag: BloodBag) {
    const bags = this.getBloodBags();
    localStorage.setItem(DB_KEYS.BAGS, JSON.stringify([bag, ...bags]));
    this.notifyNetwork('bags');
  }

  removeBloodBag(id: string) {
    const bags = this.getBloodBags().filter(b => b.id !== id);
    localStorage.setItem(DB_KEYS.BAGS, JSON.stringify(bags));
    this.notifyNetwork('bags');
  }

  async recordDonation(donorId: string, bankId: string, bloodType: BloodType, units: number) {
    const bagId = `BAG-${Date.now().toString().slice(-6)}`;
    const collectionDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newBag: BloodBag = { id: bagId, type: bloodType, collectionDate, expiryDate, source: `Donation: ${donorId}`, volume: units, bankId, status: 'Available' };
    this.saveBloodBag(newBag);
    const donors = this.getDonors();
    const dIdx = donors.findIndex(d => d.id === donorId);
    if (dIdx !== -1) {
      donors[dIdx].lastDonation = collectionDate;
      donors[dIdx].isAvailable = false;
      donors[dIdx].lastBagId = bagId;
      localStorage.setItem(DB_KEYS.DONORS, JSON.stringify(donors));
      this.notifyNetwork('donors');
    }
    return { success: true, bag: newBag };
  }

  async authenticate(email: string, key: string, role: UserRole): Promise<AuthenticatedUser | null> {
    if (role === 'Donor') {
      const donors = this.getDonors();
      const user = donors.find(d => d.email === email && SecureVault.decode(d.password || '') === key);
      return user ? { id: user.id, name: user.name, email: user.email!, role: 'Donor', avatar: `https://i.pravatar.cc/150?u=${user.id}` } : null;
    }
    const dbKey = role === 'BloodBank' ? DB_KEYS.BANKS : DB_KEYS.HOSPITALS;
    const insts = JSON.parse(localStorage.getItem(dbKey) || '[]');
    const inst = insts.find((i: any) => i.email === email && SecureVault.decode(i.accessKey || '') === key);
    return inst ? { id: inst.id, name: inst.institutionName, email: inst.email, role, avatar: `https://i.pravatar.cc/150?u=${inst.id}` } : null;
  }

  async requestOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpStore = JSON.parse(localStorage.getItem(DB_KEYS.OTP_STORE) || '{}');
    
    // Fast Relay Logic for Nandha Engineering Node
    const isFastRelay = email === '24cc024@nandhaengg.org';
    const expiryDuration = isFastRelay ? FAST_RELAY_EXPIRY_MS : OTP_EXPIRY_MS;
    
    const expires = Date.now() + expiryDuration;
    otpStore[email] = { otp, expires };
    localStorage.setItem(DB_KEYS.OTP_STORE, JSON.stringify(otpStore));
    
    // Professional SMTP Relay Metadata
    window.dispatchEvent(new CustomEvent('RED_CONNECT_MAIL_INTERCEPT', { 
      detail: { 
        from: 'madanprasath2007@gmail.com',
        email, 
        otp, 
        expires,
        isFast: isFastRelay,
        appToken: 'ryhp lvma jyjl phjd', // The provided SMTP app password
        timestamp: new Date().toLocaleTimeString() 
      } 
    }));
    
    return { success: true, message: 'OTP Routed via Personal SMTP Relay', expires };
  }

  async verifyOtp(email: string, otp: string) {
    const otpStore = JSON.parse(localStorage.getItem(DB_KEYS.OTP_STORE) || '{}');
    const record = otpStore[email];
    
    if (!record) return { success: false, message: 'Identity check failed. Restart relay.' };
    
    if (Date.now() > record.expires) {
      delete otpStore[email];
      localStorage.setItem(DB_KEYS.OTP_STORE, JSON.stringify(otpStore));
      return { success: false, message: 'Fast Relay Timeout: Node Handshake Expired.' };
    }
    
    if (record.otp === otp) {
      delete otpStore[email];
      localStorage.setItem(DB_KEYS.OTP_STORE, JSON.stringify(otpStore));
      return { success: true };
    }
    
    return { success: false, message: 'Sequence Mismatch: Invalid 6-Digit Key.' };
  }
}

export const backendService = new BackendService();
export default backendService;