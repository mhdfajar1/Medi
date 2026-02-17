
import React from 'react';
import { User, UserRole } from '../types';
import ChatAssistant from './ChatAssistant';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  darkMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, onNavigate, darkMode }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shadow-xl flex-shrink-0 transition-colors duration-200 z-20">
        <div className="p-6 border-b border-slate-800 dark:border-slate-900 flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/30">M</div>
          <span className="text-xl font-bold tracking-tight">MediChain</span>
        </div>
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {user && (
            <div className="mb-6 p-4 bg-slate-800 dark:bg-slate-900 rounded-xl border border-slate-700/50 shadow-sm">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Logged in as</p>
              <p className="font-medium truncate text-white">{user.name}</p>
              <span className={`inline-block px-2 py-0.5 mt-2 text-xs rounded-full border 
                ${user.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 
                  user.role === UserRole.DOCTOR ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 
                  'bg-teal-500/10 text-teal-300 border-teal-500/20'}`}>
                {user.role}
              </span>
            </div>
          )}

          <nav className="space-y-1">
            <button 
              onClick={() => onNavigate('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center
                ${activeTab === 'dashboard' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </button>

            {user?.role === UserRole.PATIENT && (
              <button 
                onClick={() => onNavigate('history')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center
                  ${activeTab === 'history' 
                    ? 'bg-teal-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                My Medical History
              </button>
            )}

            <button 
              onClick={() => onNavigate('settings')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center
                ${activeTab === 'settings' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings & Profile
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 dark:border-slate-900">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-200 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm z-10 p-4 flex justify-between items-center h-16 border-b border-slate-200 dark:border-slate-700 transition-colors duration-200">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
            {activeTab === 'settings' ? (
              'Settings'
            ) : (
              <>
                {user?.role === UserRole.ADMIN && 'System Administration'}
                {user?.role === UserRole.DOCTOR && 'Medical Practitioner Portal'}
                {user?.role === UserRole.PATIENT && (activeTab === 'history' ? 'My Medical History' : 'Patient Dashboard')}
              </>
            )}
          </h1>
          <div className="flex items-center space-x-4">
             {user && (
               <div className="hidden md:flex flex-col items-end">
                 <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Connected Wallet</span>
                 <span className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                   {user.walletAddress}
                 </span>
               </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 transition-colors duration-200 relative">
          {children}
        </div>

        {/* Global Chat Assistant */}
        {user && <ChatAssistant user={user} />}
      </main>
    </div>
  );
};

export default Layout;
