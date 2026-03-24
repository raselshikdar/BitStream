import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  MessageSquare, 
  Bell, 
  Settings, 
  ChevronLeft,
  User as UserIcon,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useHeaderActions } from '../context/HeaderContext';
import { cn } from '../lib/utils';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isGuest } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { headerAction } = useHeaderActions();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [showHeader, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('recipientUid', '==', user.uid), where('isRead', '==', false));
    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadNotifs(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount > 0 && data.lastSenderUid !== user.uid) {
          count += data.unreadCount;
        }
      });
      setUnreadMsgs(count);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setHeaderVisible(false);
      } else {
        // Scrolling up
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.location.reload();
      }
    }
  };

  const isHome = location.pathname === '/';
  const isAuthPage = ['/welcome', '/login', '/register', '/verify-email'].includes(location.pathname);
  const showNav = !isAuthPage;

  return (
    <div className="min-h-screen font-mono pb-20 transition-colors duration-300 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {!isAuthPage && (
        <header 
          className={cn(
            "fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-transform duration-300",
            showHeader ? "translate-y-0" : "-translate-y-full"
          )}
        >
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            {isHome ? (
              <button 
                onClick={toggleDarkMode}
                className="p-1.5 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            ) : (
              <button onClick={() => navigate(-1)} className="p-1.5 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="flex-1 flex justify-center">
              {isHome ? (
                <div className="flex items-center gap-1">
                  <h1 className="text-lg font-black tracking-tighter">syntxt_</h1>
                </div>
              ) : (
                <h2 className="font-bold text-xs uppercase tracking-widest truncate">
                  {location.pathname.startsWith('/profile/') ? 'PROFILE' : 
                   location.pathname.startsWith('/post/') ? 'SIGNAL' :
                   location.pathname === '/settings' ? 'SETTINGS' :
                   location.pathname === '/notifications' ? 'NOTIFICATIONS' :
                   location.pathname === '/messages' ? 'MESSAGES' :
                   location.pathname === '/search' ? 'SEARCH' : ''}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-4">
              {headerAction && (
                <div className="flex items-center">
                  {headerAction}
                </div>
              )}
              {user && isHome && (
                <NavLink to={`/profile/${user.uid}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity truncate max-w-[100px]">
                  @{profile?.handle}
                </NavLink>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={cn("max-w-2xl mx-auto px-4", !isAuthPage && "pt-14 pb-6")}>
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-12">
          <div className="max-w-2xl mx-auto h-full flex items-center justify-around px-4">
            <NavLink 
              to="/" 
              onClick={handleHomeClick}
              className={({ isActive }) => cn("p-1.5 rounded-full transition-colors", isActive ? "text-accent" : "text-slate-500")}
            >
              <Home size={20} />
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => cn("p-1.5 rounded-full transition-colors", isActive ? "text-accent" : "text-slate-500")}>
              <Search size={20} />
            </NavLink>
            {!isGuest ? (
              <>
                <NavLink to="/messages" className={({ isActive }) => cn("p-1.5 rounded-full transition-colors relative", isActive ? "text-accent" : "text-slate-500")}>
                  <MessageSquare size={20} />
                  {unreadMsgs > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-accent text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-bg-light dark:border-bg-dark">
                      {unreadMsgs}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/notifications" className={({ isActive }) => cn("p-1.5 rounded-full transition-colors relative", isActive ? "text-accent" : "text-slate-500")}>
                  <Bell size={20} />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-accent text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-bg-light dark:border-bg-dark">
                      {unreadNotifs}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => cn("p-1.5 rounded-full transition-colors", isActive ? "text-accent" : "text-slate-500")}>
                  <Settings size={20} />
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className="text-xs font-bold text-accent">SIGN_IN</NavLink>
                <NavLink to="/register" className="text-xs font-bold text-accent">SIGN_UP</NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
