/**
 * Forgot Password API Route
 * POST /api/auth/forgot-password
 */

import { NextRequest, NextResponse } from "next/server";

const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "Firebase API key not configured" },
        { status: 500 }
      );
    }

    // Request password reset from Firebase
    const response = await fetch(
      `${FIREBASE_AUTH_BASE_URL}/accounts:sendOobCode?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      const errorMessage = data.error?.message || "Failed to request password reset";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
