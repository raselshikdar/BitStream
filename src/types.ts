import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  handle: string;
  displayName?: string;
  bio?: string;
  photoUrl?: string;
  bannerUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isBanned?: boolean;
  isPrivate?: boolean;
  blockedUsers?: string[];
  role: 'user' | 'admin';
  handleUpdateCount: number;
  lastHandleUpdate?: Timestamp | any;
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface Post {
  id: string;
  authorUid: string;
  authorHandle: string;
  authorName?: string;
  authorPhoto?: string;
  authorRole?: 'user' | 'admin';
  isVerified?: boolean;
  content: string;
  imageUrl?: string;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  isQuote?: boolean;
  quotedPostId?: string | null;
  isRepost?: boolean;
  repostedByHandle?: string;
  repostedByUid?: string;
  createdAt: Timestamp | any;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string | null;
  authorUid: string;
  authorHandle: string;
  authorName?: string;
  authorPhoto?: string;
  content: string;
  likesCount?: number;
  replyToHandle?: string;
  isHidden?: boolean;
  createdAt: Timestamp | any;
}

export interface Notification {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderHandle: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention' | 'verification';
  postId?: string;
  content?: string;
  isRead: boolean;
  createdAt: Timestamp | any;
}

export interface Message {
  id: string;
  chatId: string;
  senderUid: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Timestamp | any;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastSenderUid?: string;
  lastMessageAt?: Timestamp | any;
  unreadCount: number;
  unreadCounts?: Record<string, number>;
  metadata?: {
    [uid: string]: {
      handle: string;
      photoUrl: string;
    };
  };
  updatedAt?: Timestamp | any;
}

export interface VerificationRequest {
  id: string;
  uid: string;
  handle?: string;
  idType: 'National ID' | 'DL' | 'Passport' | 'Driving License';
  idNumber?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface SupportTicket {
  id: string;
  uid: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface Follow {
  followerUid: string;
  followingUid: string;
  createdAt: Timestamp | any;
}

export interface Like {
  uid: string;
  postId: string;
  createdAt: Timestamp | any;
}

export interface Bookmark {
  uid: string;
  postId: string;
  createdAt: Timestamp | any;
}

export interface Report {
  id: string;
  postId: string;
  reporterUid: string;
  authorUid: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Timestamp | any;
}
