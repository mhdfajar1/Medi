
import { User, MedicalRecord, UserRole, AccessPermission, AuditLog, AccessStatus } from '../types';

// Helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate fake hashes for content (IPFS/TX)
const generateHash = () => '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
const generateIPFSHash = () => 'Qm' + Array.from({length: 44}, () => Math.floor(Math.random() * 16).toString(16)).join('');

// --- MOCK DATABASE (Local Storage) ---

const USERS_KEY = 'medichain_users';
const RECORDS_KEY = 'medichain_records';
const PERMISSIONS_KEY = 'medichain_permissions';
const AUDIT_KEY = 'medichain_audit';

const getStored = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setStored = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};
const words = [
 "apple","river","stone","ocean","vault",
 "maple","doctor","alpha","beta","gamma",
 "secure","health","block","chain","trust"
];

export const generateRecoveryPhrase = () => {
 return Array.from({length:8})
  .map(() => words[Math.floor(Math.random()*words.length)])
  .join(" ");
};

// Seed Data
const seedUsers: User[] = [
  { 
    id: 'admin1',
    name: 'System Admin',
    email: 'admin@medichain.com',
    password: 'admin123',
    role: UserRole.ADMIN,
    walletAddress: '0x71C...ADMIN',
    recoveryPhrase: generateRecoveryPhrase(),
    isAuthorized: true,
    is2FAEnabled: false },
];

const seedRecords: MedicalRecord[] = [];
const seedPermissions: AccessPermission[] = [];
const seedAuditLogs: AuditLog[] = [];

// --- SERVICE METHODS ---

export const initializeBlockchain = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    setStored(USERS_KEY, seedUsers);
  }
  
  if (getStored<MedicalRecord[]>(RECORDS_KEY, []).length === 0) {
    setStored(RECORDS_KEY, seedRecords);
  }

  if (getStored<AccessPermission[]>(PERMISSIONS_KEY, []).length === 0) {
    setStored(PERMISSIONS_KEY, seedPermissions);
  }

  if (getStored<AuditLog[]>(AUDIT_KEY, []).length === 0) {
    setStored(AUDIT_KEY, seedAuditLogs);
  }
};

// --- WALLET / AUTH HELPERS ---

export const getWalletFromEmail = (email: string): string => {
  // Simple deterministic hash for demo purposes
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16);
  // Pad/Repeat to make it look like an address
  const padded = (hex + "123456789abcdef0123456789abcdef0123456789").substring(0, 40);
  return '0x' + padded;
};

export const connectWallet = async (): Promise<string> => {
  await delay(1200); // Simulate AI secure handshake
  // Generate a "smart" wallet address
  const randomHex = Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `0x${randomHex}`;
};

export const checkWalletConnection = async (): Promise<string | null> => {
  // The AI connection is transient for this demo, usually requires re-login
  return null;
};

// --- AUTH & REGISTRATION ---

export const getUserByWallet = async (walletAddress: string): Promise<User | undefined> => {
  await delay(500);
  const users = getStored<User[]>(USERS_KEY, seedUsers);
  return users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
};

export const registerUser = async (
  walletAddress: string,
  email: string,
  name: string, 
  role: UserRole, 
  password: string,
  licenseNumber?: string,
  specialization?: string,
  experience?: number
): Promise<User> => {
  await delay(1000); // Simulate network
  const users = getStored<User[]>(USERS_KEY, seedUsers);
  
  // Check if wallet already registered
  if (users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase())) {
    throw new Error("Account already exists for this email/wallet.");
  }

  const newUser: User = {
    id: `${role.toLowerCase().slice(0,3)}_${Date.now()}`, // Internal ID
    name,
    email,
    password,
    role,
    walletAddress,
    recoveryPhrase: generateRecoveryPhrase(),
    // Doctors require approval, Patients auto-approve for this demo
    isAuthorized: role === UserRole.PATIENT,
    is2FAEnabled: false, 
    licenseNumber,
    specialization,
    experience
  };

  setStored(USERS_KEY, [...users, newUser]);
  logAudit('SYSTEM', `New User Registration: ${name} (${role})`, newUser.id, generateHash());
  
  return newUser;
};

export const getUsers = async (): Promise<User[]> => {
  await delay(500);
  return getStored<User[]>(USERS_KEY, []);
};

