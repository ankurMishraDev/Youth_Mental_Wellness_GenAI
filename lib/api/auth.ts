/**
 * Client-side Auth API
 * Works with secure HTTP-only cookies instead of localStorage
 */

import type { User } from "../types";

type FirebaseErrorResponse = {
  error?: {
    message?: string;
  };
};

type SignupFormData = {
  email: string;
  password: string;
  name: string;
  age: string;
  gender: string;
};

export type SignupResult = {
  uid: string;
  email: string;
};

/**
 * Sign up a new user and create session
 */
export async function signup(formData: SignupFormData): Promise<SignupResult> {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: include cookies
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Signup failed. Please try again.");
    }

    return data;
  } catch (error) {
    console.error("Signup failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Signup failed. Please try again.");
  }
}

/**
 * Login user and create session
 */
export async function login(email: string, password: string): Promise<User> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important: include cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed. Please try again.");
    }

    return data.user;
  } catch (error) {
    console.error("Login failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Login failed. Please try again.");
  }
}

/**
 * Logout user and destroy session
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // Important: include cookies
    });
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include", // Important: include cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to request password reset.");
    }
  } catch (error) {
    console.error("Failed to request password reset:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to request password reset. Please try again.");
  }
}

/**
 * Update user profile
 */
export async function updateProfile(updates: Partial<User>): Promise<User> {
  try {
    const response = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update profile.");
    }

    return data.user;
  } catch (error) {
    console.error("Failed to update profile:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update profile. Please try again.");
  }
}
