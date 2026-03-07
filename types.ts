
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  HOSPITAL = 'HOSPITAL'
}

export interface User {
  id: string;
  name: string;
  email?: string; // Added email field
  password: string; // Added password field for authentication
  role: UserRole;
  walletAddress: string;
  recoveryPhrase: string; // For account recovery
  isAuthorized: boolean; // For doctors/hospitals needing admin approval
  is2FAEnabled?: boolean; // Two-factor authentication status
  licenseNumber?: string; // Specific for doctors
  specialization?: string; // Specific for doctors
  experience?: number; // Specific for doctors
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  description: string;
  ipfsHash: string; // CID for the file
  fileType: string;
  timestamp: number;
  txHash: string; // Blockchain transaction hash
  category: 'Prescription' | 'Lab Report' | 'Diagnosis' | 'X-Ray/Scan' | 'Treatment Notes' | 'Follow-up Report' | 'Medical History';
}

export type AccessStatus = 'PENDING' | 'GRANTED' | 'DENIED';

export interface AccessPermission {
  patientId: string;
  doctorId: string;
  status: AccessStatus;
  txHash: string;
  timestamp: number;
  isEmergency?: boolean;      // Flag for emergency access
  expiryTimestamp?: number;   // Unix timestamp for when access expires
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  targetId: string;
  timestamp: number;
  txHash: string;
}
