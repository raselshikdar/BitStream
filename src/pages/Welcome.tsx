import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Search } from 'lucide-react';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { setGuest } = useAuth();

  const handleGuest = () => {
    setGuest(true);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-mono">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-accent">BITSTREAM</h1>
          <p className="text-slate-500 text-sm">Minimalist. Real-time. Hacker-style microblogging.</p>
        </div>
        
        <div className="border border-slate-200 dark:border-slate-700 rounded-md p-8 bg-white dark:bg-slate-900/50 space-y-6">
          <div className="space-y-4">
            <div className="h-1 w-12 bg-accent mx-auto" />
            <p className="text-sm">Join the stream to share your signals.</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-accent text-white rounded-md font-bold hover:opacity-90 transition-all active:scale-95"
            >
              CREATE_ACCOUNT
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-3 border border-slate-300 dark:border-slate-600 rounded-md font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              SIGN_IN
            </button>
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <button 
              onClick={handleGuest}
              className="w-full py-3 text-xs font-bold text-slate-500 hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <Search size={16} />
              EXPLORE_AS_GUEST
            </button>
          </div>
        </div>
        
        <div className="text-[10px] text-slate-400 uppercase tracking-widest">
          v2.0.0 // secure_connection_established
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;
