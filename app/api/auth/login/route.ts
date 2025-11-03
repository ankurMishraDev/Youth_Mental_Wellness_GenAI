/**
 * Login API Route with Secure Session
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/server/session";

const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

type FirebaseErrorResponse = {
  error?: {
    message?: string;
  };
};

type SignInResponse = {
  localId: string;
  email: string;
  idToken: string;
};

type AccountInfoResponse = {
  users?: Array<{
    localId: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
  }>;
};

const mapFirebaseError = (code?: string) => {
  switch (code) {
    case "EMAIL_NOT_FOUND":
      return "No account found with this email.";
    case "INVALID_PASSWORD":
      return "The password is incorrect.";
    case "USER_DISABLED":
      return "This account has been disabled.";
    case "INVALID_EMAIL":
      return "The email address is invalid.";
    default:
      return code ? code.replace(/_/g, " ").toLowerCase() : "Login failed";
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "Firebase API key not configured" },
        { status: 500 }
      );
    }

    // Sign in with Firebase
    const signInResponse = await fetch(
      `${FIREBASE_AUTH_BASE_URL}/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const signInData = (await signInResponse.json()) as
      | SignInResponse
      | FirebaseErrorResponse;

    if (!signInResponse.ok) {
      const firebaseError = (signInData as FirebaseErrorResponse)?.error?.message;
      const message = mapFirebaseError(firebaseError);
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const userData = signInData as SignInResponse;

    // Get account info
    const accountInfoResponse = await fetch(
      `${FIREBASE_AUTH_BASE_URL}/accounts:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: userData.idToken,
        }),
      }
    );

    const accountInfo = (await accountInfoResponse.json()) as AccountInfoResponse;
    const firebaseUser = accountInfo.users?.[0];

    if (!firebaseUser) {
      return NextResponse.json(
        { error: "Unable to retrieve user information" },
        { status: 500 }
      );
    }

    // Check email verification
    if (!firebaseUser.emailVerified) {
      // Resend verification email
      try {
        await fetch(
          `${FIREBASE_AUTH_BASE_URL}/accounts:sendOobCode?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestType: "VERIFY_EMAIL",
              idToken: userData.idToken,
            }),
          }
        );
      } catch (error) {
        console.error("Failed to resend verification email:", error);
      }

      return NextResponse.json(
        {
          error: "Please verify your email address. We have sent a new verification link to your inbox.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    // Get user profile from database (with decrypted data)
    let profile = null;
    try {
      console.log(`🔍 [LOGIN] Fetching profile for user: ${firebaseUser.localId}`);
      const profileResponse = await fetch(
        `${request.nextUrl.origin}/api/user/${firebaseUser.localId}`,
        { cache: 'no-store' }
      );
      
      if (profileResponse.ok) {
        profile = await profileResponse.json();
        console.log(`✅ [LOGIN] Profile fetched:`, {
          hasName: !!profile?.name,
          name: profile?.name,
          hasAge: !!profile?.age,
          age: profile?.age,
          hasGender: !!profile?.gender,
          gender: profile?.gender
        });
      } else {
        console.warn(`⚠️ [LOGIN] Profile fetch failed: ${profileResponse.status}`);
      }
    } catch (error) {
      console.error("❌ [LOGIN] Failed to load profile from database:", error);
    }

    // Sync user profile
    try {
      await fetch(`${request.nextUrl.origin}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.localId,
          email: firebaseUser.email || email,
          name: profile?.name || firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
        }),
      });
    } catch (error) {
      console.error("Failed to sync user profile:", error);
    }

    const user = {
      uid: firebaseUser.localId,
      email: firebaseUser.email || email,
      name: profile?.name || firebaseUser.displayName || undefined,
      age: profile?.age,
      gender: profile?.gender,
    };

    console.log(`✅ [LOGIN] Creating session with user data:`, {
      uid: user.uid,
      email: user.email,
      name: user.name,
      age: user.age,
      gender: user.gender
    });

    // Create secure session
    await createSession(user);

    console.log(`✅ [LOGIN] Session created successfully for ${user.email}`);

    return NextResponse.json({
      user,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
