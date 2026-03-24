import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification,
  db,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from '../firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Lock, UserPlus, ChevronLeft, AtSign } from 'lucide-react';

const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate handle
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!handleRegex.test(handle)) {
      toast.error('HANDLE_MUST_BE_3_20_ALPHANUMERIC_CHARS');
      setLoading(false);
      return;
    }

    try {
      // Check if handle is taken
      const q = query(collection(db, 'users'), where('handle', '==', handle.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        toast.error('HANDLE_ALREADY_TAKEN');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });
      await sendEmailVerification(user);

      // Create profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        handle: handle.toLowerCase(),
        displayName,
        bio: '',
        photoUrl: '',
        bannerUrl: '',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isVerified: false,
        role: 'user',
        handleUpdateCount: 0,
        createdAt: serverTimestamp()
      });

      toast.success('ACCOUNT_CREATED_SUCCESSFULLY');
      navigate('/verify-email');
    } catch (error: any) {
      toast.error(error.message || 'REGISTRATION_FAILED');
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-black tracking-tighter text-accent">CREATE_ACCOUNT</h1>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-md p-6 bg-white dark:bg-slate-900/50 space-y-5">
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DISPLAY_NAME</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HANDLE</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                  placeholder="johndoe"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">EMAIL</label>
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PASSWORD</label>
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
              <UserPlus size={16} />
              {loading ? 'CREATING_ACCOUNT...' : 'CREATE_ACCOUNT'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          ALREADY_HAVE_AN_ACCOUNT? <Link to="/login" className="text-accent hover:underline font-bold">SIGN_IN</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
