import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  db, 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  auth, 
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from '../firebase';
import { 
  User as UserIcon, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  LogOut, 
  ChevronRight, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle, 
  Loader2, 
  Lock, 
  HelpCircle,
  ShieldCheck,
  Smartphone,
  Globe,
  Trash2,
  X,
  UserMinus,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn, processImage, uploadToCloudinary } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const Settings: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'MAIN' | 'PROFILE' | 'SECURITY' | 'VERIFICATION' | 'SUPPORT'>('MAIN');
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl || '');

  // Verification Form
  const [idType, setIdType] = useState<'National ID' | 'DL' | 'Passport'>('National ID');
  const [idNumber, setIdNumber] = useState('');

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success('PROFILE_UPDATED');
      setActiveTab('MAIN');
    } catch (error) {
      toast.error('FAILED_TO_UPDATE_PROFILE');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerificationRequest = async () => {
    if (!user || !profile || !idNumber.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'verificationRequests'), {
        uid: user.uid,
        handle: profile.handle,
        idType,
        idNumber: idNumber.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('VERIFICATION_REQUEST_SENT');
      setActiveTab('MAIN');
    } catch (error) {
      toast.error('FAILED_TO_SEND_REQUEST');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('LOGGED_OUT');
    } catch (error) {
      toast.error('FAILED_TO_LOGOUT');
    }
  };

  const renderMain = () => (
    <div className="space-y-2">
      <button 
        onClick={() => setActiveTab('PROFILE')}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-accent/10 text-accent rounded-lg"><UserIcon size={20} /></div>
          <div className="text-left">
            <p className="font-bold text-sm">Profile Settings</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Edit bio, avatar, and banner</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>

      <button 
        onClick={() => setActiveTab('SECURITY')}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Shield size={20} /></div>
          <div className="text-left">
            <p className="font-bold text-sm">Security & Privacy</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Password, 2FA, and sessions</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>

      <button 
        onClick={() => setActiveTab('VERIFICATION')}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-accent/10 text-accent rounded-lg"><ShieldCheck size={20} /></div>
          <div className="text-left">
            <p className="font-bold text-sm">Verification</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Get your blue signal badge</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>

      <div className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">Display Mode</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">{theme.toUpperCase()}_MODE_ACTIVE</p>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full relative transition-colors"
        >
          <motion.div 
            animate={{ x: theme === 'dark' ? 24 : 4 }}
            className="absolute top-1 w-4 h-4 bg-accent rounded-full"
          />
        </button>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors rounded-xl border border-red-100 dark:border-red-900/20 group"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors"><LogOut size={20} /></div>
          <div className="text-left">
            <p className="font-bold text-sm text-red-500">Logout</p>
            <p className="text-[10px] text-red-400 uppercase font-bold">Terminate current session</p>
          </div>
        </div>
      </button>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab('MAIN')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
        <h3 className="font-black text-xs tracking-widest uppercase">Edit Profile</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Name</label>
          <input 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 rounded-lg px-4 py-3 text-sm font-mono outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bio</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full h-32 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 rounded-lg px-4 py-3 text-sm font-mono outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <UserIcon size={14} className="text-accent" /> Avatar Signal
            </label>
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
                {photoUrl ? (
                  <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><UserIcon size={32} /></div>
                )}
                {isSaving && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 cursor-pointer p-2 bg-accent text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
                <Camera size={16} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSaving(true);
                    try {
                      const blob = await processImage(file, 400);
                      const url = await uploadToCloudinary(blob);
                      setPhotoUrl(url);
                      toast.success('AVATAR_SIGNAL_UPDATED');
                    } catch (err) {
                      toast.error('UPLOAD_FAILED');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Recommended: 400x400px</p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={14} className="text-accent" /> Banner Signal
            </label>
            <div className="relative group">
              <div className="w-full aspect-[3/1] bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32} /></div>
                )}
                {isSaving && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-2 right-2 cursor-pointer px-3 py-1.5 bg-accent text-white rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <Camera size={14} /> Change
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSaving(true);
                    try {
                      const blob = await processImage(file, 1500);
                      const url = await uploadToCloudinary(blob);
                      setBannerUrl(url);
                      toast.success('BANNER_SIGNAL_UPDATED');
                    } catch (err) {
                      toast.error('UPLOAD_FAILED');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Recommended: 1500x500px</p>
          </div>
        </div>

        <button 
          disabled={isSaving}
          onClick={handleUpdateProfile}
          className="w-full py-4 bg-accent text-white rounded-full font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'SAVE_CHANGES'}
        </button>
      </div>
    </div>
  );

  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate || false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('PLEASE_FILL_ALL_PASSWORD_FIELDS');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('PASSWORDS_DO_NOT_MATCH');
    }
    if (newPassword.length < 6) {
      return toast.error('PASSWORD_TOO_SHORT');
    }

    setIsSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success('PASSWORD_CHANGED_SUCCESSFULLY');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('INCORRECT_CURRENT_PASSWORD');
      } else {
        toast.error('FAILED_TO_CHANGE_PASSWORD');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPrivate,
        updatedAt: serverTimestamp()
      });
      toast.success('SECURITY_SETTINGS_UPDATED');
      setActiveTab('MAIN');
    } catch (error) {
      toast.error('FAILED_TO_UPDATE_SECURITY');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab('MAIN')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
        <h3 className="font-black text-xs tracking-widest uppercase">Security & Privacy</h3>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Lock size={18} /></div>
              <div>
                <p className="font-bold text-sm">Private Account</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Only followers can see your signals</p>
              </div>
            </div>
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full relative transition-colors"
            >
              <motion.div 
                animate={{ x: isPrivate ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-accent rounded-full"
              />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><UserMinus size={18} /></div>
            <div>
              <p className="font-bold text-sm">Blocked Users</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{profile?.blockedUsers?.length || 0} ACCOUNTS_BLOCKED</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">Manage your blocked users list in the future update.</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><Smartphone size={18} /></div>
            <div>
              <p className="font-bold text-sm">Two-Factor Authentication</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Add an extra layer of security</p>
            </div>
          </div>
          <button className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-[10px] uppercase tracking-widest">
            ENABLE_2FA
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 text-accent rounded-lg"><Lock size={18} /></div>
            <div>
              <p className="font-bold text-sm">Change Password</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Update your account security</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-accent outline-none"
              />
              <button 
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-accent outline-none"
              />
              <button 
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-accent outline-none"
            />
            <button 
              disabled={isSaving || !currentPassword || !newPassword}
              onClick={handleChangePassword}
              className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              {isSaving ? 'CHANGING...' : 'UPDATE_PASSWORD'}
            </button>
          </div>
        </div>

        <button 
          disabled={isSaving}
          onClick={handleUpdateSecurity}
          className="w-full py-4 bg-accent text-white rounded-full font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'SAVE_SECURITY_SETTINGS'}
        </button>
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab('MAIN')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
        <h3 className="font-black text-xs tracking-widest uppercase">Verification</h3>
      </div>

      <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-accent" />
          <div>
            <h4 className="font-bold text-sm">syntxt Verified</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase">AUTHENTIC_SIGNAL_BADGE</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The blue signal badge confirms that this account is authentic and belongs to the person or entity it represents.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Type</label>
          <select 
            value={idType}
            onChange={(e) => setIdType(e.target.value as any)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 rounded-lg px-4 py-3 text-sm font-mono outline-none appearance-none"
          >
            <option>National ID</option>
            <option>DL</option>
            <option>Passport</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Number / Serial</label>
          <input 
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Enter your document number"
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 rounded-lg px-4 py-3 text-sm font-mono outline-none"
          />
        </div>

        <button 
          disabled={isSaving || !idNumber.trim()}
          onClick={handleVerificationRequest}
          className="w-full py-4 bg-accent text-white rounded-full font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'SUBMIT_REQUEST'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'MAIN' && renderMain()}
          {activeTab === 'PROFILE' && renderProfile()}
          {activeTab === 'SECURITY' && renderSecurity()}
          {activeTab === 'VERIFICATION' && renderVerification()}
          {activeTab === 'SUPPORT' && (
            <div className="text-center py-24 space-y-4">
              <HelpCircle size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
              <p className="text-slate-500 text-sm italic">FEATURE_COMING_SOON</p>
              <button onClick={() => setActiveTab('MAIN')} className="text-accent font-bold text-xs uppercase underline">BACK_TO_SETTINGS</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Settings;
