import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, sendEmailVerification } from '../firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Mail, RefreshCw, LogOut, ChevronLeft } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        toast.success('EMAIL_VERIFIED_SUCCESSFULLY');
        navigate('/');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('VERIFICATION_EMAIL_RESENT');
    } catch (error: any) {
      toast.error(error.message || 'FAILED_TO_RESEND_EMAIL');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/welcome');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-mono">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-6 text-center"
      >
        <div className="space-y-1.5">
          <h1 className="text-xl font-black tracking-tighter text-accent">VERIFY_EMAIL</h1>
          <p className="text-slate-500 text-xs">We've sent a verification link to your email.</p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-md p-6 bg-white dark:bg-slate-900/50 space-y-5">
          <div className="flex justify-center">
            <div className="p-3 bg-accent/10 rounded-full text-accent">
              <Mail size={32} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-xs">Please check your inbox and click the link to verify your account.</p>
            <p className="text-[9px] text-slate-400">Waiting for verification...</p>
          </div>

          <div className="space-y-2.5">
            <button 
              onClick={handleResend}
              disabled={loading}
              className="w-full py-2.5 bg-accent text-white rounded-md font-bold text-xs hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'RESENDING...' : 'RESEND_EMAIL'}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-2.5 border border-slate-300 dark:border-slate-600 rounded-md font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              LOGOUT
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
