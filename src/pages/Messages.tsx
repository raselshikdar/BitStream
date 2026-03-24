import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDocs,
  getDoc,
  limit,
  writeBatch,
  increment,
  setDoc
} from '../firebase';
import { Chat, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHeaderActions } from '../context/HeaderContext';
import { 
  Send, 
  Loader2, 
  Search, 
  ChevronLeft, 
  MoreVertical, 
  Image as ImageIcon,
  MessageSquare,
  UserPlus,
  Check,
  CheckCheck,
  X
} from 'lucide-react';
import { cn, safeToDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const MessageBubble: React.FC<{ message: Message; isOwn: boolean }> = ({ message, isOwn }) => {
  return (
    <div className={cn(
      "flex flex-col max-w-[80%] space-y-1",
      isOwn ? "items-end self-end" : "items-start self-start"
    )}>
      <div className={cn(
        "px-4 py-2 rounded-2xl text-xs font-mono leading-relaxed shadow-sm",
        isOwn ? "bg-accent text-white rounded-tr-none" : "bg-slate-100 dark:bg-slate-800 text-text-light dark:text-text-dark rounded-tl-none"
      )}>
        {message.content}
        {message.imageUrl && (
          <img src={message.imageUrl} alt="Attachment" className="mt-2 rounded-lg max-w-full h-auto" />
        )}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[8px] text-slate-400 font-bold uppercase">
          {safeToDate(message.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOwn && (
          message.isRead ? <CheckCheck size={10} className="text-accent" /> : <Check size={10} className="text-slate-400" />
        )}
      </div>
    </div>
  );
};

const Messages: React.FC = () => {
  const { user, profile } = useAuth();
  const { setHeaderAction } = useHeaderActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUid = searchParams.get('uid');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !targetUid) return;
    
    const checkExistingChat = async () => {
      // First check if we already have this chat in our state
      const existing = chats.find(c => c.participants.includes(targetUid));
      if (existing) {
        setSelectedChat(existing);
        setSearchParams({}); // Clear the param
        return;
      }

      // If not in state, check Firestore
      try {
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid)
        );
        const snap = await getDocs(q);
        const chatDoc = snap.docs.find(d => (d.data() as Chat).participants.includes(targetUid));
        
        if (chatDoc) {
          setSelectedChat({ id: chatDoc.id, ...chatDoc.data() } as Chat);
        } else {
          // Create new chat if it doesn't exist
          const userDoc = await getDoc(doc(db, 'users', targetUid));
          if (userDoc.exists()) {
            await startNewChat(userDoc.data() as UserProfile);
          }
        }
        setSearchParams({}); // Clear the param
      } catch (error) {
        console.error("Error checking existing chat:", error);
      }
    };

    if (!loading) {
      checkExistingChat();
    }
  }, [targetUid, user, chats, loading]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchUser.trim()) {
        handleSearchUser();
      } else {
        setFoundUsers([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchUser]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      
      // Mark as read
      const unread = snapshot.docs.filter(d => d.data().senderUid !== user?.uid && !d.data().isRead);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => batch.update(doc(db, 'chats', selectedChat.id, 'messages', d.id), { isRead: true }));
        batch.update(doc(db, 'chats', selectedChat.id), { unreadCount: 0 });
        batch.commit();
      }
    }, (error) => {
      console.error("Messages listener error:", error);
    });
    return unsub;
  }, [selectedChat, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !profile || !selectedChat || !newMessage.trim()) return;
    setIsSending(true);
    try {
      const msgData = {
        chatId: selectedChat.id,
        senderUid: user.uid,
        content: newMessage.trim(),
        isRead: false,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), msgData);
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: newMessage.trim(),
        lastSenderUid: user.uid,
        updatedAt: serverTimestamp(),
        unreadCount: increment(1)
      });
      setNewMessage('');
    } catch (error) {
      toast.error('FAILED_TO_SEND_MESSAGE');
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchUser.trim()) return;
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('handle', '>=', searchUser.toLowerCase()),
        where('handle', '<=', searchUser.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setFoundUsers(snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== user?.uid));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const startNewChat = async (targetUser: UserProfile) => {
    if (!user) return;
    // Check if chat already exists
    const existing = chats.find(c => c.participants.includes(targetUser.uid));
    if (existing) {
      setSelectedChat(existing);
      setShowNewChat(false);
      return;
    }

    try {
      const chatId = doc(collection(db, 'chats')).id;
      const chatData: Chat = {
        id: chatId,
        participants: [user.uid, targetUser.uid],
        lastMessage: 'Chat started',
        updatedAt: serverTimestamp() as any,
        unreadCount: 0,
        metadata: {
          [user.uid]: { handle: profile?.handle || '', photoUrl: profile?.photoUrl || '' },
          [targetUser.uid]: { handle: targetUser.handle, photoUrl: targetUser.photoUrl || '' }
        }
      };
      await setDoc(doc(db, 'chats', chatId), chatData);
      setShowNewChat(false);
      toast.success('CHAT_CREATED');
    } catch (error) {
      toast.error('FAILED_TO_CREATE_CHAT');
    }
  };

  useEffect(() => {
    if (!selectedChat && !showNewChat) {
      setHeaderAction(
        <button 
          onClick={() => setShowNewChat(true)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-accent"
        >
          <UserPlus size={20} />
        </button>
      );
    } else {
      setHeaderAction(null);
    }
    return () => setHeaderAction(null);
  }, [selectedChat, showNewChat, setHeaderAction]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-accent" size={32} /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-4">
      <AnimatePresence mode="wait">
        {!selectedChat ? (
          <motion.div 
            key="chat-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {chats.length > 0 ? (
                chats.map(chat => {
                  const otherUid = chat.participants.find(id => id !== user?.uid);
                  const otherMeta = chat.metadata?.[otherUid || ''];
                  return (
                    <button 
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                        {otherMeta?.photoUrl && <img src={otherMeta.photoUrl} alt={otherMeta.handle} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-sm truncate">@{otherMeta?.handle || 'User'}</p>
                          <span className="text-[8px] text-slate-400 font-bold">
                            {safeToDate(chat.updatedAt)?.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">
                          {chat.unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-24 space-y-4">
                  <MessageSquare size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
                  <p className="text-slate-500 text-sm italic">NO_CHATS_YET</p>
                  <button 
                    onClick={() => setShowNewChat(true)}
                    className="px-6 py-2 bg-accent text-white rounded-full text-xs font-bold"
                  >
                    START_NEW_CHAT
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="chat-window"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col h-full"
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
              <button onClick={() => setSelectedChat(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <ChevronLeft size={20} />
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                {selectedChat.metadata?.[selectedChat.participants.find(id => id !== user?.uid) || '']?.photoUrl && (
                  <img 
                    src={selectedChat.metadata[selectedChat.participants.find(id => id !== user?.uid) || ''].photoUrl} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">
                  @{selectedChat.metadata?.[selectedChat.participants.find(id => id !== user?.uid) || '']?.handle || 'User'}
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
                </div>
              </div>
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isOwn={msg.senderUid === user?.uid} />
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-2xl px-4 py-2 border border-transparent focus-within:border-accent/50 transition-all">
                <button className="p-1 text-slate-400 hover:text-accent transition-colors">
                  <ImageIcon size={18} />
                </button>
                <input 
                  autoFocus
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-mono outline-none"
                />
                <button 
                  disabled={!newMessage.trim() || isSending}
                  onClick={handleSendMessage}
                  className="p-2 bg-accent text-white rounded-full disabled:opacity-50 transition-all active:scale-90"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChat(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-widest uppercase">New Message</h3>
                <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      autoFocus
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                      placeholder="Search by handle..."
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-accent/50 rounded-full pl-10 pr-4 py-2 text-xs font-mono outline-none"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" size={16} />
                    )}
                  </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {foundUsers.map(u => (
                    <button 
                      key={u.uid}
                      onClick={() => startNewChat(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        {u.photoUrl && <img src={u.photoUrl} alt={u.handle} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{u.displayName || u.handle}</p>
                        <p className="text-xs text-slate-500 truncate">@{u.handle}</p>
                      </div>
                    </button>
                  ))}
                  {foundUsers.length === 0 && searchUser && (
                    <p className="text-center py-8 text-xs text-slate-500 italic">NO_USERS_FOUND</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;
