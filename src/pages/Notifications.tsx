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
  writeBatch,
  getDocs
} from '../firebase';
import { Notification as NotificationType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHeaderActions } from '../context/HeaderContext';
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  UserPlus, 
  Bell, 
  Loader2, 
  CheckCircle,
  XCircle,
  ShieldCheck,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, safeToDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const NotificationItem: React.FC<{ notification: NotificationType }> = ({ notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageSquare size={16} className="text-accent fill-accent" />;
      case 'repost': return <Repeat2 size={16} className="text-green-500" />;
      case 'follow': return <UserPlus size={16} className="text-blue-500 fill-blue-500" />;
      case 'mention': return <Bell size={16} className="text-yellow-500 fill-yellow-500" />;
      case 'verification': return <ShieldCheck size={16} className="text-accent" />;
      default: return <Bell size={16} className="text-slate-400" />;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case 'like': return 'liked your signal';
      case 'comment': return 'commented on your signal';
      case 'repost': return 'reposted your signal';
      case 'follow': return 'started following you';
      case 'mention': return 'mentioned you in a signal';
      case 'verification': return 'Your verification request has been processed';
      default: return 'sent you a notification';
    }
  };

  const linkTo = notification.postId ? `/post/${notification.postId}` : `/profile/${notification.senderUid}`;

  return (
    <Link 
      to={linkTo}
      className={cn(
        "flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800",
        !notification.isRead && "bg-accent/5 border-l-4 border-l-accent"
      )}
    >
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-xs">@{notification.senderHandle || 'System'}</span>
          <span className="text-[10px] text-slate-500">
            {safeToDate(notification.createdAt)?.toLocaleDateString()}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">{getMessage()}</p>
        {notification.content && (
          <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic">"{notification.content}"</p>
        )}
      </div>
      {!notification.isRead && <div className="w-2 h-2 rounded-full bg-accent mt-2" />}
    </Link>
  );
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { setHeaderAction } = useHeaderActions();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationType)));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  useEffect(() => {
    // Mark as read when component unmounts or after a delay
    const timer = setTimeout(markAllAsRead, 3000);
    return () => clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    const hasUnread = notifications.some(n => !n.isRead);
    if (hasUnread) {
      setHeaderAction(
        <button 
          onClick={markAllAsRead}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-accent"
          title="Mark all as read"
        >
          <CheckCheck size={20} />
        </button>
      );
    } else {
      setHeaderAction(null);
    }
    return () => setHeaderAction(null);
  }, [notifications, setHeaderAction]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))
        ) : (
          <div className="text-center py-24 space-y-4">
            <Bell size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
            <p className="text-slate-500 text-sm italic">NO_NOTIFICATIONS_YET</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
