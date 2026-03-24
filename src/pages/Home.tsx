import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  onSnapshot,
  where
} from '../firebase';
import { Post as PostType } from '../types';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, ArrowUp, PenLine } from 'lucide-react';
import ComposeModal from '../components/ComposeModal';

const Home: React.FC = () => {
  const { user, isGuest } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showHeader, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setHeaderVisible(true);
        setShowScrollTop(false);
      } else {
        setShowScrollTop(currentScrollY > 500);
        if (currentScrollY > lastScrollY.current) {
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.state?.quotePostId) {
      setQuotePostId(location.state.quotePostId);
      setIsComposeOpen(true);
      window.history.replaceState({}, document.title);
    } else if (location.state?.openCompose) {
      setIsComposeOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'FOLLOWING'>('EXPLORE');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    // The onSnapshot listener will automatically update the posts.
    // We just need to give the user some visual feedback.
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    setLoading(true);
    let unsub: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        let postsQuery;
        if (activeTab === 'FOLLOWING' && !isGuest && user) {
          const followsSnap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', user.uid)));
          const followingUids = followsSnap.docs.map(doc => doc.data().followingUid);
          
          if (followingUids.length > 0) {
            postsQuery = query(
              collection(db, 'posts'),
              where('authorUid', 'in', followingUids),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
          } else {
            setPosts([]);
            setHasMore(false);
            setLoading(false);
            return;
          }
        } else {
          postsQuery = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
        }

        unsub = onSnapshot(postsQuery, (snapshot) => {
          const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as PostType));
          setPosts(newPosts);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === 10);
          setLoading(false);
          setIsRefreshing(false);
          setPullDistance(0);
        }, (error) => {
          console.error('Error in onSnapshot:', error);
          setLoading(false);
          setIsRefreshing(false);
        });
      } catch (error) {
        console.error('Error setting up listener:', error);
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    setupListener();
    return () => {
      if (unsub) unsub();
    };
  }, [activeTab, user, isGuest]);

  const fetchMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      let postsQuery;
      
      if (activeTab === 'FOLLOWING' && !isGuest && user) {
        const followsSnap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', user.uid)));
        const followingUids = followsSnap.docs.map(doc => doc.data().followingUid);
        
        if (followingUids.length > 0) {
          postsQuery = query(
            collection(db, 'posts'),
            where('authorUid', 'in', followingUids),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(10)
          );
        } else {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
      } else {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(10)
        );
      }

      const snapshot = await getDocs(postsQuery);
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as PostType));

      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, activeTab, user, isGuest, loadingMore, hasMore]);

  // Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !loadingMore && hasMore) {
        fetchMorePosts();
      }
      setShowScrollTop(window.scrollY > 1000);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchMorePosts, loadingMore, hasMore]);

  // Pull to Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].pageY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY.current > 0) {
      const distance = e.touches[0].pageY - startY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 200));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 150) {
      refresh();
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className="relative min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Tabs */}
      {/* Tab Bar */}
      <div className={cn(
        "sticky z-30 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300 py-3",
        showHeader ? "top-12" : "top-0"
      )}>
        <div className="flex justify-center max-w-xl mx-auto px-1">
          <div className="flex w-full bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-300/50 dark:border-slate-700/50">
            <button 
              onClick={() => setActiveTab('EXPLORE')}
              className={cn(
                "flex-1 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all relative rounded-full",
                activeTab === 'EXPLORE' ? "text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {activeTab === 'EXPLORE' && (
                <motion.div 
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-slate-800 dark:bg-slate-700 rounded-full shadow-md"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">Explore</span>
            </button>
            <button 
              onClick={() => setActiveTab('FOLLOWING')}
              className={cn(
                "flex-1 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all relative rounded-full",
                activeTab === 'FOLLOWING' ? "text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {activeTab === 'FOLLOWING' && (
                <motion.div 
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-slate-800 dark:bg-slate-700 rounded-full shadow-md"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">Following</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex justify-center py-2 pointer-events-none sticky top-[88px] z-20"
          style={{ transform: `translateY(${Math.min(pullDistance, 80)}px)`, opacity: pullDistance / 80 }}
        >
          <div className="bg-accent text-white p-2 rounded-full shadow-lg">
            <RefreshCw size={20} className={cn(isRefreshing && "animate-spin")} />
          </div>
        </div>
      )}

      <div className="space-y-4 pb-4 max-w-2xl mx-auto">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        
        {loadingMore && (
          <div className="py-8 flex justify-center">
            <div className="animate-spin text-accent"><RefreshCw size={24} /></div>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="py-12 text-center text-slate-500 text-xs italic">
            END_OF_STREAM // NO_MORE_SIGNALS
          </div>
        )}
      </div>

      {/* FAB */}
      {!isGuest && (
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
        onClose={() => {
          setIsComposeOpen(false);
          setQuotePostId(undefined);
        }} 
        quotePostId={quotePostId}
      />
    </div>
  );
};

export default Home;
