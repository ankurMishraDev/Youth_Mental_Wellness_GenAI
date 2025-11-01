import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

/**
 * GET /api/categories
 * Fetch user's categories (default + custom)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    // Fetch default categories (userId: null) and user's custom categories separately
    const defaultCategoriesRef = collection(db, 'categories');
    const customCategoriesRef = collection(db, `users/${userId}/categories`);

    const [defaultSnapshot, customSnapshot] = await Promise.all([
      getDocs(query(defaultCategoriesRef, where('userId', '==', null))),
      getDocs(customCategoriesRef)
    ]);

    const defaultCategories = defaultSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const customCategories = customSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Combine: defaults first, then custom (alphabetically)
    const categories = [
      ...defaultCategories.sort((a: any, b: any) => a.title.localeCompare(b.title)),
      ...customCategories.sort((a: any, b: any) => a.title.localeCompare(b.title))
    ];

    return NextResponse.json({ 
      success: true,
      categories 
    });

  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new custom category
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, color } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Category title is required' },
        { status: 400 }
      );
    }

    // Create new category document
    const categoryData = {
      title: title.trim(),
      description: description?.trim() || null,
      color: color || '#9333ea',
      userId: userId,  // Links to user (makes it custom)
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    const categoriesRef = collection(db, `users/${userId}/categories`);
    const docRef = await addDoc(categoriesRef, categoryData);

    return NextResponse.json({
      success: true,
      category: {
        id: docRef.id,
        ...categoryData
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
