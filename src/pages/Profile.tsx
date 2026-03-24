import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  db, 
  doc, 
  onSnapshot, 
  query, 
  collection, 
  where, 
  orderBy, 
  getDocs,
  updateDoc,
  increment,
  deleteDoc,
  setDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { UserProfile, Post as PostType } from '../types';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import ComposeModal from '../components/ComposeModal';
import { cn, formatShortDate } from '../lib/utils';
import { 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Users, 
  MessageSquare, 
  Settings,
  X,
  ChevronLeft,
  Image as ImageIcon,
  CheckCircle,
  Bookmark as BookmarkIcon,
  Signal,
  User as UserIcon,
  RefreshCw,
  ArrowUp,
  PenLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostType[]>([]);
  const [activeTab, setActiveTab] = useState<'SIGNALS' | 'SAVE'>('SIGNALS');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsubProfile = onSnapshot(doc(db, 'users', uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      setLoading(false);
    });

    const qPosts = query(collection(db, 'posts'), where('authorUid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostType)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    if (user && user.uid === uid) {
      const qSaved = query(collection(db, 'bookmarks'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
      const unsubSaved = onSnapshot(qSaved, async (snapshot) => {
        const postIds = snapshot.docs.map(doc => doc.data().postId);
        if (postIds.length > 0) {
          // Firestore 'in' query limit is 10, for simplicity we'll fetch individually or just first 10
          const savedPostsData: PostType[] = [];
          for (const id of postIds.slice(0, 10)) {
            const postDoc = await getDocs(query(collection(db, 'posts'), where('id', '==', id)));
            if (!postDoc.empty) {
              savedPostsData.push({ id: postDoc.docs[0].id, ...postDoc.docs[0].data() } as PostType);
            }
          }
          setSavedPosts(savedPostsData);
        } else {
          setSavedPosts([]);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookmarks');
      });
      return () => {
        unsubProfile();
        unsubPosts();
        unsubSaved();
      };
    }

    return () => {
      unsubProfile();
      unsubPosts();
    };
  }, [uid, user]);

  useEffect(() => {
    if (!user || !uid || user.uid === uid) return;
    const followId = `${user.uid}_${uid}`;
    const unsub = onSnapshot(doc(db, 'follows', followId), (doc) => {
      setIsFollowing(doc.exists());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `follows/${followId}`);
    });
    return unsub;
  }, [user, uid]);

  const handleFollow = async () => {
    if (!user || !uid || user.uid === uid) return;
    const followId = `${user.uid}_${uid}`;
    const followRef = doc(db, 'follows', followId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(-1) });
        await updateDoc(doc(db, 'users', uid), { followersCount: increment(-1) });
      } else {
        await setDoc(followRef, { followerUid: user.uid, followingUid: uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(1) });
        await updateDoc(doc(db, 'users', uid), { followersCount: increment(1) });
        
        // Notification
        await setDoc(doc(collection(db, 'notifications')), {
          recipientUid: uid,
          senderUid: user.uid,
          senderHandle: currentUserProfile?.handle,
          type: 'follow',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const fetchFollowers = async () => {
    if (!uid) return;
    const q = query(collection(db, 'follows'), where('followingUid', '==', uid));
    const snapshot = await getDocs(q);
    const uids = snapshot.docs.map(doc => doc.data().followerUid);
    const users: UserProfile[] = [];
    for (const id of uids) {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', id)));
      if (!userDoc.empty) users.push(userDoc.docs[0].data() as UserProfile);
    }
    setFollowers(users);
    setShowFollowers(true);
  };

  const fetchFollowing = async () => {
    if (!uid) return;
    const q = query(collection(db, 'follows'), where('followerUid', '==', uid));
    const snapshot = await getDocs(q);
    const uids = snapshot.docs.map(doc => doc.data().followingUid);
    const users: UserProfile[] = [];
    for (const id of uids) {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', id)));
      if (!userDoc.empty) users.push(userDoc.docs[0].data() as UserProfile);
    }
    setFollowing(users);
    setShowFollowing(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="flex gap-4 items-end -mt-12 px-4">
          <div className="w-24 h-24 rounded-full bg-slate-300 dark:bg-slate-700 border-4 border-bg-light dark:border-bg-dark" />
          <div className="flex-1 space-y-2 mb-2">
            <div className="h-6 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
            <div className="h-4 w-24 bg-slate-300 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="space-y-2 px-4">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!profile) return <div className="text-center py-24 text-slate-500">USER_NOT_FOUND</div>;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative aspect-[3/1] w-full bg-slate-200 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {profile.bannerUrl ? (
          <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 opacity-20"><ImageIcon size={64} /></div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 sm:-mt-20 relative z-10">
        <div className="flex justify-between items-end mb-4">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-bg-light dark:border-bg-dark overflow-hidden shadow-xl">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.handle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400"><UserIcon size={48} /></div>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            {user?.uid === uid ? (
              <Link to="/settings">
                <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-full font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2">
                  <Settings size={16} /> EDIT_PROFILE
                </button>
              </Link>
            ) : (
              <>
                <button 
                  onClick={() => navigate(`/messages?uid=${uid}`)}
                  className="p-2 border border-slate-300 dark:border-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  <MessageSquare size={18} />
                </button>
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "px-6 py-2 rounded-full font-bold text-xs transition-all active:scale-95",
                    isFollowing ? "border border-slate-300 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500" : "bg-accent text-white"
                  )}
                >
                  {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tighter">{profile.displayName || profile.handle}</h2>
            {profile.isVerified && <CheckCircle size={18} className="text-accent" fill="currentColor" />}
          </div>
          <p className="text-slate-500 text-sm font-bold">@{profile.handle}</p>
        </div>

        <p className="mt-4 text-sm leading-relaxed max-w-xl">{profile.bio || 'No bio provided.'}</p>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500 font-bold">
          <button onClick={fetchFollowing} className="hover:text-accent flex items-center gap-1">
            <span className="text-text-light dark:text-text-dark">{profile.followingCount}</span> FOLLOWING
          </button>
          <button onClick={fetchFollowers} className="hover:text-accent flex items-center gap-1">
            <span className="text-text-light dark:text-text-dark">{profile.followersCount}</span> FOLLOWERS
          </button>
          <div className="flex items-center gap-1">
            <span className="text-text-light dark:text-text-dark">{profile.postsCount}</span> SIGNALS
          </div>
          {profile.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              JOINED {formatShortDate(profile.createdAt)}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('SIGNALS')}
            className={cn(
              "flex-1 py-4 text-xs font-black tracking-widest transition-all relative",
              activeTab === 'SIGNALS' ? "text-accent" : "text-slate-500 hover:text-text-light dark:hover:text-text-dark"
            )}
          >
            SIGNALS
            {activeTab === 'SIGNALS' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />}
          </button>
          {user?.uid === uid && (
            <button 
              onClick={() => setActiveTab('SAVE')}
              className={cn(
                "flex-1 py-4 text-xs font-black tracking-widest transition-all relative",
                activeTab === 'SAVE' ? "text-accent" : "text-slate-500 hover:text-text-light dark:hover:text-text-dark"
              )}
            >
              SAVE
              {activeTab === 'SAVE' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'SIGNALS' ? (
          posts.length > 0 ? (
            posts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-24 text-slate-500 text-sm italic">NO_SIGNALS_YET</div>
          )
        ) : (
          savedPosts.length > 0 ? (
            savedPosts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-24 text-slate-500 text-sm italic">NO_SAVED_SIGNALS</div>
          )
        )}
      </div>

      {/* Follow Modals */}
      <AnimatePresence>
        {(showFollowers || showFollowing) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-widest uppercase">{showFollowers ? 'FOLLOWERS' : 'FOLLOWING'}</h3>
                <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {(showFollowers ? followers : following).map(u => (
                  <Link 
                    key={u.uid} 
                    to={`/profile/${u.uid}`} 
                    onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
                    className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      {u.photoUrl && <img src={u.photoUrl} alt={u.handle} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.displayName || u.handle}</p>
                      <p className="text-xs text-slate-500 truncate">@{u.handle}</p>
                    </div>
                  </Link>
                ))}
                {(showFollowers ? followers : following).length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs italic">LIST_IS_EMPTY</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {user?.uid === uid && (
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="fixed bottom-16 right-8 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/20 flex items-center justify-center transition-all active:scale-90 hover:scale-105 z-50"
        >
          <PenLine size={24} />
        </button>
      )}

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-16 left-8 w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full shadow-md flex items-center justify-center z-50 hover:text-accent transition-colors"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
      />
    </div>
  );
};

export default Profile;
