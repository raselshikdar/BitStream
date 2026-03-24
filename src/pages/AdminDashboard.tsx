import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDocs,
  limit
} from '../firebase';
import { UserProfile, Post, VerificationRequest, SupportTicket, Report } from '../types';
import { 
  Shield, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  Loader2, 
  Search,
  ChevronRight,
  MoreVertical,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Activity,
  BarChart3,
  Flag
} from 'lucide-react';
import { cn, safeToDate } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'POSTS' | 'VERIFICATION' | 'REPORTS'>('USERS');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });

  useEffect(() => {
    setLoading(true);
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(50)), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setStats(prev => ({ ...prev, users: snapshot.size }));
    }, (error) => {
      console.error("Admin Users listener error:", error);
    });

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setStats(prev => ({ ...prev, posts: snapshot.size }));
    }, (error) => {
      console.error("Admin Posts listener error:", error);
    });

    const unsubVerifications = onSnapshot(query(collection(db, 'verificationRequests'), where('status', '==', 'pending')), (snapshot) => {
      setVerifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerificationRequest)));
    }, (error) => {
      console.error("Admin Verifications listener error:", error);
    });

    const unsubReports = onSnapshot(query(collection(db, 'reports'), where('status', '==', 'pending'), limit(50)), (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
      setStats(prev => ({ ...prev, reports: snapshot.size }));
    }, (error) => {
      console.error("Admin Reports listener error:", error);
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubPosts();
      unsubVerifications();
      unsubReports();
    };
  }, []);

  const handleVerifyUser = async (requestId: string, uid: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'verificationRequests', requestId), {
        status: approve ? 'approved' : 'rejected',
        updatedAt: new Date()
      });
      if (approve) {
        await updateDoc(doc(db, 'users', uid), { isVerified: true });
      }
      toast.success(approve ? 'USER_VERIFIED' : 'REQUEST_REJECTED');
    } catch (error) {
      toast.error('ACTION_FAILED');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('POST_DELETED');
    } catch (error) {
      toast.error('DELETE_FAILED');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' });
      toast.success('REPORT_DISMISSED');
    } catch (error) {
      toast.error('ACTION_FAILED');
    }
  };

  const handleToggleUserBan = async (uid: string, isBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned: !isBanned });
      toast.success(isBanned ? 'USER_UNBANNED' : 'USER_BANNED');
    } catch (error) {
      toast.error('ACTION_FAILED');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">Users</span>
          </div>
          <p className="text-2xl font-black">{stats.users}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">Signals</span>
          </div>
          <p className="text-2xl font-black">{stats.posts}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">Reports</span>
          </div>
          <p className="text-2xl font-black">{stats.reports}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">Pending</span>
          </div>
          <p className="text-2xl font-black">{verifications.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {['USERS', 'POSTS', 'VERIFICATION', 'REPORTS'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-6 py-4 text-[10px] font-black tracking-widest transition-all relative whitespace-nowrap",
              activeTab === tab ? "text-accent" : "text-slate-500 hover:text-text-light dark:hover:text-text-dark"
            )}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin text-accent" size={32} /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeTab === 'USERS' && users.map(u => (
              <div key={u.uid} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {u.photoUrl && <img src={u.photoUrl} alt={u.handle} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{u.displayName || u.handle}</p>
                    {u.isVerified && <CheckCircle size={14} className="text-accent" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">@{u.handle} // {u.uid.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleUserBan(u.uid, !!u.isBanned)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      u.isBanned ? "bg-red-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                    )}
                  >
                    {u.isBanned ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                  <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}

            {activeTab === 'POSTS' && posts.map(p => (
              <div key={p.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">@{p.authorHandle}</span>
                    <span className="text-[10px] text-slate-400">{safeToDate(p.createdAt)?.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => handleDeletePost(p.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{p.content}</p>
              </div>
            ))}

            {activeTab === 'VERIFICATION' && verifications.map(v => (
              <div key={v.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-sm">@{v.handle}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{v.idType}: {v.idNumber}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleVerifyUser(v.id!, v.uid, false)}
                    className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all"
                  >
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleVerifyUser(v.id!, v.uid, true)}
                    className="px-4 py-2 bg-accent text-white rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-accent/80 transition-all"
                  >
                    APPROVE
                  </button>
                </div>
              </div>
            ))}

            {activeTab === 'REPORTS' && (
              reports.length > 0 ? (
                reports.map(r => (
                  <div key={r.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Flag size={14} className="text-red-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Reported Post: {r.postId}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{safeToDate(r.createdAt)?.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleDismissReport(r.id)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        DISMISS
                      </button>
                      <button 
                        onClick={() => {
                          handleDeletePost(r.postId);
                          handleDismissReport(r.id);
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-red-600 transition-all"
                      >
                        DELETE_POST
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-24 text-slate-500 text-sm italic">NO_ACTIVE_REPORTS</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
