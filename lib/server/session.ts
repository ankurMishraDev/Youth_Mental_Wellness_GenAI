/**
 * Server-side Session Management with HTTP-only Cookies
 * This replaces the insecure localStorage approach
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from '../types';

// Session configuration
const SESSION_COOKIE_NAME = 'curez_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

// Convert secret to Uint8Array for jose
const getSecretKey = () => new TextEncoder().encode(SESSION_SECRET);

export interface SessionData {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  gender?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Create a new session and set HTTP-only cookie
 */
export async function createSession(user: User): Promise<void> {
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION;

  const sessionData: SessionData = {
    uid: user.uid,
    email: user.email,
    name: user.name,
    age: user.age,
    gender: user.gender,
    createdAt: now,
    expiresAt,
  };

  // Create JWT token
  const token = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .setIssuedAt(Math.floor(now / 1000))
    .sign(getSecretKey());

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_DURATION / 1000),
    path: '/',
  });
}

/**
 * Verify and decode session from HTTP-only cookie
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Verify and decode JWT
    const { payload } = await jwtVerify(token, getSecretKey());

    // Check if session is expired
    const sessionData = payload as unknown as SessionData;
    if (sessionData.expiresAt < Date.now()) {
      await destroySession();
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUserFromSession(): Promise<User | null> {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  return {
    uid: session.uid,
    email: session.email,
    name: session.name,
    age: session.age,
    gender: session.gender,
  };
}

/**
 * Update session with new user data
 */
export async function updateSession(userData: Partial<User>): Promise<void> {
  const currentSession = await getSession();
  
  if (!currentSession) {
    throw new Error('No active session to update');
  }

  const updatedUser: User = {
    uid: currentSession.uid,
    email: currentSession.email,
    name: userData.name ?? currentSession.name,
    age: userData.age ?? currentSession.age,
    gender: userData.gender ?? currentSession.gender,
  };

  await createSession(updatedUser);
}

/**
 * Destroy session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}
