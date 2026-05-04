
import React, { useState, useEffect } from 'react';
import { User, MedicalRecord, UserRole, AccessStatus } from '../types';
import * as blockchain from '../services/blockchainService';
// @ts-ignore
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  user: User;
}

const DoctorDashboard: React.FC<Props> = ({ user }) => {
  const [patientId, setPatientId] = useState('');
  const [normalizedPatientId, setNormalizedPatientId] = useState('');
  const resolvePatient = async (patientId: string) => {
    const users = await blockchain.getUsers();
    return users.find(u =>
      (u.id === patientId || u.walletAddress === patientId) &&
      u.role === UserRole.PATIENT
    );
  };
  const [currentPatientRecords, setCurrentPatientRecords] = useState<MedicalRecord[]>([]);
  const [viewState, setViewState] = useState<'IDLE' | 'LOADING' | 'VIEWING' | 'ERROR' | 'PENDING'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [requestTimestamp, setRequestTimestamp] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(true);
  
  // History Filter State
  const [historyFilter, setHistoryFilter] = useState('All');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: 'timestamp' | 'category', direction: 'asc' | 'desc' }>({ 
    key: 'timestamp', 
    direction: 'desc' 
  });
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadData, setUploadData] = useState({
    description: '',
    category: 'Prescription'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0); // Used to reset file input

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);

  // Effect to handle scanner lifecycle
  useEffect(() => {
    let scanner: any = null;
    if (showScanner) {
      // Small delay to ensure the DOM element exists
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            false
          );
          
          scanner.render(
            (decodedText: string) => {
              setPatientId(decodedText);
              setShowScanner(false);
            },
            (error: any) => {
              // Ignore scan errors as they happen frequently while searching
            }
          );
        } catch (e) {
          console.error("Scanner initialization failed", e);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch((e: any) => console.error("Failed to clear scanner", e));
        }
      };
    }
  }, [showScanner]);

  // If doctor is not authorized yet
  if (!user.isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="relative">
           <div className="absolute -inset-1 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
           <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 relative z-10">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
        </div>
        <div>
           <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Account Pending Verification</h2>
           <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
             Your account is currently under review by the MediChain Administration board. 
             This process typically takes 24-48 hours to verify your medical credentials.
           </p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md w-full">
           <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Submitted Credentials</h3>
           <div className="space-y-3 text-left">
              <div className="flex justify-between">
                 <span className="text-sm text-slate-500">License ID</span>
                 <span className="font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 rounded">{user.licenseNumber}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-sm text-slate-500">Specialization</span>
                 <span className="font-medium text-slate-800 dark:text-slate-200">{user.specialization}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-sm text-slate-500">Wallet</span>
                 <span className="font-mono text-xs text-slate-400 truncate w-32">{user.walletAddress}</span>
              </div>
           </div>
        </div>

        <button 
           onClick={() => window.location.reload()}
           className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition shadow-lg"
        >
           Check Approval Status
        </button>
      </div>
    );
  }

 const fetchRecords = async () => {
  if (!patientId) return;

  setViewState('LOADING');
  setErrorMsg('');

  try {
    const target = await resolvePatient(patientId);

    if (!target) {
      setViewState('ERROR');
      setErrorMsg("Patient does not exist.");
      return;
    }

    

    // ✅ ALWAYS use normalized ID
    const normalizedPatientId = target.id;
    setNormalizedPatientId(normalizedPatientId);

    const status = await blockchain.getAccessStatus(user.id, normalizedPatientId);

    if (status === 'GRANTED') {
      const records = await blockchain.getPatientRecords(
        normalizedPatientId,
        user.id,
        UserRole.DOCTOR
      );

      setCurrentPatientRecords(records);
      setViewState('VIEWING');
      setHistoryFilter('All');
      setSortConfig({ key: 'timestamp', direction: 'desc' });

    } else if (status === 'PENDING') {
      const details = await blockchain.getAccessRequestDetails(user.id, normalizedPatientId);
      if (details) setRequestTimestamp(details.timestamp);
      setViewState('PENDING');

    } else if (status === 'DENIED') {
      setViewState('ERROR');
      setErrorMsg("Access was denied by patient.");
    } else {
      setViewState('ERROR');
      setErrorMsg("No access yet. Request access.");
    }
  } catch (err: any) {
    setViewState('ERROR');
    setErrorMsg(err.message || "Failed to fetch records");
  }
};

