
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import * as blockchain from '../services/blockchainService';

interface SettingsProps {
  user: User;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

interface NotificationSettings {
  email: boolean;
  accessRequests: boolean;
  newRecords: boolean;
  securityAlerts: boolean;
}

const Settings: React.FC<SettingsProps> = ({ user, darkMode, toggleDarkMode, onUpdateUser }) => {
  // Initialize state from local storage or default
  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('medichain_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse notifications settings", e);
      }
    }
    return {
      email: true,
      accessRequests: true,
      newRecords: true,
      securityAlerts: true,
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!user.is2FAEnabled);

  // Effect to persist notifications
  useEffect(() => {
    localStorage.setItem('medichain_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleNotification = (key: keyof NotificationSettings) => {
    setNotifications((prev) => {
      const newState = { ...prev, [key]: !prev[key] };
      // User friendly labels
      const labels: Record<string, string> = {
        email: "Email",
        accessRequests: "Access Request",
        newRecords: "New Record",
        securityAlerts: "Security"
      };
      showToast(`${labels[key]} notifications ${newState[key] ? 'enabled' : 'disabled'}`);
      return newState;
    });
  };

  const toggle2FA = async () => {
    try {
      const newValue = !twoFactorEnabled;
      setTwoFactorEnabled(newValue);
      await blockchain.updateUser2FA(user.id, newValue);
      onUpdateUser({ is2FAEnabled: newValue });
      showToast(`Two-Factor Authentication ${newValue ? 'Enabled' : 'Disabled'}`);
    } catch (e) {
      showToast("Failed to update 2FA settings", "info");
      setTwoFactorEnabled(!twoFactorEnabled); // Revert on error
    }
  };

  const handleSaveProfile = () => {
    if (editName.trim()) {
      onUpdateUser({ name: editName });
      setIsEditing(false);
      showToast("Profile updated successfully");
    }
  };

  const handleCancelEdit = () => {
    setEditName(user.name);
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="w-5 h-5 text-green-400 dark:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Account Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your profile and application preferences.</p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">User Profile</h3>
          <div className="flex items-center space-x-4">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleCancelEdit}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition"
                >
                  Save Changes
                </button>
              </div>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
              ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                user.role === UserRole.DOCTOR ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'}`}>
              {user.role}
            </span>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
             <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Full Name</label>
             {isEditing ? (
               <input 
                 type="text" 
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 className="w-full p-3 border border-teal-500 rounded-lg outline-none bg-white dark:bg-slate-700 dark:text-white font-medium focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900"
                 autoFocus
               />
             ) : (
               <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                 {user.name}
               </div>
             )}
          </div>
          
          <div className="space-y-1">
             <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">User ID</label>
             <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-mono text-sm cursor-not-allowed opacity-75">
               {user.id}
             </div>
          </div>

          <div className="space-y-1 md:col-span-2">
             <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Wallet Address</label>
             <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-mono text-sm flex justify-between items-center">
               <span>{user.walletAddress}</span>
               <span className="text-green-500 text-xs font-bold flex items-center">
                 <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                 CONNECTED
               </span>
             </div>
          </div>

          {user.licenseNumber && (
            <div className="space-y-1 md:col-span-2">
               <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Medical License</label>
               <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg text-yellow-800 dark:text-yellow-500 font-mono font-medium">
                 {user.licenseNumber}
               </div>
            </div>
          )}

          {user.specialization && (
             <div className="space-y-1">
               <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Specialization</label>
               <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                 {user.specialization}
               </div>
             </div>
          )}

          {user.experience && (
             <div className="space-y-1">
               <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Experience</label>
               <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                 {user.experience} Years
               </div>
             </div>
          )}
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Application Preferences</h3>
        </div>
        <div className="p-6 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Dark Mode</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Reduce eye strain with a dark color scheme.</p>
            </div>
            <button 
              onClick={() => {
                toggleDarkMode();
                showToast(`Dark mode ${!darkMode ? 'enabled' : 'disabled'}`);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${darkMode ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Require a code when logging in.</p>
            </div>
            <button 
              onClick={toggle2FA}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${twoFactorEnabled ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Notification Preferences</h3>
        </div>
        <div className="p-6 space-y-6">
          
           <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Email Notifications</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive summaries and important alerts via email.</p>
            </div>
            <button 
              onClick={() => toggleNotification('email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${notifications.email ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${notifications.email ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Access Request Alerts</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Get notified immediately when a doctor requests access.</p>
            </div>
            <button 
              onClick={() => toggleNotification('accessRequests')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${notifications.accessRequests ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${notifications.accessRequests ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">New Record Alerts</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive a notification when a new medical record is uploaded.</p>
            </div>
            <button 
              onClick={() => toggleNotification('newRecords')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${notifications.newRecords ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${notifications.newRecords ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Security Alerts</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Notifies you of any suspicious account activity or logins.</p>
            </div>
            <button 
              onClick={() => toggleNotification('securityAlerts')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${notifications.securityAlerts ? 'bg-teal-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${notifications.securityAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Settings;
