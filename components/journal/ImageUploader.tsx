/**
 * ImageUploader Component
 * Upload and manage images for journal entries
 */

'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadJournalImage } from '@/lib/firebase/storage';
import type { JournalImage } from '@/lib/types/journal';

interface ImageUploaderProps {
  userId: string;
  images: JournalImage[];
  onChange: (images: JournalImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploader({
  userId,
  images,
  onChange,
  maxImages = 5,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check if adding these files would exceed max
    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedImages: JournalImage[] = [];

      for (const file of files) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB.`);
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file.`);
        }

        // Upload to Firebase Storage
        const { url, storagePath } = await uploadJournalImage(userId, file);

        uploadedImages.push({
          url,
          storagePath,
          alt: file.name,
          caption: '',
        });
      }

      onChange([...images, ...uploadedImages]);
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleUpdateCaption = (index: number, caption: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], caption };
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Images (Optional)
      </label>

      {/* Upload Button */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={20} />
          <span>{uploading ? 'Uploading...' : 'Add Images'}</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload images"
      />

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800"
            >
              {/* Image */}
              <div className="aspect-video relative">
                <img
                  src={image.url}
                  alt={image.alt || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Caption Input */}
              <div className="p-2">
                <input
                  type="text"
                  value={image.caption || ''}
                  onChange={(e) => handleUpdateCaption(index, e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-2 py-1 text-sm border border-orange-200 dark:border-orange-700 rounded bg-white dark:bg-orange-950/70 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !uploading && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-orange-200 dark:border-orange-700 rounded-lg">
          <ImageIcon size={48} className="text-orange-400 dark:text-orange-600 mb-3" />
          <p className="text-sm text-orange-500 dark:text-orange-400">
            No images added yet
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {images.length} / {maxImages} images • Max 5MB per image
      </p>
    </div>
  );
}
