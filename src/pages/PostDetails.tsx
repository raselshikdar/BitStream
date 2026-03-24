import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  db, 
  doc, 
  onSnapshot, 
  query, 
  collection, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  increment,
  setDoc,
  deleteDoc,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { Post as PostType, Comment as CommentType } from '../types';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  ChevronLeft, 
  CornerDownRight,
  MoreHorizontal,
  Heart,
  Repeat2,
  Bookmark as BookmarkIcon,
  Share2,
  Trash2,
  Flag,
  EyeOff,
  UserMinus,
  User as UserIcon
} from 'lucide-react';
import { cn, formatShortDate } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const CommentItem: React.FC<{ 
  comment: CommentType; 
  postId: string; 
  postAuthorUid?: string;
  depth?: number 
}> = ({ comment, postId, postAuthorUid, depth = 0 }) => {
  const { user, profile } = useAuth();
  const [replies, setReplies] = useState<CommentType[]>([]);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'), 
      where('parentId', '==', comment.id), 
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'comments'));
    return unsub;
  }, [comment.id]);

  useEffect(() => {
    if (!user) return;
    const unsubLike = onSnapshot(
      doc(db, 'commentLikes', `${user.uid}_${comment.id}`),
      (doc) => setIsLiked(doc.exists()),
      (error) => handleFirestoreError(error, OperationType.GET, `commentLikes/${user.uid}_${comment.id}`)
    );
    return unsubLike;
  }, [user, comment.id]);

  const handleLike = async () => {
    if (!user) return toast.error('PLEASE_SIGN_IN_TO_LIKE');
    const likeId = `${user.uid}_${comment.id}`;
    const likeRef = doc(db, 'commentLikes', likeId);
    const commentRef = doc(db, 'comments', comment.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(commentRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { uid: user.uid, commentId: comment.id, createdAt: serverTimestamp() });
        await updateDoc(commentRef, { likesCount: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'commentLikes');
    }
  };

  const handleReply = async () => {
    if (!user || !profile || !replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const replyId = doc(collection(db, 'comments')).id;
      await setDoc(doc(db, 'comments', replyId), {
        id: replyId,
        postId,
        parentId: comment.parentId || comment.id,
        authorUid: user.uid,
        authorHandle: profile.handle,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl,
        content: replyContent.trim(),
        likesCount: 0,
        replyToHandle: comment.authorHandle,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', postId), { repliesCount: increment(1) });
      
      // Notification for reply
      if (user.uid !== comment.authorUid) {
        await addDoc(collection(db, 'notifications'), {
          recipientUid: comment.authorUid,
          senderUid: user.uid,
          senderHandle: profile.handle,
          type: 'reply',
          postId,
          commentId: comment.id,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setReplyContent('');
      setShowReplyForm(false);
      toast.success('REPLY_SENT');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'comments', comment.id));
      await updateDoc(doc(db, 'posts', postId), { repliesCount: increment(-1) });
      toast.success('COMMENT_DELETED');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${comment.id}`);
    }
  };

  const handleHide = async () => {
    try {
      await updateDoc(doc(db, 'comments', comment.id), { isHidden: !comment.isHidden });
      toast.success(comment.isHidden ? 'COMMENT_UNHIDDEN' : 'COMMENT_HIDDEN');
      setShowMenu(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${comment.id}`);
    }
  };

  const handleReport = async () => {
    try {
      await addDoc(collection(db, 'reports'), {
        commentId: comment.id,
        reporterUid: user?.uid,
        authorUid: comment.authorUid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('COMMENT_REPORTED');
      setShowMenu(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const timeAgo = formatShortDate(comment.createdAt);

  if (comment.isHidden && user?.uid !== postAuthorUid && user?.uid !== comment.authorUid) {
    return null;
  }

  return (
    <div className={cn(
      "relative space-y-3",
      depth > 0 ? "ml-4 sm:ml-8 mt-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4" : "border-b border-slate-100 dark:border-slate-800 py-4",
      comment.isHidden && "opacity-50 grayscale"
    )}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
          {comment.authorPhoto ? (
            <img src={comment.authorPhoto} alt={comment.authorHandle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400"><UserIcon size={16} /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-sm truncate">{comment.authorName || comment.authorHandle}</span>
                <span className="text-xs text-slate-500 truncate">@{comment.authorHandle}</span>
                <span className="text-[10px] text-slate-400 ml-1">· {timeAgo}</span>
              </div>
              {comment.replyToHandle && (
                <span className="text-[10px] text-accent font-bold uppercase">Replying to @{comment.replyToHandle}</span>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-slate-400 hover:text-text-light dark:hover:text-text-dark"
              >
                <MoreHorizontal size={14} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden"
                    >
                      {user?.uid === comment.authorUid && (
                        <button onClick={handleDelete} className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-500">
                          <Trash2 size={12} /> DELETE
                        </button>
                      )}
                      {user?.uid === postAuthorUid && (
                        <button onClick={handleHide} className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                          <EyeOff size={12} /> {comment.isHidden ? 'UNHIDE' : 'HIDE'}
                        </button>
                      )}
                      <button onClick={handleReport} className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                        <Flag size={12} /> REPORT
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-sm mt-1 leading-relaxed">
            {comment.isHidden && <span className="text-xs font-bold text-red-500 uppercase mr-2">[HIDDEN]</span>}
            {comment.content}
          </p>
          
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold transition-colors",
                isLiked ? "text-red-500" : "text-slate-500 hover:text-red-500"
              )}
            >
              <Heart size={12} className={cn(isLiked && "fill-current")} /> {comment.likesCount || 0}
            </button>
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-accent transition-colors"
            >
              <MessageSquare size={12} /> REPLY
            </button>
          </div>

          <AnimatePresence>
            {showReplyForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to @${comment.authorHandle}...`}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 text-xs focus:ring-1 focus:ring-accent outline-none"
                  />
                  <button 
                    disabled={!replyContent.trim() || isSubmitting}
                    onClick={handleReply}
                    className="p-2 bg-accent text-white rounded-full disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="space-y-2">
          {replies.map(reply => (
            // All replies to a comment or its replies are rendered at depth 1
            <CommentItem key={reply.id} comment={reply} postId={postId} postAuthorUid={postAuthorUid} depth={1} />
          ))}
        </div>
      )}
    </div>
  );
};

const PostDetails: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<PostType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const unsubPost = onSnapshot(doc(db, 'posts', postId), (doc) => {
      if (doc.exists()) {
        setPost({ id: doc.id, ...(doc.data() as any) } as PostType);
      }
      setLoading(false);
    }, (error) => {
      console.error('PostDetails error:', error);
      setLoading(false);
    });

    const qComments = query(
      collection(db, 'comments'), 
      where('postId', '==', postId), 
      where('parentId', '==', null),
      orderBy('createdAt', 'desc')
    );
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as CommentType)));
    }, (error) => {
      console.error('Comments error:', error);
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId]);

  const handleComment = async () => {
    if (!user || !profile || !commentContent.trim() || !postId) return;
    setIsSubmitting(true);
    try {
      const commentId = doc(collection(db, 'comments')).id;
      await setDoc(doc(db, 'comments', commentId), {
        id: commentId,
        postId: postId,
        parentId: null,
        authorUid: user.uid,
        authorHandle: profile.handle,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl,
        content: commentContent.trim(),
        likesCount: 0,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', postId), { repliesCount: increment(1) });

      // Notification for comment
      if (user.uid !== post?.authorUid) {
        await addDoc(collection(db, 'notifications'), {
          recipientUid: post?.authorUid,
          senderUid: user.uid,
          senderHandle: profile.handle,
          type: 'comment',
          postId: postId,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setCommentContent('');
      toast.success('COMMENT_SENT');
    } catch (error) {
      toast.error('FAILED_TO_POST_COMMENT');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!post) return <div className="text-center py-24 text-slate-500">POST_NOT_FOUND</div>;

  return (
    <div className="space-y-6 pb-24">
      <PostCard post={post} isDetail />

      <div className="px-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          <span className="text-[10px] font-bold text-slate-500">{post.repliesCount} TOTAL</span>
        </div>

        {user && (
          <div className="flex gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.handle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400"><UserIcon size={20} /></div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <textarea 
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-accent outline-none resize-none h-24"
              />
              <div className="flex justify-end">
                  <button 
                  disabled={!commentContent.trim() || isSubmitting}
                  onClick={handleComment}
                  className="px-6 py-2 bg-accent text-white rounded-full font-bold text-xs flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'POST_COMMENT'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {comments.length > 0 ? (
            comments.map(comment => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                postId={postId!} 
                postAuthorUid={post?.authorUid}
              />
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs italic">NO_COMMENTS_YET</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetails;
