
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { User, UserRole } from './types';
import * as blockchain from './services/blockchainService';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import Settings from './components/Settings';

// Initialize mock blockchain data
blockchain.initializeBlockchain();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'ADMIN' | 'RESET'>('LOGIN');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhrase, setResetPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [generatedPhrase, setGeneratedPhrase] = useState('');

  // Admin Credentials State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Registration Form State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.PATIENT);
  const [regName, setRegName] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('');
  const [regExperience, setRegExperience] = useState('');

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // 2FA State
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // --- LOGIN LOGIC ---

  const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!loginEmail || !loginPassword) {
    alert("Please enter both email and password.");
    return;
  }

  setLoading(true);

  try {
    const derivedAddress = blockchain.getWalletFromEmail(loginEmail);
    const existingUser = await blockchain.getUserByWallet(derivedAddress);

    if (!existingUser) {
      alert("Invalid email or password.");
      return;
    }

    if (existingUser.password !== loginPassword) {
      alert("Invalid email or password.");
      return;
    }

    // LOGIN SUCCESS
    if (existingUser.is2FAEnabled) {
      setTempUser(existingUser);
      setShow2FAInput(true);
    } else {
      setUser(existingUser);
      setWalletAddress(derivedAddress);
      setActiveTab('dashboard');
    }

  } catch (error: any) {
    alert(error.message);
  } finally {
    setLoading(false);
  }
};

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Hardcoded Secret Credentials
    if (adminUser === 'admin' && adminPass === 'admin123') {
      try {
        // Fetch the seeded admin user from blockchain service (usually the first user)
        const users = await blockchain.getUsers();
        const adminAccount = users.find(u => u.role === UserRole.ADMIN);
        
        if (adminAccount) {
          setUser(adminAccount);
          setWalletAddress(adminAccount.walletAddress);
          setActiveTab('dashboard');
        } else {
          alert("System Error: Admin account not initialized in blockchain.");
        }
      } catch (e) {
        alert("Login Error");
      }
    } else {
      alert("Invalid Admin Credentials");
    }
    setLoading(false);
  };

  const verify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode === "123456") { 
      setUser(tempUser);
      setWalletAddress(tempUser?.walletAddress || '');
      setActiveTab('dashboard');
      setShow2FAInput(false);
      setTempUser(null);
      setTwoFactorCode('');
    } else {
      alert("Invalid Code. (Hint: Use 123456)");
    }
  };

  // --- REGISTRATION LOGIC ---

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      alert("Email and Password are required.");
      return;
    }
    if (!regName) {
      alert("Please enter your full name.");
      return;
    }
    
    if (regRole === UserRole.DOCTOR) {
      if (!regLicense || regLicense.length < 5) {
        alert("Valid Medical License is required.");
        return;
      }
      if (!regSpecialization || !regExperience) {
        alert("All doctor fields are required.");
        return;
      }
    }

    setLoading(true);
    try {
      // Generate wallet from email
      const derivedAddress = blockchain.getWalletFromEmail(regEmail);

      // Register the user on blockchain/DB
      const newUser = await blockchain.registerUser(
        derivedAddress,
        regEmail,
        regName, 
        regRole,
        regPassword, 
        regLicense, 
        regSpecialization, 
        regExperience ? parseInt(regExperience) : undefined
      );
      
      // Clear registration state
      setRegEmail('');
      setRegPassword('');
      setRegName('');
      setRegLicense('');
      setRegSpecialization('');
      setRegExperience('');
      
      // Redirect to Login instead of auto-login
      setGeneratedPhrase(newUser.recoveryPhrase);
      setShowRecovery(true);
      setAuthMode('LOGIN');
      
    } catch (e: any) {
      alert("Registration failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setWalletAddress(null);
    setAuthMode('LOGIN');
    setLoginEmail('');
    setLoginPassword('');
    setAdminUser('');
    setAdminPass('');
    setShow2FAInput(false);
    setTempUser(null);
    setTwoFactorCode('');
    setActiveTab('dashboard');
  };

  // --- RENDER ---

  if (!user) {
    return (
      <div className="min-h-screen flex bg-transparent dark:bg-transparent transition-colors duration-300">
        
        {/* Left Side: Modern Classic Visuals with Fish Animation */}
        <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#0F172A]">
          {/* Fish Animation Styles */}
          <style>{`
            @keyframes swimRight {
              0% { transform: translateX(-200px) translateY(0) rotate(5deg); opacity: 0; }
              10% { opacity: 0.3; }
              50% { transform: translateX(25vw) translateY(-40px) rotate(-5deg); }
              90% { opacity: 0.3; }
              100% { transform: translateX(60vw) translateY(0) rotate(5deg); opacity: 0; }
            }
            @keyframes swimSlow {
              0% { transform: translateX(-150px) translateY(50px) scale(0.8); opacity: 0; }
              20% { opacity: 0.2; }
              80% { opacity: 0.2; }
              100% { transform: translateX(60vw) translateY(20px) scale(0.8); opacity: 0; }
            }
            .fish-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              z-index: 1; /* Above background, below text */
            }
          `}</style>

          {/* Background Image & Overlay */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=2532&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#111827]/95 to-teal-900/40 z-0"></div>
          
          {/* Animated Fish Background Layer */}
          <div className="fish-container">
             {/* Big Fish */}
             <div className="absolute top-1/4 left-0 text-teal-300/20" style={{ animation: 'swimRight 35s linear infinite' }}>
                <svg width="180" height="100" viewBox="0 0 100 60" fill="currentColor">
                   <path d="M95 30c-15-10-35-10-55 5S5 40 5 30s15-15 35-5 40 15 55 5z" />
                   <circle cx="85" cy="25" r="2" fill="white" fillOpacity="0.4" />
                </svg>
             </div>
             {/* Small Fish */}
             <div className="absolute top-2/3 left-0 text-blue-300/10" style={{ animation: 'swimSlow 45s linear infinite', animationDelay: '5s' }}>
                <svg width="100" height="60" viewBox="0 0 100 60" fill="currentColor">
                   <path d="M90 30 C 70 10, 50 10, 30 30 C 10 40, 0 30, 0 30 C 0 30, 10 20, 30 30 C 50 50, 70 50, 90 30 Z" />
                </svg>
             </div>
          </div>

          <div className="relative z-10 p-16 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 mb-8">
                <span className="text-2xl font-serif text-white">M</span>
              </div>
              <h1 className="text-5xl font-serif text-white leading-tight mb-6">
                The Future of <br/>
                <span className="text-teal-400">Secure Healthcare</span>
              </h1>
              <p className="text-slate-300 text-lg font-light max-w-md leading-relaxed">
                Experience the perfect synthesis of classic medical integrity and modern blockchain security. 
                Your records, immutable and accessible.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
               <div className="border-l border-white/20 pl-6">
                 <h3 className="text-white font-serif text-xl mb-1">256-bit</h3>
                 <p className="text-slate-400 text-sm">Encryption Standard</p>
               </div>
               <div className="border-l border-white/20 pl-6">
                 <h3 className="text-white font-serif text-xl mb-1">100%</h3>
                 <p className="text-slate-400 text-sm">Decentralized Uptime</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
          
          {/* Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {darkMode ? (
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
               <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          <div className="w-full max-w-md space-y-8">
            {showRecovery && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 space-y-4">
                
                <h3 className="text-lg font-bold text-yellow-800">
                  Save Your Recovery Phrase
                </h3>

                <p className="text-sm text-yellow-700">
                  This phrase is the ONLY way to recover your account if you forget your password.
                </p>

                <div className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white">
                  {generatedPhrase}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPhrase);
                    alert("Recovery phrase copied!");
                  }}
                  className="w-full py-2 bg-teal-600 text-white rounded-lg"
                >
                  Copy Recovery Phrase
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRecovery(false);
                    setAuthMode("LOGIN");
                  }}
                  className="w-full text-sm text-slate-500"
                >
                  Continue to Login
                </button>

              </div>
            )}
            
            {/* 2FA Overlay */}
            {show2FAInput ? (
               <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600 dark:text-teal-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Security Check</h2>
                    <p className="text-slate-500 dark:text-slate-400">Enter the 6-digit verification code.</p>
                  </div>
                  
                  <form onSubmit={verify2FA} className="space-y-6">
                     <input 
                       type="text" 
                       autoFocus
                       value={twoFactorCode} 
                       onChange={(e) => setTwoFactorCode(e.target.value)} 
                       className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 dark:bg-slate-800 dark:text-white text-center tracking-[1em] font-mono text-2xl transition-all shadow-sm focus:shadow-md" 
                       placeholder="••••••"
                       maxLength={6}
                     />
                     <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-teal-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-teal-700 transition transform hover:-translate-y-0.5 shadow-lg">
                       Verify Identity
                     </button>
                     <button type="button" onClick={() => setShow2FAInput(false)} className="w-full text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
                       Back to Login
                     </button>
                  </form>
               </div>
            ) : (
              <>
                {/* Auth Mode Tabs (Only if not in registration form process or Admin) */}
                {authMode !== 'ADMIN' && (
                  <div className="flex border-b-2 border-slate-100 dark:border-slate-800 mb-8">
                    <button 
                      onClick={() => setAuthMode('LOGIN')}
                      className={`flex-1 pb-4 text-center font-medium transition-all ${authMode === 'LOGIN' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 -mb-0.5' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => setAuthMode('REGISTER')}
                      className={`flex-1 pb-4 text-center font-medium transition-all ${authMode === 'REGISTER' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 -mb-0.5' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Register
                    </button>
                  </div>
                )}

                {/* LOGIN MODE */}
                {authMode === 'LOGIN' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="text-center">
                      <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                      <p className="text-slate-500 dark:text-slate-400">Sign in to your secure account.</p>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                       <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                          <input 
                             type="email" 
                             required 
                             value={loginEmail} 
                             onChange={e => setLoginEmail(e.target.value)} 
                             className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white" 
                             placeholder="you@example.com" 
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                          <input 
                             type="password" 
                             required 
                             value={loginPassword} 
                             onChange={e => setLoginPassword(e.target.value)} 
                             className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white" 
                             placeholder="••••••••" 
                          />
                       </div>
                       <div className="text-right">
                          <button
                            type="button"
                            onClick={() => setAuthMode('RESET')}
                            className="text-sm text-teal-600 hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                       
                       <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/30 flex items-center justify-center space-x-2 mt-4"
                      >
                        {loading ? (
                           <span className="flex items-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...</span>
                        ) : 'Sign In'}
                      </button>
                    </form>
                  </div>
                )}

                {/* REGISTER MODE */}
                {authMode === 'REGISTER' && !showRecovery && (
                  <div className="animate-in fade-in">
                      <form onSubmit={handleRegisterSubmit} className="space-y-5 text-left">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Create Account</h3>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">I am a...</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setRegRole(UserRole.PATIENT)} className={`py-3 rounded-lg border font-medium transition ${regRole === UserRole.PATIENT ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Patient</button>
                            <button type="button" onClick={() => setRegRole(UserRole.DOCTOR)} className={`py-3 rounded-lg border font-medium transition ${regRole === UserRole.DOCTOR ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Doctor</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                               <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white" placeholder="Jane Doe" />
                            </div>
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                               <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white" placeholder="jane@example.com" />
                            </div>
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                               <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white" placeholder="••••••••" />
                            </div>
                        </div>

                        {regRole === UserRole.DOCTOR && (
                           <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                               <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center">
                                 <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 Verification Required: Your account will be pending until an Administrator approves your credentials.
                               </p>
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Medical License ID <span className="text-red-500">*</span></label>
                                <input type="text" required value={regLicense} onChange={e => setRegLicense(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white font-mono" placeholder="MD-12345" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Specialization</label>
                                  <input type="text" required value={regSpecialization} onChange={e => setRegSpecialization(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white" placeholder="General" />
                               </div>
                               <div>
                                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Years Exp.</label>
                                  <input type="number" required value={regExperience} onChange={e => setRegExperience(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white" placeholder="5" />
                               </div>
                             </div>
                           </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-lg mt-4">
                           {loading ? 'Creating Identity...' : 'Register'}
                        </button>
                      </form>
                  </div>
                )}
                {authMode === 'RESET' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="text-center">
                      <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">
                        Reset Password
                      </h2>
                      <p className="text-slate-500">Enter your recovery phrase.</p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();

                        const wallet = blockchain.getWalletFromEmail(resetEmail);
                        const user = await blockchain.getUserByWallet(wallet);

                        if (!user) {
                          alert("User not found.");
                          return;
                        }

                        if (user.recoveryPhrase.trim() !== resetPhrase.trim()) {
                          alert("Invalid recovery phrase.");
                          return;
                        }

                        user.password = newPassword;

                        const users = await blockchain.getUsers();
                        const updated = users.map(u =>
                          u.id === user.id ? user : u
                        );

                        localStorage.setItem("medichain_users", JSON.stringify(updated));

                        alert("Password successfully reset!");
                        setResetEmail('');
                        setResetPhrase('');
                        setNewPassword('');
                        setAuthMode("LOGIN");
                      }}
                      className="space-y-4"
                    >
                      <input
                        type="email"
                        placeholder="Email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white"
                        required
                      />

                      <input
                        type="password"
                        placeholder="Recovery Phrase"
                        value={resetPhrase}
                        onChange={(e) => setResetPhrase(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white"
                        required
                      />

                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 dark:text-white"
                        required
                      />

                      <button
                        type="submit"
                        className="w-full py-3 bg-teal-600 text-white rounded-lg"
                      >
                        Reset Password
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuthMode('LOGIN')}
                        className="w-full text-sm text-slate-500"
                      >
                        Back to Login
                      </button>
                    </form>
                  </div>
                )}
                {/* SECRET ADMIN LOGIN */}
                {authMode === 'ADMIN' && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white mb-4">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">Restricted Access</h2>
                        <p className="text-slate-500 text-sm">Authorized Administrators Only</p>
                      </div>

                      <form onSubmit={handleAdminLogin} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Username</label>
                            <input 
                              type="text" 
                              value={adminUser}
                              onChange={(e) => setAdminUser(e.target.value)}
                              className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-slate-400 dark:text-white"
                              placeholder="Enter admin ID"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Password</label>
                            <input 
                              type="password" 
                              value={adminPass}
                              onChange={(e) => setAdminPass(e.target.value)}
                              className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-slate-400 dark:text-white"
                              placeholder="••••••••"
                            />
                         </div>
                         <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition">
                            {loading ? 'Verifying...' : 'Authenticate'}
                         </button>
                         <button type="button" onClick={() => setAuthMode('LOGIN')} className="w-full text-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mt-2">
                            Back to Standard Login
                         </button>
                      </form>
                   </div>
                )}
                
                {/* Footer Links & Admin Toggle */}
                {authMode !== 'ADMIN' && (
                  <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">&copy; 2025 MediChain Secure. Powered by Ethereum.</p>
                    <button 
                      onClick={() => setAuthMode('ADMIN')}
                      className="text-[10px] text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500 uppercase tracking-widest font-bold transition-colors"
                    >
                      Administrator Access
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    );
  };

  // LOGGED IN LAYOUT
  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      onNavigate={setActiveTab}
      darkMode={darkMode}
    >
      {activeTab === 'settings' ? (
        <Settings 
          user={user} 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
          onUpdateUser={(updates) => setUser(prev => prev ? ({ ...prev, ...updates }) : null)}
        />
      ) : (
        <>
          {user.role === UserRole.ADMIN && <AdminDashboard user={user} />}
          {user.role === UserRole.DOCTOR && <DoctorDashboard user={user} />}
          {user.role === UserRole.PATIENT && <PatientDashboard user={user} activeTab={activeTab} />}
        </>
      )}
    </Layout>
  );
};

export default App;
