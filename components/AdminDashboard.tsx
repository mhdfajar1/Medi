
import React, { useState, useEffect } from 'react';
import { User, UserRole, AuditLog } from '../types';
import * as blockchain from '../services/blockchainService';

interface Props {
  user: User;
}

const AdminDashboard: React.FC<Props> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    const [u, a] = await Promise.all([
      blockchain.getUsers(),
      blockchain.getAuditLogs()
    ]);
    setUsers(u);
    setAuditLogs(a);
  };

  const handleAuthorize = async (targetUserId: string) => {
    setProcessing(targetUserId);
    try {
      await blockchain.authorizeUser(targetUserId, user.id);
      await loadData();
      if (selectedUser && selectedUser.id === targetUserId) {
         setSelectedUser(prev => prev ? ({...prev, isAuthorized: true}) : null);
      }
    } catch (e) {
      alert("Failed to authorize");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to reject and remove this user? This action cannot be undone.")) {
      return;
    }
    setProcessing(targetUserId);
    try {
      await blockchain.rejectUser(targetUserId, user.id);
      await loadData();
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser(null);
      }
    } catch (e) {
      alert("Failed to reject user");
    } finally {
      setProcessing(null);
    }
  };

  const pendingUsers = users.filter(u => !u.isAuthorized);
  const activeUsers = users.filter(u => u.isAuthorized);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-1 text-sm font-medium transition ${activeTab === 'users' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-1 text-sm font-medium transition ${activeTab === 'audit' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          Audit Logs (Blockchain)
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-8">
          
          {/* ACTION REQUIRED SECTION */}
          {pendingUsers.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl overflow-hidden shadow-md animate-in slide-in-from-top-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/40 px-6 py-4 border-b border-yellow-200 dark:border-yellow-900/30 flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-600"></span>
                    </span>
                   <h3 className="font-bold text-yellow-800 dark:text-yellow-500">Action Required: Pending Approvals</h3>
                 </div>
                 <span className="bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-xs font-bold px-2 py-1 rounded-full">
                   {pendingUsers.length} Requests
                 </span>
              </div>
              <div className="divide-y divide-yellow-100 dark:divide-yellow-900/30">
                {pendingUsers.map(u => (
                  <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 transition">
                     <div className="flex items-start space-x-4 mb-3 md:mb-0">
                        <div className="w-10 h-10 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center text-yellow-700 dark:text-yellow-300 font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{u.name}</h4>
                          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                             <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 rounded uppercase font-bold">{u.role}</span>
                             <span>License: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{u.licenseNumber || 'N/A'}</span></span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Wallet: {u.walletAddress}</p>
                        </div>
                     </div>
                     <div className="flex space-x-3">
                       <button 
                         onClick={() => setSelectedUser(u)}
                         className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                       >
                         View Details
                       </button>
                       <button 
                         onClick={() => handleReject(u.id)}
                         disabled={!!processing}
                         className="px-4 py-2 text-sm font-bold text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-lg transition disabled:opacity-50"
                       >
                         Reject
                       </button>
                       <button 
                         onClick={() => handleAuthorize(u.id)}
                         disabled={!!processing}
                         className="px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center"
                       >
                         {processing === u.id ? 'Verifying...' : 'Verify & Approve'}
                       </button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE USERS TABLE */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
               <h3 className="font-bold text-slate-700 dark:text-slate-200">Authorized Users Directory</h3>
               <span className="text-xs text-slate-500 dark:text-slate-400">{activeUsers.length} active accounts</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">User Name</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Role</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">License / ID</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {activeUsers.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedUser(u)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                  >
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded font-mono uppercase
                        ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          u.role === UserRole.DOCTOR ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          u.role === UserRole.PATIENT ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {u.licenseNumber ? u.licenseNumber : <span className="opacity-50">-</span>}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </span>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                          title="View Details"
                        >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 dark:bg-slate-950 rounded-xl shadow-lg border border-slate-800 dark:border-slate-900 overflow-hidden text-slate-300 font-mono text-sm">
           <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
             <span>Blockchain Ledger - Immutable Audit Trail</span>
             <span className="text-xs text-slate-500">Last synced: Just now</span>
           </div>
           <div className="max-h-[500px] overflow-auto p-4 space-y-2">
             {auditLogs.map(log => (
               <div key={log.id} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4 p-2 border-b border-slate-800/50 hover:bg-white/5">
                 <span className="text-teal-500 min-w-[150px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                 <span className="text-orange-400 min-w-[100px]">ID: {log.actorId}</span>
                 <span className="flex-1 text-white">{log.action}</span>
                 <span className="text-slate-600 text-xs truncate max-w-[150px]">TX: {log.txHash}</span>
               </div>
             ))}
             {auditLogs.length === 0 && <div className="text-center p-4 text-slate-600">No transactions recorded yet.</div>}
           </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                    ${selectedUser.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                      selectedUser.role === UserRole.DOCTOR ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      selectedUser.role === UserRole.PATIENT ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                       <span>{selectedUser.id}</span>
                       <span>•</span>
                       <span>{selectedUser.role}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {/* Modal Content */}
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</label>
                   <div className="flex items-center">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedUser.isAuthorized ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                        {selectedUser.isAuthorized ? 'Authorized' : 'Pending Approval'}
                     </span>
                     {!selectedUser.isAuthorized && (
                        <div className="ml-3 flex space-x-2">
                           <button 
                             onClick={() => handleAuthorize(selectedUser.id)}
                             disabled={!!processing}
                             className="text-xs text-teal-600 hover:text-teal-700 font-bold underline"
                           >
                             Approve
                           </button>
                           <span className="text-slate-300">|</span>
                           <button 
                             onClick={() => handleReject(selectedUser.id)}
                             disabled={!!processing}
                             className="text-xs text-red-600 hover:text-red-700 font-bold underline"
                           >
                             Reject
                           </button>
                        </div>
                     )}
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                   <div className="text-sm font-medium text-slate-900 dark:text-white">{selectedUser.email || 'N/A'}</div>
                </div>

                <div className="space-y-1 col-span-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wallet Address</label>
                   <div className="font-mono text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 break-all text-slate-600 dark:text-slate-300">
                     {selectedUser.walletAddress}
                   </div>
                </div>

                {/* Specific Fields for Doctors */}
                {selectedUser.role === UserRole.DOCTOR && (
                  <>
                     <div className="col-span-1 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Professional Credentials
                        </h4>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical License ID</label>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-blue-800 dark:text-blue-300 font-mono font-medium">
                          {selectedUser.licenseNumber || 'N/A'}
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialization</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                          {selectedUser.specialization || 'General Practitioner'}
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                          {selectedUser.experience ? `${selectedUser.experience} Years` : 'Not specified'}
                        </div>
                     </div>
                  </>
                )}
             </div>

             <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Close
                </button>
             </div>

           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
