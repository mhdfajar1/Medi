
import React, { useState, useEffect } from 'react';
import { User, MedicalRecord, UserRole, AccessPermission, AuditLog } from '../types';
import * as blockchain from '../services/blockchainService';
import { analyzeMedicalRecord } from '../services/geminiService';

interface Props {
  user: User;
  activeTab?: string;
}

// Helper Component for Countdown
const EmergencyTimer: React.FC<{ expiry: number }> = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState<string>('Calculated...');

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('EXPIRED');
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Pad with zeros
      const h = hours < 10 ? `0${hours}` : hours;
      const m = minutes < 10 ? `0${minutes}` : minutes;
      const s = seconds < 10 ? `0${seconds}` : seconds;

      setTimeLeft(`${h}h : ${m}m : ${s}s`);
    };

    calculateTime(); // Initial call
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [expiry]);

  return <span className="font-mono tracking-widest">{timeLeft}</span>;
};

const PatientDashboard: React.FC<Props> = ({ user, activeTab = 'dashboard' }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessPermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [processing, setProcessing] = useState(false);

  // AI Analysis State
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [visibleAnalyses, setVisibleAnalyses] = useState<Record<string, boolean>>({});
  const [confirmAnalysisId, setConfirmAnalysisId] = useState<string | null>(null);

  // Emergency State
  const [selectedEmergencyDoc, setSelectedEmergencyDoc] = useState('');
  const [emergencyDuration, setEmergencyDuration] = useState(24); // hours

  // Upload State
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadData, setUploadData] = useState({
    description: '',
    category: 'Medical History'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRecords, allUsers, myPermissions, pending, allLogs] = await Promise.all([
        blockchain.getPatientRecords(user.id, user.id, UserRole.PATIENT),
        blockchain.getUsers(),
        blockchain.getAccessList(user.id),
        blockchain.getPendingRequests(user.id),
        blockchain.getAuditLogs()
      ]);
      
      setRecords(myRecords.sort((a, b) => b.timestamp - a.timestamp));
      setDoctors(allUsers.filter(u => u.role === UserRole.DOCTOR));
      setPermissions(myPermissions.filter(p => p.status === 'GRANTED'));
      setPendingRequests(pending);

      const myLogs = allLogs.filter(l => l.targetId === user.id || l.actorId === user.id)
                            .sort((a, b) => b.timestamp - a.timestamp);
      setAuditLogs(myLogs);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async (doctorId: string, decision: 'GRANTED' | 'DENIED') => {
    setProcessing(true);
    try {
      await blockchain.respondToAccessRequest(user.id, doctorId, decision);
      await loadData();
    } catch (err) {
      alert("Transaction Failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleEmergencyGrant = async () => {
    if (!selectedEmergencyDoc) {
      alert("Please select a doctor for emergency access.");
      return;
    }
    if (!window.confirm(`Grant ${emergencyDuration} HOURS of emergency access to the selected doctor? This action is logged on the blockchain.`)) {
      return;
    }

    setProcessing(true);
    try {
      await blockchain.grantEmergencyAccess(user.id, selectedEmergencyDoc, emergencyDuration);
      alert("Emergency Access Granted");
      setSelectedEmergencyDoc('');
      await loadData();
    } catch (err) {
      alert("Failed to grant emergency access");
    } finally {
      setProcessing(false);
    }
  };

  const revokeAccess = async (doctorId: string) => {
    if (!window.confirm("Are you sure you want to revoke access?")) return;
    setProcessing(true);
    try {
      await blockchain.respondToAccessRequest(user.id, doctorId, 'DENIED');
      await loadData();
    } catch (err) {
      alert("Transaction Failed");
    } finally {
      setProcessing(false);
    }
  };

  const initiateAnalysis = (record: MedicalRecord) => {
    if (visibleAnalyses[record.id]) {
      setVisibleAnalyses(prev => ({ ...prev, [record.id]: false }));
      return;
    }
    if (analyses[record.id]) {
      setVisibleAnalyses(prev => ({ ...prev, [record.id]: true }));
      return;
    }
    setConfirmAnalysisId(record.id);
  };

  const proceedWithAnalysis = async () => {
    if (!confirmAnalysisId) return;
    const record = records.find(r => r.id === confirmAnalysisId);
    if (!record) return;

    setConfirmAnalysisId(null);
    setAnalyzingIds(prev => ({ ...prev, [record.id]: true }));
    try {
      const result = await analyzeMedicalRecord(record.description, record.category);
      setAnalyses(prev => ({ ...prev, [record.id]: result }));
      setVisibleAnalyses(prev => ({ ...prev, [record.id]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingIds(prev => ({ ...prev, [record.id]: false }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + 5;
      });
    }, 150);

    try {
      await blockchain.uploadRecord(selectedFile, {
        patientId: user.id,
        doctorName: "Patient Uploaded", // Special marker
        description: uploadData.description,
        category: uploadData.category as any
      }, user.id);
      
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      await new Promise(r => setTimeout(r, 600));

      setUploadData({ description: '', category: 'Medical History' });
      setSelectedFile(null);
      setFormKey(prev => prev + 1);
      setShowUpload(false);
      
      await loadData();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(progressInterval);
    }
  };

  if (loading) return <div className="text-center p-10 text-slate-500 dark:text-slate-400">Loading blockchain data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 relative">
      
      {/* Confirmation Modal for AI Summary */}
      {confirmAnalysisId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 text-center transform scale-100 animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600 dark:text-teal-400">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Analyze Record?</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
               This will send the record content to the Gemini AI engine for summarization. Proceed?
             </p>
             <div className="flex space-x-3">
               <button 
                 onClick={() => setConfirmAnalysisId(null)}
                 className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition"
               >
                 Cancel
               </button>
               <button 
                 onClick={proceedWithAnalysis}
                 className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition shadow-md"
               >
                 Generate
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ALERT: PENDING REQUESTS NOTIFICATION BANNER */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-500 text-white p-4 rounded-xl shadow-lg shadow-yellow-500/30 flex justify-between items-center animate-bounce-short">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div>
                <span className="block font-bold text-lg leading-tight">Action Required</span>
                <span className="text-sm text-yellow-50">You have {pendingRequests.length} pending access request(s) from doctors.</span>
              </div>
           </div>
           <button 
             onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
             className="bg-white text-yellow-600 hover:bg-yellow-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition"
           >
             Review Now
           </button>
        </div>
      )}

      {/* Blockchain Stats Reports - Always Visible */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ... stats ... */}
         <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-xl shadow-lg text-white">
          <div className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">Total Records Secured</div>
          <div className="text-3xl font-bold">{records.length}</div>
          <div className="text-xs text-teal-100 mt-2 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Cryptographically Signed
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
          <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Active Authorizations</div>
          <div className="text-3xl font-bold">{permissions.length}</div>
          <div className="text-xs text-blue-100 mt-2 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Doctors with Access
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
          <div className="text-purple-100 text-xs font-bold uppercase tracking-wider mb-1">Blockchain Interactions</div>
          <div className="text-3xl font-bold">{auditLogs.length}</div>
          <div className="text-xs text-purple-100 mt-2 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             Total Transactions
          </div>
        </div>
        <div className="bg-slate-800 dark:bg-slate-950 p-4 rounded-xl shadow-lg text-white border border-slate-700">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Network Status</div>
          <div className="text-2xl font-bold text-green-400 flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Mainnet Active
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Block: #14,293,021
          </div>
        </div>
      </section>

      {/* DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <>
          {/* Emergency Access & Pending Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* EMERGENCY ACCESS SECTION */}
            <section className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <svg className="w-24 h-24 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center mb-2">
                  Emergency Access
                </h2>
                <p className="text-red-800 dark:text-red-300 text-xs mb-4">
                  Grant temporary 24h+ access to a doctor. Logged on blockchain.
                </p>

                <div className="flex flex-col gap-3">
                  <select 
                    value={selectedEmergencyDoc}
                    onChange={(e) => setSelectedEmergencyDoc(e.target.value)}
                    className="w-full p-2 border border-red-200 dark:border-red-900 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleEmergencyGrant}
                    disabled={processing || !selectedEmergencyDoc}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm text-sm"
                  >
                    {processing ? 'Processing...' : 'GRANT ACCESS'}
                  </button>
                </div>
              </div>
            </section>

            {/* PENDING REQUESTS SECTION */}
            {pendingRequests.length > 0 ? (
              <section className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6">
                 <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-500 mb-4 flex items-center">
                   <span className="flex h-2 w-2 relative mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                   </span>
                   Pending Requests ({pendingRequests.length})
                 </h3>
                 <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                   {pendingRequests.map(req => {
                     const doc = doctors.find(d => d.id === req.doctorId);
                     return (
                       <div key={req.doctorId} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-yellow-100 dark:border-yellow-900/30">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <div className="font-bold text-sm text-slate-900 dark:text-white">{doc?.name || req.doctorId}</div>
                               <div className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(req.timestamp).toLocaleDateString()}</div>
                            </div>
                            {doc && (
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Wallet Address</div>
                                <div className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-600 dark:text-slate-300">
                                  {doc.walletAddress.substring(0, 8)}...{doc.walletAddress.substring(36)}
                                </div>
                              </div>
                            )}
                         </div>
                         <div className="flex space-x-2 mt-2">
                           <button onClick={() => handleAccessRequest(req.doctorId, 'GRANTED')} className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700">Approve Access</button>
                           <button onClick={() => handleAccessRequest(req.doctorId, 'DENIED')} className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200">Deny</button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </section>
            ) : (
              <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">No pending access requests.</p>
              </section>
            )}
          </div>
          
          {/* ... existing sections ... */}
          {/* Access Control Section */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Authorized Doctors</h2>
            {/* ... rest of the component */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map(perm => {
                 const doc = doctors.find(d => d.id === perm.doctorId);
                 if (!doc) return null;
                 
                 const isExpired = perm.expiryTimestamp && Date.now() > perm.expiryTimestamp;
                 
                 return (
                  <div key={perm.doctorId} className={`p-5 rounded-xl shadow-sm border flex flex-col justify-between transition
                      ${perm.isEmergency 
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }
                      ${isExpired ? 'opacity-60 grayscale' : ''}
                    `}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                        ${perm.isEmergency
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                        }`}>
                        {perm.isEmergency ? 'EM' : 'DR'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{doc.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{doc.walletAddress.substring(0, 12)}...</p>
                      </div>
                    </div>
                    
                    {perm.isEmergency && perm.expiryTimestamp && (
                      <div className="mb-3 w-full">
                         <div className="text-[10px] text-red-500 uppercase font-bold tracking-wider mb-1">Time Remaining</div>
                         <div className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded text-center border border-red-200 dark:border-red-900/50 shadow-inner">
                            {isExpired 
                              ? 'ACCESS EXPIRED' 
                              : <EmergencyTimer expiry={perm.expiryTimestamp} />
                            }
                         </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                      <span className={`text-sm font-medium ${perm.isEmergency ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {perm.isEmergency ? 'Emergency' : 'Authorized'}
                      </span>
                      {!isExpired && (
                        <button
                          onClick={() => revokeAccess(perm.doctorId)}
                          disabled={processing}
                          className="px-3 py-1.5 rounded-full text-xs font-bold transition bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {permissions.length === 0 && (
                 <div className="col-span-3 p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-dashed rounded-lg text-center text-slate-400 dark:text-slate-500">
                   No doctors currently have authorized access. Requests will appear above.
                 </div>
              )}
            </div>
          </section>

          {/* Transparency Report */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Blockchain Transparency Report</h2>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl shadow-lg border border-slate-800 dark:border-slate-900 overflow-hidden text-slate-300 font-mono text-sm">
               <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                 <span className="flex items-center gap-2">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                   Immutable Ledger Activity
                 </span>
                 <span className="text-xs text-slate-500">Verified by Network</span>
               </div>
               <div className="max-h-[300px] overflow-auto p-4 space-y-2">
                 {auditLogs.map(log => (
                   <div key={log.id} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4 p-2 border-b border-slate-800/50 hover:bg-white/5 transition">
                     <span className="text-teal-500 min-w-[150px]">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</span>
                     <span className="flex-1 text-white">
                        {log.actorId === user.id ? <span className="text-slate-400">You: </span> : <span className="text-orange-400">{log.actorId}: </span>}
                        {log.action}
                     </span>
                     <a 
                       href="#" 
                       className="text-slate-600 text-xs truncate max-w-[150px] hover:text-teal-400 transition"
                       title={log.txHash}
                     >
                       TX: {log.txHash}
                     </a>
                   </div>
                 ))}
               </div>
            </div>
          </section>
        </>
      )}

      {/* HISTORY VIEW (RECORDS) */}
      {activeTab === 'history' && (
        <section className="animate-in fade-in slide-in-from-bottom-2">
          {/* ... existing history code ... */}
           <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Medical History</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Securely stored on the decentralized network.</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>{showUpload ? 'Cancel Upload' : 'Upload Record'}</span>
              </button>
              <button onClick={loadData} className="px-4 py-2 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 border border-teal-200 dark:border-teal-900/50 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition">
                Refresh
              </button>
            </div>
          </div>

          {/* Upload Form Area */}
          {showUpload && (
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Upload Personal Medical Record</h3>
              <form onSubmit={handleUpload} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                    <select 
                      value={uploadData.category}
                      onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                      disabled={isUploading}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                    >
                      <option value="Lab Report">Lab Report (Outside Lab)</option>
                      <option value="Medical History">Old Medical Record / History</option>
                      <option value="X-Ray/Scan">X-Ray / MRI / Scan</option>
                      <option value="Treatment Notes">Personal Notes</option>
                    </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">File</label>
                     <input 
                        key={formKey}
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        disabled={isUploading}
                        className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 dark:file:bg-teal-900/30 file:text-teal-700 dark:file:text-teal-300 hover:file:bg-teal-100 dark:hover:file:bg-teal-900/50 cursor-pointer"
                        required
                      />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
                  <input 
                    type="text"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    disabled={isUploading}
                    placeholder="e.g. Blood test results from City Lab, 2023"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                    required
                  />
                </div>

                {isUploading && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-teal-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm disabled:opacity-50 flex items-center"
                  >
                    {isUploading ? 'Uploading...' : 'Secure Upload to Blockchain'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">No medical records found on the blockchain.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {records.map(record => {
                  const isSelfUploaded = record.doctorName === "Patient Uploaded" || record.doctorId === user.id;
                  
                  return (
                    <div key={record.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-750 transition group">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wide
                              ${record.category === 'Prescription' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                record.category === 'Lab Report' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                record.category === 'Medical History' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                              {record.category}
                            </span>
                            <span className="text-sm text-slate-400 dark:text-slate-500">
                              {new Date(record.timestamp).toLocaleDateString()}
                            </span>
                            {isSelfUploaded && (
                               <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase">
                                 Patient Uploaded
                               </span>
                            )}
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white">{record.description}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isSelfUploaded ? 'Uploaded by You' : `Dr. ${record.doctorName}`}
                          </p>
                          
                          <div className="pt-2 flex items-center space-x-4 text-xs text-slate-400 dark:text-slate-500 font-mono">
                            <span>IPFS: {record.ipfsHash.substring(0, 10)}...</span>
                            <span>TX: {record.txHash.substring(0, 10)}...</span>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <a 
                            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition shadow-sm flex items-center justify-center font-medium group-hover:border-teal-400 dark:group-hover:border-teal-500/50"
                            title="View/Download file from IPFS Gateway"
                          >
                            <svg className="w-4 h-4 mr-2 text-slate-400 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            View Medical Record
                          </a>
                          <button 
                            onClick={() => initiateAnalysis(record)}
                            disabled={analyzingIds[record.id]}
                            className={`px-4 py-2 text-white text-sm rounded-md transition shadow flex items-center justify-center gap-1
                              ${visibleAnalyses[record.id] 
                                ? 'bg-slate-600 hover:bg-slate-700 text-slate-100'
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30'
                              } ${analyzingIds[record.id] ? 'opacity-70 cursor-wait' : ''}`}
                          >
                             {analyzingIds[record.id] ? (
                               <>
                                 <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                 Summarizing...
                               </>
                             ) : visibleAnalyses[record.id] ? 'Hide Summary' : 'Generate Summary'}
                          </button>
                        </div>
                      </div>
                      
                      {visibleAnalyses[record.id] && analyses[record.id] && (
                        <div className="relative mt-4 p-5 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2 shadow-sm">
                          <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 rounded-l-xl"></div>
                          <button 
                            onClick={() => setVisibleAnalyses(prev => ({...prev, [record.id]: false}))}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                            title="Close"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <strong className="block mb-2 text-teal-800 dark:text-teal-400 flex items-center gap-2 text-sm uppercase tracking-wide font-bold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            AI Record Summary
                          </strong>
                          <p className="leading-relaxed">{analyses[record.id]}</p>
                          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                            Generated by Gemini 3 Flash.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default PatientDashboard;
