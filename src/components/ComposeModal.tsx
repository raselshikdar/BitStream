import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  AlertCircle,
  Quote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp, 
  updateDoc, 
  increment,
  getDoc
} from '../firebase';
import { cn, processImage, uploadToCloudinary } from '../lib/utils';
import { Post } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotePostId?: string;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, quotePostId }) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const MAX_CHARS = 300;

  useEffect(() => {
    if (quotePostId && isOpen) {
      const fetchQuotedPost = async () => {
        try {
          const docRef = doc(db, 'posts', quotePostId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setQuotedPost({ id: docSnap.id, ...docSnap.data() } as Post);
          }
        } catch (error) {
          console.error('Error fetching quoted post:', error);
        }
      };
      fetchQuotedPost();
    } else if (!isOpen) {
      setQuotedPost(null);
    }
  }, [quotePostId, isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const handlePublish = async () => {
    if (!user || !profile || !content.trim()) return;
    setIsUploading(true);

    try {
      let imageUrl = '';
      if (image) {
        const processedBlob = await processImage(image);
        imageUrl = await uploadToCloudinary(processedBlob);
      }

      const postId = doc(collection(db, 'posts')).id;
      await setDoc(doc(db, 'posts', postId), {
        id: postId,
        authorUid: user.uid,
        authorHandle: profile.handle,
        authorName: profile.displayName,
        authorPhoto: profile.photoUrl || '',
        content: content.trim(),
        imageUrl,
        likesCount: 0,
        repostsCount: 0,
        repliesCount: 0,
        isQuote: !!quotePostId,
        quotedPostId: quotePostId || null,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), { postsCount: increment(1) });

      toast.success('SIGNAL_PUBLISHED');
      setContent('');
      setImage(null);
      setImagePreview(null);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'FAILED_TO_PUBLISH');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-950 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-widest uppercase">New Signal</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <textarea 
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder={quotePostId ? "Add a comment to this signal..." : "What's your signal? (Markdown supported)"}
                className="w-full h-32 bg-transparent border-none focus:ring-0 resize-none text-sm font-mono placeholder:text-slate-400"
              />

              {quotedPost && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      {quotedPost.authorPhoto && <img src={quotedPost.authorPhoto} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-[10px] font-bold truncate">{quotedPost.authorName || quotedPost.authorHandle}</span>
                    <span className="text-[9px] text-slate-500">@{quotedPost.authorHandle}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    <ReactMarkdown>{quotedPost.content}</ReactMarkdown>
                  </div>
                </div>
              )}

              {imagePreview && (
                <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-cover" />
                  <button 
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "text-[10px] font-bold",
                    content.length >= MAX_CHARS ? "text-red-500" : "text-slate-400"
                  )}>
                    {content.length}/{MAX_CHARS}
                  </div>
                  <div {...getRootProps()} className="cursor-pointer text-slate-400 hover:text-accent transition-colors p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <input {...getInputProps()} />
                    <ImageIcon size={18} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    CANCEL
                  </button>
                  <button 
                    disabled={!content.trim() || isUploading} 
                    onClick={handlePublish}
                    className="px-6 py-2 bg-accent text-white rounded-md font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'PUBLISH'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ComposeModal;
