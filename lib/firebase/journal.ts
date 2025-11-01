/**
 * Firestore operations for journal entries
 */

import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { deleteMultipleImages } from './storage';
import { encryptField, decryptField, encryptObject, decryptObject } from '../security/encryption';
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  Category,
  DailyPrompt,
} from '../types/journal';

const CATEGORIES_COLLECTION = 'categories';
const PROMPTS_COLLECTION = 'dailyPrompts';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get the journal entries subcollection for a user
 */
const getUserJournalCollection = (userId: string) => {
  return collection(db, 'users', userId, 'journalEntries');
};

// ========================================
// JOURNAL ENTRIES
// ========================================

/**
 * Create a new journal entry
 */
export async function createJournalEntry(
  userId: string,
  data: CreateJournalEntryInput
): Promise<string> {
  try {
    // Encrypt sensitive fields before storing
    const encryptedTitle = data.title ? await encryptField(data.title, userId) : '';
    const encryptedContent = await encryptObject(data.content, userId);

    // Use subcollection: users/{userId}/journalEntries
    const entryRef = await addDoc(getUserJournalCollection(userId), {
      // Note: userId is implicit in the path, no need to store it
      title: encryptedTitle,
      content: encryptedContent,
      mood: data.mood, // Mood is not super sensitive, but could be encrypted too
      images: data.images || [],
      categoryId: data.categoryId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return entryRef.id;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw new Error('Failed to create journal entry');
  }
}

/**
 * Get all journal entries for a user
 */
export async function getJournalEntries(
  userId: string,
  options?: {
    limitCount?: number;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<JournalEntry[]> {
  try {
    const constraints: QueryConstraint[] = [
      // No need for userId filter - it's implicit in the subcollection path
      orderBy('createdAt', 'desc'),
    ];

    // Add category filter
    if (options?.categoryId) {
      constraints.push(where('categoryId', '==', options.categoryId));
    }

    // Add date range filters
    if (options?.startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(options.endDate)));
    }

    // Add limit
    if (options?.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    // Query the user's journal subcollection
    const q = query(getUserJournalCollection(userId), ...constraints);
    const snapshot = await getDocs(q);

    // Decrypt entries on retrieval
    const entries = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Decrypt sensitive fields
        const decryptedTitle = data.title ? await decryptField(data.title, userId) : '';
        const decryptedContent = await decryptObject<any>(data.content, userId);

        let category = null;
        if (data.categoryId) {
          category = await getCategoryById(data.categoryId);
        }

        return {
          id: doc.id,
          userId: data.userId,
          title: decryptedTitle,
          content: decryptedContent || data.content, // Fallback to raw if decryption fails
          mood: data.mood,
          images: data.images || [],
          categoryId: data.categoryId,
          category: category,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as JournalEntry;
      })
    );

    return entries;
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    throw new Error('Failed to fetch journal entries');
  }
}

/**
 * Get a single journal entry by ID
 */
export async function getJournalEntryById(
  userId: string,
  entryId: string
): Promise<JournalEntry | null> {
  try {
    // Access entry in user's journal subcollection
    const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // No need for security check - userId is in the path, so this entry belongs to the user

    // Decrypt sensitive fields
    const decryptedTitle = data.title ? await decryptField(data.title, userId) : '';
    const decryptedContent = await decryptObject<any>(data.content, userId);

    let category = null;
    if (data.categoryId) {
      category = await getCategoryById(data.categoryId);
    }

    return {
      id: docSnap.id,
      userId: userId, // Restore userId for consistency
      title: decryptedTitle,
      content: decryptedContent || data.content, // Fallback
      mood: data.mood,
      images: data.images || [],
      categoryId: data.categoryId,
      category: category,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as JournalEntry;
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    throw error;
  }
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: UpdateJournalEntryInput
): Promise<void> {
  try {
    // Access entry in user's journal subcollection
    const docRef = doc(db, 'users', userId, 'journalEntries', entryId);

    // Verify entry exists (ownership is implicit in subcollection path)
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }

    // Prepare update data (encrypt sensitive fields)
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title ? await encryptField(updates.title, userId) : '';
    }
    if (updates.content !== undefined) {
      updateData.content = await encryptObject(updates.content, userId);
    }
    if (updates.mood !== undefined) updateData.mood = updates.mood;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating journal entry:', error);
    throw error;
  }
}

/**
 * Delete a journal entry and its images
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  try {
    // Access entry in user's journal subcollection
    const docRef = doc(db, 'users', userId, 'journalEntries', entryId);

    // Verify entry exists and get data
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }

    const data = docSnap.data();

    // Delete associated images from storage
    if (data.images && data.images.length > 0) {
      const storagePaths = data.images.map((img: any) => img.storagePath);
      await deleteMultipleImages(storagePaths);
    }

    // Delete the document
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
}

// ========================================
// CATEGORIES
// ========================================

/**
 * Get all categories (system + user's custom)
 */
export async function getCategories(userId?: string): Promise<Category[]> {
  try {
    const constraints: QueryConstraint[] = [];

    // Get system categories (userId = null) and user's custom categories
    if (userId) {
      // Note: Firestore doesn't support OR in single query, so we'll fetch separately
      const systemQuery = query(
        collection(db, CATEGORIES_COLLECTION),
        where('userId', '==', null)
      );
      const userQuery = query(
        collection(db, CATEGORIES_COLLECTION),
        where('userId', '==', userId)
      );

      const [systemSnapshot, userSnapshot] = await Promise.all([
        getDocs(systemQuery),
        getDocs(userQuery),
      ]);

      const categories = [
        ...systemSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })),
        ...userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })),
      ] as Category[];

      return categories;
    } else {
      // Only system categories
      const q = query(
        collection(db, CATEGORIES_COLLECTION),
        where('userId', '==', null)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          } as Category)
      );
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories');
  }
}

/**
 * Create a new category
 */
export async function createCategory(
  title: string,
  color: string,
  userId?: string | null,
  description?: string
): Promise<string> {
  try {
    const categoryRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      title,
      color,
      description: description || '',
      userId: userId || null,
      createdAt: serverTimestamp(),
    });

    return categoryRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
    } as Category;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

// ========================================
// DAILY PROMPTS
// ========================================

/**
 * Get random daily prompts
 */
export async function getRandomDailyPrompts(count: number = 3): Promise<DailyPrompt[]> {
  try {
    // Get all active prompts
    const q = query(
      collection(db, PROMPTS_COLLECTION),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);
    const allPrompts = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as DailyPrompt)
    );

    if (allPrompts.length === 0) {
      return [];
    }

    // Weighted random selection
    const selectedPrompts: DailyPrompt[] = [];
    const availablePrompts = [...allPrompts];

    for (let i = 0; i < Math.min(count, availablePrompts.length); i++) {
      const totalWeight = availablePrompts.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;

      for (let j = 0; j < availablePrompts.length; j++) {
        random -= availablePrompts[j].weight;
        if (random <= 0) {
          selectedPrompts.push(availablePrompts[j]);
          availablePrompts.splice(j, 1);
          break;
        }
      }
    }

    return selectedPrompts;
  } catch (error) {
    console.error('Error fetching daily prompts:', error);
    throw new Error('Failed to fetch daily prompts');
  }
}

/**
 * Create a new daily prompt (admin only)
 */
export async function createDailyPrompt(data: Omit<DailyPrompt, 'id' | 'createdAt'>): Promise<string> {
  try {
    const promptRef = await addDoc(collection(db, PROMPTS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });

    return promptRef.id;
  } catch (error) {
    console.error('Error creating daily prompt:', error);
    throw new Error('Failed to create daily prompt');
  }
}
