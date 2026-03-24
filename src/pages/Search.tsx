import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  startAt, 
  endAt 
} from '../firebase';
import { UserProfile, Post as PostType } from '../types';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';
import { 
  Search as SearchIcon, 
  Users, 
  Hash, 
  Signal, 
  Loader2, 
  X,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'USERS' | 'POSTS'>('USERS');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState(['#BitStream', '#Web3', '#Hacker', '#Tech', '#Crypto']);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setUsers([]);
        setPosts([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeTab]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (activeTab === 'USERS') {
        const q = query(
          collection(db, 'users'),
          where('handle', '>=', searchTerm.toLowerCase()),
          where('handle', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      } else {
        const q = query(
          collection(db, 'posts'),
          where('content', '>=', searchTerm),
          where('content', '<=', searchTerm + '\uf8ff'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostType)));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="fixed top-12 left-0 right-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md py-3 px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users, signals, or hashtags..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 focus:ring-1 focus:ring-accent/50 rounded-full pl-12 pr-12 py-3 text-sm font-mono transition-all outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for fixed search bar */}
      <div className="h-16" />

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('USERS')}
          className={cn(
            "flex-1 py-4 text-xs font-black tracking-widest transition-all relative",
            activeTab === 'USERS' ? "text-accent" : "text-slate-500 hover:text-text-light dark:hover:text-text-dark"
          )}
        >
          USERS
          {activeTab === 'USERS' && <motion.div layoutId="searchTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('POSTS')}
          className={cn(
            "flex-1 py-4 text-xs font-black tracking-widest transition-all relative",
            activeTab === 'POSTS' ? "text-accent" : "text-slate-500 hover:text-text-light dark:hover:text-text-dark"
          )}
        >
          SIGNALS
          {activeTab === 'POSTS' && <motion.div layoutId="searchTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />}
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : searchTerm.trim() ? (
          activeTab === 'USERS' ? (
            users.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <Link 
                    key={u.uid} 
                    to={`/profile/${u.uid}`} 
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                      {u.photoUrl && <img src={u.photoUrl} alt={u.handle} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.displayName || u.handle}</p>
                      <p className="text-xs text-slate-500 truncate">@{u.handle}</p>
                      {u.bio && <p className="text-[10px] text-slate-400 truncate mt-1">{u.bio}</p>}
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 text-slate-500 text-sm italic">NO_USERS_FOUND</div>
            )
          ) : (
            posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="text-center py-24 text-slate-500 text-sm italic">NO_SIGNALS_FOUND</div>
            )
          )
        ) : (
          <div className="space-y-8 py-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 px-4">
                {trendingTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setSearchTerm(tag)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-accent/10 hover:text-accent border border-transparent hover:border-accent/20 rounded-full text-xs font-bold transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl text-center space-y-2 mx-4 border border-slate-100 dark:border-slate-800">
              <Signal size={32} className="mx-auto text-slate-300 mb-2" />
              <h4 className="font-bold text-sm">Discover the Stream</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Search for users to follow, signals to read, or hashtags to explore the latest trends in the BitStream network.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
