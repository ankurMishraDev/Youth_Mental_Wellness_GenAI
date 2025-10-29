/**
 * Get Current User API Route
 * GET /api/auth/me
 */

import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await getCurrentUserFromSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
