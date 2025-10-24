/**
 * Firebase Storage utilities for journal image uploads
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a journal image to Firebase Storage
 * 
 * @param userId - The user ID (for folder organization)
 * @param file - The file to upload
 * @returns Object with download URL and storage path
 */
export async function uploadJournalImage(
  userId: string,
  file: File
): Promise<{ url: string; storagePath: string }> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('Image must be smaller than 5MB');
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `journal-images/${userId}/${fileName}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    return { url, storagePath };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete a journal image from Firebase Storage
 * 
 * @param storagePath - The full storage path (e.g., "journal-images/userId/filename.jpg")
 */
export async function deleteJournalImage(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - image might already be deleted
  }
}

/**
 * Upload multiple images at once
 * 
 * @param userId - The user ID
 * @param files - Array of files to upload
 * @returns Array of upload results
 */
export async function uploadMultipleImages(
  userId: string,
  files: File[]
): Promise<Array<{ url: string; storagePath: string }>> {
  const uploadPromises = files.map((file) => uploadJournalImage(userId, file));
  return await Promise.all(uploadPromises);
}

/**
 * Delete multiple images at once
 * 
 * @param storagePaths - Array of storage paths to delete
 */
export async function deleteMultipleImages(storagePaths: string[]): Promise<void> {
  const deletePromises = storagePaths.map((path) => deleteJournalImage(path));
  await Promise.all(deletePromises);
}
