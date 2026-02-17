
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { getChatbotResponse } from '../services/geminiService';

interface Props {
  user: User;
}

const ChatAssistant: React.FC<Props> = ({ user }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    {role: 'model', text: `Hello ${user.name.split(' ')[0]}! I am your MediChain Assistant. How can I help you today?`}
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen, isChatThinking]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatThinking) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, {role: 'user', text: userText}]);
    setIsChatThinking(true);

    try {
      const response = await getChatbotResponse(userText, user.role);
      setChatMessages(prev => [...prev, {role: 'model', text: response}]);
    } catch (e) {
      setChatMessages(prev => [...prev, {role: 'model', text: "Sorry, I can't reach the server right now."}]);
    } finally {
      setIsChatThinking(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {isChatOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-auto animate-in fade-in slide-in-from-bottom-10 overflow-hidden flex flex-col h-[450px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 flex justify-between items-center text-white shadow-sm">
            <div className="flex items-center space-x-2">
               <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               </div>
               <div>
                 <h3 className="font-bold text-sm leading-tight">MediChain AI</h3>
                 <p className="text-[10px] text-teal-100 opacity-90">Powered by Gemini</p>
               </div>
            </div>
            <button 
              onClick={() => setIsChatOpen(false)} 
              className="hover:bg-white/20 p-1.5 rounded-full transition duration-200"
              aria-label="Close Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 scroll-smooth">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-teal-600 text-white rounded-2xl rounded-br-none' 
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-2xl rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isChatThinking && (
               <div className="flex justify-start animate-pulse">
                 <div className="bg-white dark:bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-600 shadow-sm flex space-x-1.5 items-center">
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                 </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleChatSubmit} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
             <div className="flex space-x-2 relative">
               <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 text-sm bg-slate-100 dark:bg-slate-900 border-none rounded-full pl-5 pr-12 py-3 focus:ring-2 focus:ring-teal-500 outline-none dark:text-white transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || isChatThinking}
                  className="absolute right-1 top-1 bottom-1 w-10 h-10 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition flex items-center justify-center shadow-sm"
                >
                  <svg className="w-5 h-5 transform rotate-90 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
             </div>
          </form>
        </div>
      )}
      
      {/* FAB */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl hover:shadow-teal-500/40 transition-all transform hover:scale-105 flex items-center justify-center border-4 border-white dark:border-slate-800
          ${isChatOpen ? 'bg-slate-800 text-white' : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white'}`}
      >
        {isChatOpen ? (
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        ) : (
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>
    </div>
  );
};

export default ChatAssistant;
