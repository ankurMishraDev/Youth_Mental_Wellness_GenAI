/**
 * Signup API Route with Secure Session
 * POST /api/auth/signup
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

type SignupResponse = {
  localId: string;
  email: string;
  idToken: string;
};

const mapFirebaseError = (code?: string) => {
  switch (code) {
    case "EMAIL_EXISTS":
      return "An account with this email already exists.";
    case "INVALID_EMAIL":
      return "The email address is invalid.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "Password should be at least 6 characters long.";
    default:
      return code ? code.replace(/_/g, " ").toLowerCase() : "Signup failed";
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, age, gender } = body;

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

    // Create Firebase user
    const signupResponse = await fetch(
      `${FIREBASE_AUTH_BASE_URL}/accounts:signUp?key=${API_KEY}`,
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

    const signupData = (await signupResponse.json()) as
      | SignupResponse
      | FirebaseErrorResponse;

    if (!signupResponse.ok) {
      const firebaseError = (signupData as FirebaseErrorResponse)?.error?.message;
      const message = mapFirebaseError(firebaseError);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userData = signupData as SignupResponse;

    // Send verification email
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
      console.error("Failed to send verification email:", error);
    }

    // Store user profile in database
    try {
      const profileResponse = await fetch(
        `${request.nextUrl.origin}/api/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userData.localId,
            email: userData.email,
            name,
            age: age ? parseInt(age) : undefined,
            gender: gender || undefined,
            emailVerified: false,
          }),
        }
      );

      if (!profileResponse.ok) {
        console.warn("Failed to persist user profile");
      }
    } catch (error) {
      console.error("Failed to sync user profile:", error);
    }

    // Create secure session
    await createSession({
      uid: userData.localId,
      email: userData.email,
      name,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
    });

    return NextResponse.json({
      uid: userData.localId,
      email: userData.email,
      message: "Signup successful. Please verify your email.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup" },
      { status: 500 }
    );
  }
}
