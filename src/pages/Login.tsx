import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  auth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider, 
  sendPasswordResetEmail 
} from '../firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Lock, LogIn, ChevronLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('SIGN_IN_SUCCESSFUL');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'SIGN_IN_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('SIGN_IN_SUCCESSFUL');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'SIGN_IN_FAILED');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('PLEASE_ENTER_EMAIL_FIRST');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('PASSWORD_RESET_EMAIL_SENT');
    } catch (error: any) {
      toast.error(error.message || 'FAILED_TO_SEND_RESET_EMAIL');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-mono">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-6"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/welcome')} className="p-1.5 -ml-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black tracking-tighter text-accent">SIGN_IN</h1>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-md p-6 bg-white dark:bg-slate-900/50 space-y-5">
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">EMAIL_OR_USERNAME</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                  placeholder="user@bitstream.io"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PASSWORD</label>
                <button type="button" onClick={handleForgotPassword} className="text-[9px] text-accent hover:underline">FORGOT_PASSWORD?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 bg-accent text-white rounded-md font-bold text-xs hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {loading ? 'SIGNING_IN...' : 'SIGN_IN'}
            </button>
          </form>

          <div className="flex items-center gap-2 py-1">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[9px] text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full py-2.5 border border-slate-300 dark:border-slate-600 rounded-md font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <UserIcon size={16} />
            SIGN_IN_WITH_GOOGLE
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          NEW_TO_BITSTREAM? <Link to="/register" className="text-accent hover:underline font-bold">CREATE_ACCOUNT</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