export const updateUser2FA = async (userId: string, enabled: boolean): Promise<User> => {
  await delay(500);
  const users = getStored<User[]>(USERS_KEY, []);
  const updatedUsers = users.map(u => u.id === userId ? { ...u, is2FAEnabled: enabled } : u);
  setStored(USERS_KEY, updatedUsers);
  
  const user = updatedUsers.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  
  logAudit(userId, `2FA ${enabled ? 'Enabled' : 'Disabled'}`, userId, generateHash());
  return user;
};

export const authorizeUser = async (userId: string, adminId: string): Promise<string> => {
  await delay(1500);
  const users = getStored<User[]>(USERS_KEY, []);
  const updated = users.map(u => u.id === userId ? { ...u, isAuthorized: true } : u);
  setStored(USERS_KEY, updated);
  
  const txHash = generateHash();
  logAudit(adminId, `Authorized user ${userId}`, userId, txHash);
  return txHash;
};

export const rejectUser = async (userId: string, adminId: string): Promise<string> => {
  await delay(1500);
  const users = getStored<User[]>(USERS_KEY, []);
  
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) throw new Error("User not found");

  // Remove user from the list (simulate rejection/deletion of pending account)
  const updatedUsers = users.filter(u => u.id !== userId);
  setStored(USERS_KEY, updatedUsers);
  
  const txHash = generateHash();
  logAudit(adminId, `Rejected and Removed user ${targetUser.name} (${userId})`, userId, txHash);
  return txHash;
};

// --- ACCESS CONTROL (REQUEST/GRANT) ---

export const requestAccess = async (doctorId: string, patientId: string): Promise<AccessStatus> => {
  await delay(1000);
  
  // Verify Patient Exists
  const users = getStored<User[]>(USERS_KEY, []);
  const targetPatient = users.find(u => 
    (u.id === patientId || u.walletAddress === patientId) && u.role === UserRole.PATIENT
  );

  if (!targetPatient) {
    throw new Error("Patient not found in the blockchain.");
  }
  
  const normalizedPatientId = targetPatient.id;

  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  
  // Check if already exists
  const existing = permissions.find(p => p.patientId === normalizedPatientId && p.doctorId === doctorId);
  if (existing) {
    return existing.status;
  }

  const txHash = generateHash();
  const newRequest: AccessPermission = {
    patientId: normalizedPatientId,
    doctorId,
    status: 'PENDING',
    txHash,
    timestamp: Date.now()
  };

  setStored(PERMISSIONS_KEY, [...permissions, newRequest]);
  logAudit(doctorId, `Requested access to patient ${normalizedPatientId}`, normalizedPatientId, txHash);
  
  return 'PENDING';
};

export const respondToAccessRequest = async (
  patientId: string, 
  doctorId: string, 
  status: 'GRANTED' | 'DENIED'
): Promise<string> => {
  await delay(1000);
  const txHash = generateHash();
  
  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  
  const existingIndex = permissions.findIndex(p => p.patientId === patientId && p.doctorId === doctorId);
  
  if (existingIndex > -1) {
    // Update existing request
    const updated = [...permissions];
    updated[existingIndex] = { ...updated[existingIndex], status, txHash, timestamp: Date.now() };
    setStored(PERMISSIONS_KEY, updated);
  } else {
    const newPerm: AccessPermission = {
      patientId,
      doctorId,
      status,
      txHash,
      timestamp: Date.now()
    };
    setStored(PERMISSIONS_KEY, [...permissions, newPerm]);
  }

  logAudit(patientId, `Access ${status} for doctor ${doctorId}`, doctorId, txHash);
  return txHash;
};

export const grantEmergencyAccess = async (
  patientId: string,
  doctorId: string,
  durationHours: number
): Promise<string> => {
  await delay(1500); // Simulate critical mining transaction
  const txHash = generateHash();
  
  const expiryTimestamp = Date.now() + (durationHours * 60 * 60 * 1000);
  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);

  // Remove existing permission if exists (to overwrite with emergency)
  const filtered = permissions.filter(p => !(p.patientId === patientId && p.doctorId === doctorId));
  
  const newPerm: AccessPermission = {
    patientId,
    doctorId,
    status: 'GRANTED',
    txHash,
    timestamp: Date.now(),
    isEmergency: true,
    expiryTimestamp
  };

  setStored(PERMISSIONS_KEY, [...filtered, newPerm]);
  logAudit(patientId, `EMERGENCY ACCESS GRANTED (${durationHours}h) to ${doctorId}`, doctorId, txHash);

  return txHash;
};

