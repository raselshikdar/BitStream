import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeToDate(date: any): Date | null {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'number' || typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatShortDate(date: any) {
  const d = safeToDate(date);
  if (!d) return 'now';
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function processImage(file: File, maxDim = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const tryConvert = (quality: number) => {
        canvas.toBlob((blob) => {
          if (blob) {
            if (blob.size <= 50 * 1024 || quality <= 0.1) {
              resolve(blob);
            } else {
              tryConvert(quality - 0.1);
            }
          } else {
            reject(new Error('CANVAS_TO_BLOB_FAILED'));
          }
        }, 'image/avif', quality);
      };

      tryConvert(0.8);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadToCloudinary(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || 'syntxt-next');
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${(import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || 'djelhfrfw'}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('CLOUDINARY_UPLOAD_FAILED');
  const data = await response.json();
  return data.secure_url;
}
