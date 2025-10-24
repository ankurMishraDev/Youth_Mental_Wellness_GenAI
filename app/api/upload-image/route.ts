/**
 * API Route: /api/upload-image
 * POST: Upload journal image to Firebase Storage
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/upload-image
 * Upload an image file to Firebase Storage
 * 
 * Note: This endpoint is for client-side uploads.
 * The actual upload happens on the client using Firebase Storage SDK.
 * This endpoint can be used for server-side validation if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, this is a placeholder
    // Actual uploads happen directly from client to Firebase Storage
    // This can be enhanced later for server-side processing (resizing, moderation, etc.)

    return NextResponse.json(
      {
        message: 'Use Firebase Storage SDK directly from client for image uploads',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/upload-image error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