export const getAccessStatus = async (doctorId: string, patientId: string): Promise<AccessStatus | null> => {
  await delay(300);
  
  // Resolve patientId if it's a wallet address
  const users = getStored<User[]>(USERS_KEY, []);
  const targetPatient = users.find(u => (u.id === patientId || u.walletAddress === patientId));
  const normalizedPid = targetPatient ? targetPatient.id : patientId;

  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  const perm = permissions.find(p => p.patientId === normalizedPid && p.doctorId === doctorId);
  
  if (perm && perm.expiryTimestamp && Date.now() > perm.expiryTimestamp) {
    return 'DENIED'; 
  }

  return perm ? perm.status : null;
};

export const getAccessRequestDetails = async (doctorId: string, patientId: string): Promise<AccessPermission | null> => {
  await delay(300);
  const users = getStored<User[]>(USERS_KEY, []);
  const targetPatient = users.find(u => (u.id === patientId || u.walletAddress === patientId));
  const normalizedPid = targetPatient ? targetPatient.id : patientId;

  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  return permissions.find(p => p.patientId === normalizedPid && p.doctorId === doctorId) || null;
};

export const getPendingRequests = async (patientId: string): Promise<AccessPermission[]> => {
  await delay(500);
  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  return permissions.filter(p => p.patientId === patientId && p.status === 'PENDING');
};

export const getAccessList = async (patientId: string): Promise<AccessPermission[]> => {
  await delay(500);
  const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
  return permissions.filter(p => p.patientId === patientId);
};

// --- RECORD MANAGEMENT ---

export const uploadRecord = async (
  file: File, 
  metadata: Partial<MedicalRecord>, 
  uploaderId: string
): Promise<MedicalRecord> => {
  await delay(2000); // Upload + Mining simulation

  const txHash = generateHash();
  const ipfsHash = generateIPFSHash(); 
  
  // Resolve patient ID
  const users = getStored<User[]>(USERS_KEY, []);
  const targetPatient = users.find(u => (u.id === metadata.patientId || u.walletAddress === metadata.patientId));
  const normalizedPid = targetPatient ? targetPatient.id : metadata.patientId!;

  const newRecord: MedicalRecord = {
    id: Date.now().toString(),
    patientId: normalizedPid,
    doctorId: uploaderId,
    doctorName: metadata.doctorName || 'Unknown Doctor',
    description: metadata.description || 'No description',
    ipfsHash: ipfsHash,
    fileType: file.type,
    category: metadata.category as any,
    timestamp: Date.now(),
    txHash: txHash
  };

  const records = getStored<MedicalRecord[]>(RECORDS_KEY, []);
  setStored(RECORDS_KEY, [...records, newRecord]);

  logAudit(uploaderId, `Uploaded record for ${normalizedPid}`, newRecord.id, txHash);
  return newRecord;
};

export const getPatientRecords = async (patientId: string, requesterId: string, requesterRole: UserRole): Promise<MedicalRecord[]> => {
  await delay(1000);
  
  // Resolve IDs
  const users = getStored<User[]>(USERS_KEY, []);
  const targetPatient = users.find(u => (u.id === patientId || u.walletAddress === patientId));
  const normalizedPid = targetPatient ? targetPatient.id : patientId;

  // Access Control
  if (requesterRole === UserRole.DOCTOR && requesterId !== normalizedPid) {
    const permissions = getStored<AccessPermission[]>(PERMISSIONS_KEY, []);
    const perm = permissions.find(p => p.patientId === normalizedPid && p.doctorId === requesterId);
    
    // Check Existence and Status
    if (!perm || perm.status !== 'GRANTED') {
      throw new Error("Access Denied: You do not have permission to view this patient's records.");
    }

    // Check Expiry for Emergency or Time-limited Access
    if (perm.expiryTimestamp && Date.now() > perm.expiryTimestamp) {
       throw new Error("Access Expired: Your temporary emergency access has ended.");
    }
  }

  const records = getStored<MedicalRecord[]>(RECORDS_KEY, []);
  return records.filter(r => r.patientId === normalizedPid);
};

// --- AUDIT ---

const logAudit = (actorId: string, action: string, targetId: string, txHash: string) => {
  const logs = getStored<AuditLog[]>(AUDIT_KEY, []);
  const newLog: AuditLog = {
    id: Date.now().toString(),
    actorId,
    action,
    targetId,
    timestamp: Date.now(),
    txHash
  };
  setStored(AUDIT_KEY, [newLog, ...logs]); // Newest first
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  await delay(600);
  return getStored<AuditLog[]>(AUDIT_KEY, []);
};