const handleRequestAccess = async () => {
  if (!patientId) return;

  try {
    const target = await resolvePatient(patientId);
    
    if (!target) {
      alert("Patient does not exist.");
      return;
    }

    const normalizedPatientId = target.id;
    setNormalizedPatientId(normalizedPatientId); // ✅ important

    setViewState('LOADING');
    setErrorMsg('');

    const status = await blockchain.getAccessStatus(user.id, normalizedPatientId);

    if (status === 'GRANTED') {
      alert("You already have access to this patient.");
      setViewState('VIEWING');
      return;
    }

    if (status === 'PENDING') {
      alert("Request already pending");
      setViewState('PENDING');
      return;
    }

    await blockchain.requestAccess(user.id, normalizedPatientId);

    const details = await blockchain.getAccessRequestDetails(user.id, normalizedPatientId);
    if (details) setRequestTimestamp(details.timestamp);

    alert("Access request sent successfully.");
    setViewState('PENDING');

  } catch (err: any) {
    setViewState('ERROR');
    setErrorMsg(err.message || "Failed to send request");
  }
};
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !normalizedPatientId) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90; // Hold at 90 until complete
        return prev + 5;
      });
    }, 150);

    try {
      await blockchain.uploadRecord(selectedFile, {
        patientId: normalizedPatientId,
        doctorName: user.name,
        description: uploadData.description,
        category: uploadData.category as any
      }, user.id);
      
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      // Small delay to show 100% completion before resetting
      await new Promise(r => setTimeout(r, 600));

      // Reset and reload
      setUploadData({ description: '', category: 'Prescription' });
      setSelectedFile(null);
      setFormKey(prev => prev + 1); // Clears the file input
      
      await fetchRecords();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(progressInterval);
    }
  };

  // Sort Handler
  const handleSort = (key: 'timestamp' | 'category') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filter AND Sort Logic
  const processedRecords = currentPatientRecords
  .filter(rec => {
    // 🔥 NEW: hide archived logic
    if (!showArchived && rec.status === 'ARCHIVED') return false;

    if (historyFilter === 'All') return true;
    if (historyFilter === 'Clinical') return ['Medical History', 'Treatment Notes', 'Diagnosis', 'Follow-up Report'].includes(rec.category);
    if (historyFilter === 'Labs') return rec.category === 'Lab Report';
    if (historyFilter === 'Imaging') return rec.category === 'X-Ray/Scan';
    if (historyFilter === 'Rx') return rec.category === 'Prescription';
    return true;
  })
    .sort((a, b) => {
      if (sortConfig.key === 'timestamp') {
        return sortConfig.direction === 'asc' 
          ? a.timestamp - b.timestamp 
          : b.timestamp - a.timestamp;
      } else {
        // Category Sort
        return sortConfig.direction === 'asc'
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 relative">
      {/* Wallet Status Bar (Simulated MetaMask) */}
      <div className="lg:col-span-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center">
             <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
             MetaMask Connected
           </span>
        </div>
        <div className="text-xs font-mono text-orange-700 dark:text-orange-300">
          {user.walletAddress}
        </div>
      </div>

      {/* Left Col: Patient Search & Upload */}
      <div className="lg:col-span-1 space-y-6">
        {/* Search */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Patient Lookup</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Patient ID / Wallet</label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter ID or Scan QR..."
                  disabled={isUploading}
                  className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                />
                <button 
                  onClick={() => setShowScanner(true)}
                  className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  title="Scan QR Code"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </button>
              </div>
            </div>
            <button 
              onClick={fetchRecords}
              disabled={!patientId || viewState === 'LOADING' || isUploading}
              className="w-full py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition disabled:opacity-50"
            >
              {viewState === 'LOADING' ? 'Checking Smart Contract...' : 'Find Patient'}
            </button>
          </div>
        </div>

        {/* Upload Form - Only visible if viewing a patient */}
        {viewState === 'VIEWING' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Medical Record</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Record Category</label>
                <select 
                  value={uploadData.category}
                  onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                  disabled={isUploading}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md outline-none bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                >
                  <option value="Prescription">Prescription</option>
                  <option value="Diagnosis">Diagnosis Report</option>
                  <option value="Treatment Notes">Treatment Notes</option>
                  <option value="Follow-up Report">Follow-up Report</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="X-Ray/Scan">X-Ray/Scan</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Description / Notes</label>
                <textarea 
                  value={uploadData.description}
                  onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                  disabled={isUploading}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md outline-none bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                  rows={3}
                  placeholder="Enter details about the diagnosis, prescription dosage, or treatment plan..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">File Attachment</label>
                <input 
                  key={formKey}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Secure Flow Indicator */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Secure Upload Process</p>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex flex-col items-center">
                    <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    File
                  </span>
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  <span className="flex flex-col items-center">
                    <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    IPFS
                  </span>
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                   <span className="flex flex-col items-center">
                    <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Chain
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>{uploadProgress === 100 ? 'Finalizing...' : 'Uploading to IPFS & Blockchain...'}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ease-out ${uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={isUploading}
                className={`w-full py-2 text-white rounded-md transition flex items-center justify-center space-x-2 
                  ${isUploading 
                    ? 'bg-slate-400 cursor-not-allowed dark:bg-slate-600' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                  }`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Sign & Upload to Chain</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Col: Records View */}
      <div className="lg:col-span-2">
        {viewState === 'IDLE' && (
          <div className="h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 text-slate-400 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg">Enter a Patient ID or Scan QR to begin.</p>
          </div>
        )}

        {viewState === 'PENDING' && (
          <div className="h-full flex flex-col items-center justify-center bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-900/30 p-10 text-yellow-700 dark:text-yellow-500 text-center">
             <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <h3 className="text-2xl font-bold mb-2">Awaiting Patient Approval</h3>
             <p className="max-w-md mb-6">
               Access request for <span className="font-mono font-bold bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">{normalizedPatientId}</span> has been broadcast to the network.
               <br/>
               {requestTimestamp && (
                  <span className="block mt-4 text-sm font-semibold opacity-80">
                    Request Time: {new Date(requestTimestamp).toLocaleString()}
                  </span>
               )}
               <br/>
               The patient needs to approve this request from their dashboard using their private key.
             </p>
             <button 
               onClick={fetchRecords} 
               className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold"
             >
               Check Status Again
             </button>
          </div>
        )}
        
        {viewState === 'ERROR' && (
          <div className="p-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center shadow-lg h-full">
            
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {errorMsg === "Patient does not exist."
                ? "Patient Not Found"
                : "Access Restricted"}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {errorMsg}
            </p>

            {/* Only show request button if patient EXISTS */}
            {errorMsg !== "Patient does not exist." && (
              <button 
                onClick={handleRequestAccess}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Request Access
              </button>
            )}

          </div>
        )}

        {viewState === 'VIEWING' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
               <div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">Full Medical History</h3>
                 <p className="text-sm text-slate-500">Patient ID: <span className="font-mono">{patientId}</span></p>
               </div>
               <div className="flex flex-wrap gap-2">
                  {['All', 'Clinical', 'Labs', 'Imaging', 'Rx'].map(f => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${historyFilter === f ? 'bg-teal-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                  onClick={() => setShowArchived(prev => !prev)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700"
                  >
                    {showArchived ? 'Hide Archived' : 'Show Archived'}
                  </button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th 
                      onClick={() => handleSort('timestamp')}
                      className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none flex items-center gap-1 group"
                    >
                      Date
                      {sortConfig.key === 'timestamp' && (
                        <span className="text-teal-500">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      {sortConfig.key !== 'timestamp' && <span className="opacity-0 group-hover:opacity-30">↓</span>}
                    </th>
                    <th 
                      onClick={() => handleSort('category')}
                      className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {sortConfig.key === 'category' && (
                          <span className="text-teal-500">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {sortConfig.key !== 'category' && <span className="opacity-0 group-hover:opacity-30">↓</span>}
                      </div>
                    </th>
                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Description</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Doctor</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">STATUS</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {processedRecords.map(rec => (
                    <tr 
                        key={rec.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                          rec.status === 'ARCHIVED' ? 'opacity-50' : ''
                        }`}
                      >
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {new Date(rec.timestamp).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded font-medium
                          ${rec.category === 'Prescription' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            rec.category === 'Lab Report' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            ['Medical History', 'Treatment Notes'].includes(rec.category) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {rec.category}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-800 dark:text-slate-200 font-medium">{rec.description}</td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{rec.doctorName}</td>
                      <td className="p-4">
                        {rec.status === 'ARCHIVED' ? (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded">
                            🟡 Archived
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded">
                            🟢 Active
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <a 
                          href={`https://ipfs.io/ipfs/${rec.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 text-sm font-medium flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {processedRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        No records found for this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md relative shadow-2xl border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setShowScanner(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title="Close"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center">
                    <svg className="w-5 h-5 mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    Scan Patient QR
                </h3>
                {/* The scanner renders into this element */}
                <div id="reader" className="overflow-hidden rounded-lg bg-black"></div>
                <p className="text-center text-xs text-slate-500 mt-4">Point your camera at a valid Patient ID QR code.</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
