/**
 * Logout API Route
 * POST /api/auth/logout
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/session";

export async function POST() {
  try {
    await destroySession();
    
    return NextResponse.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during logout" },
      { status: 500 }
    );
  }
}
