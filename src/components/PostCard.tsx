import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  Bookmark as BookmarkIcon, 
  MoreHorizontal,
  Share,
  Trash2,
  Flag,
  Languages,
  Copy,
  EyeOff,
  UserMinus,
  X,
  Check,
  CheckCircle,
  Quote,
  Share2,
  ExternalLink,
  Loader2,
  User as UserIcon
} from 'lucide-react';
import { Post, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  doc, 
  updateDoc, 
  increment, 
  deleteDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  getDoc,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { cn, formatShortDate } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const PostCard: React.FC<{ post: Post, isDetail?: boolean }> = ({ post, isDetail = false }) => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [showRepostOptions, setShowRepostOptions] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (post.isQuote && post.quotedPostId) {
      const fetchQuotedPost = async () => {
        const docRef = doc(db, 'posts', post.quotedPostId!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuotedPost({ id: docSnap.id, ...docSnap.data() } as Post);
        }
      };
      fetchQuotedPost();
    }
  }, [post.isQuote, post.quotedPostId]);

  useEffect(() => {
    if (!user) return;
    const unsubLike = onSnapshot(
      doc(db, 'likes', `${user.uid}_${post.id}`), 
      (doc) => setIsLiked(doc.exists()),
      (error) => handleFirestoreError(error, OperationType.GET, `likes/${user.uid}_${post.id}`)
    );
    const unsubBookmark = onSnapshot(
      doc(db, 'bookmarks', `${user.uid}_${post.id}`), 
      (doc) => setIsBookmarked(doc.exists()),
      (error) => handleFirestoreError(error, OperationType.GET, `bookmarks/${user.uid}_${post.id}`)
    );
    return () => {
      unsubLike();
      unsubBookmark();
    };
  }, [user, post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('PLEASE_SIGN_IN_TO_LIKE');
    const likeId = `${user.uid}_${post.id}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { uid: user.uid, postId: post.id, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        // Notification
        if (user.uid !== post.authorUid) {
          await addDoc(collection(db, 'notifications'), {
            recipientUid: post.authorUid,
            senderUid: user.uid,
            senderHandle: profile?.handle,
            type: 'like',
            postId: post.id,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('PLEASE_SIGN_IN_TO_BOOKMARK');
    const bookmarkId = `${user.uid}_${post.id}`;
    const bookmarkRef = doc(db, 'bookmarks', bookmarkId);

    try {
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        toast.success('REMOVED_FROM_BOOKMARKS');
      } else {
        await setDoc(bookmarkRef, { uid: user.uid, postId: post.id, createdAt: serverTimestamp() });
        toast.success('ADDED_TO_BOOKMARKS');
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handleRepost = async (type: 'direct' | 'quote') => {
    if (!user || !profile) return toast.error('PLEASE_SIGN_IN_TO_REPOST');
    setShowRepostOptions(false);

    if (type === 'direct') {
      try {
        const repostId = doc(collection(db, 'posts')).id;
        await setDoc(doc(db, 'posts', repostId), {
          id: repostId,
          authorUid: post.authorUid,
          authorHandle: post.authorHandle,
          authorName: post.authorName,
          authorPhoto: post.authorPhoto || '',
          content: post.content,
          imageUrl: post.imageUrl || null,
          likesCount: 0,
          repostsCount: 0,
          repliesCount: 0,
          isRepost: true,
          repostedByHandle: profile.handle,
          repostedByUid: user.uid,
          originalPostId: post.id,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'posts', post.id), { repostsCount: increment(1) });
        
        // Notification for repost
        if (user.uid !== post.authorUid) {
          await addDoc(collection(db, 'notifications'), {
            recipientUid: post.authorUid,
            senderUid: user.uid,
            senderHandle: profile.handle,
            type: 'repost',
            postId: post.id,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
        
        toast.success('REPOSTED_SUCCESSFULLY');
      } catch (error) {
        console.error('Repost error:', error);
      }
    } else {
      // Quote post logic - navigate to home with quoted post ID
      navigate('/', { state: { quotePostId: post.id } });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !commentContent.trim()) return;

    try {
      const commentId = doc(collection(db, 'comments')).id;
      await setDoc(doc(db, 'comments', commentId), {
        id: commentId,
        postId: post.id,
        parentId: null, // Explicitly set null for top-level comments
        authorUid: user.uid,
        authorHandle: profile.handle,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl || '',
        content: commentContent.trim(),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', post.id), { repliesCount: increment(1) });
      
      // Notification
      if (user.uid !== post.authorUid) {
        await addDoc(collection(db, 'notifications'), {
          recipientUid: post.authorUid,
          senderUid: user.uid,
          senderHandle: profile?.handle,
          type: 'comment',
          postId: post.id,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setCommentContent('');
      setShowCommentForm(false);
      toast.success('COMMENT_PUBLISHED');
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      toast.success('POST_DELETED');
      if (isDetail) navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  const handleReport = async () => {
    if (!user) return toast.error('PLEASE_SIGN_IN_TO_REPORT');
    try {
      await addDoc(collection(db, 'reports'), {
        postId: post.id,
        reporterUid: user.uid,
        authorUid: post.authorUid,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      toast.success('POST_REPORTED');
      setShowMenu(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedContent) {
      setTranslatedContent(null);
      setShowMenu(false);
      return;
    }

    setIsTranslating(true);
    setShowMenu(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following post content. If it's in a language other than English, translate it to English. If it's already in English, translate it to Bengali. Return ONLY the translated text, no extra commentary.\n\nContent: ${post.content}`,
      });
      
      if (response.text) {
        setTranslatedContent(response.text.trim());
        toast.success('SIGNAL_TRANSLATED');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('TRANSLATION_FAILED');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'syntxt Signal',
          text: post.content,
          url: url,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('LINK_COPIED_TO_CLIPBOARD');
    }
    setShowMenu(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(post.content);
    toast.success('COPIED_TO_CLIPBOARD');
    setShowMenu(false);
  };

  const timeAgo = formatShortDate(post.createdAt);

  if (isHidden) return null;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-900/50 relative">
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-lg font-black uppercase tracking-widest mb-2">Delete Signal?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone. The signal will be permanently removed.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reposted By Label */}
      {post.isRepost && (
        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Repeat2 size={12} />
          <span>REPOSTED_BY @{post.repostedByHandle}</span>
        </div>
      )}

      {/* Top Section */}
      <div className="flex gap-3 mb-3">
        <Link to={`/profile/${post.authorUid}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorHandle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400"><UserIcon size={20} /></div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <Link to={`/profile/${post.authorUid}`} className="flex items-center gap-1 font-bold truncate hover:underline text-sm">
                {post.authorName || post.authorHandle}
                {(post.isVerified || post.authorRole === 'admin') && (
                  <CheckCircle size={14} className="text-accent shrink-0 fill-current" />
                )}
              </Link>
              <Link to={`/profile/${post.authorUid}`} className="block text-xs text-slate-500 truncate">
                @{post.authorHandle}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo}</span>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                  <MoreHorizontal size={16} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <button onClick={handleTranslate} disabled={isTranslating} className="w-full px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50">
                          {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />} 
                          {translatedContent ? 'SHOW_ORIGINAL' : 'TRANSLATE_POST'}
                        </button>
                        <button onClick={handleShare} className="w-full px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Share2 size={14} /> SHARE_POST
                        </button>
                        <button onClick={handleCopy} className="w-full px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Copy size={14} /> COPY_TEXT
                        </button>
                        <button 
                          onClick={() => {
                            setIsHidden(true);
                            setShowMenu(false);
                            toast.success('SIGNAL_HIDDEN');
                          }}
                          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <EyeOff size={14} /> HIDE_POST
                        </button>
                        <button onClick={handleReport} className="w-full px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-500">
                          <Flag size={14} /> REPORT_POST
                        </button>
                        {(user?.uid === post.authorUid || isAdmin) && (
                          <button 
                            onClick={() => {
                              setShowDeleteConfirm(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-500 border-t border-slate-100 dark:border-slate-700"
                          >
                            <Trash2 size={14} /> DELETE_POST
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div 
        className={cn("markdown-body text-sm mb-3 cursor-pointer", isDetail ? "" : "line-clamp-6")}
        onClick={() => !isDetail && navigate(`/post/${post.id}`)}
      >
        <ReactMarkdown>{translatedContent || post.content}</ReactMarkdown>
      </div>

      {/* Image Section */}
      {post.imageUrl && (
        <div className="mb-3 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <img 
            src={post.imageUrl} 
            alt="Post attachment" 
            className="w-full h-auto max-h-[400px] object-contain cursor-zoom-in"
            onClick={() => setShowLightbox(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Quoted Post Section */}
      {post.isQuote && quotedPost && (
        <div 
          className="mb-3 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/post/${quotedPost.id}`);
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              {quotedPost.authorPhoto && <img src={quotedPost.authorPhoto} alt="" className="w-full h-full object-cover" />}
            </div>
            <span className="text-xs font-bold truncate">{quotedPost.authorName || quotedPost.authorHandle}</span>
            <span className="text-[10px] text-slate-500">@{quotedPost.authorHandle}</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
            <ReactMarkdown>{quotedPost.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors p-2 -m-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20",
            isLiked ? "text-red-500" : "text-slate-500 hover:text-red-500"
          )}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          <span className="font-bold">{post.likesCount}</span>
        </button>
        <button 
          onClick={() => setShowCommentForm(!showCommentForm)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent transition-colors p-2 -m-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <MessageSquare size={18} />
          <span className="font-bold">{post.repliesCount}</span>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowRepostOptions(!showRepostOptions)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-500 transition-colors p-2 -m-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Repeat2 size={18} />
            <span className="font-bold">{post.repostsCount}</span>
          </button>
          <AnimatePresence>
            {showRepostOptions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowRepostOptions(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-20 overflow-hidden"
                >
                  <button onClick={() => handleRepost('direct')} className="w-full px-3 py-2 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                    DIRECT_REPOST
                  </button>
                  <button onClick={() => handleRepost('quote')} className="w-full px-3 py-2 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                    QUOTE_POST
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <button 
          onClick={handleBookmark}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors p-2 -m-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20",
            isBookmarked ? "text-accent" : "text-slate-500 hover:text-accent"
          )}
        >
          <BookmarkIcon size={18} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Inline Comment Form */}
      <AnimatePresence>
        {showCommentForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleComment}
            className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <textarea 
              autoFocus
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 text-sm font-mono focus:ring-1 focus:ring-accent outline-none resize-none h-24"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setShowCommentForm(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                CANCEL
              </button>
              <button 
                type="submit"
                disabled={!commentContent.trim()}
                className="px-3 py-1.5 text-[10px] font-bold bg-accent text-white rounded-md disabled:opacity-50"
              >
                REPLY
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={post.imageUrl} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostCard;
