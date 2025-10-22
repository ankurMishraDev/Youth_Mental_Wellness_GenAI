import type { SignupFormState, User } from "../types";
import { apiFetch } from "./api";

const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

interface FirebaseErrorResponse {
  error?: {
    message?: string;
  };
}

interface SignupResponse {
  localId: string;
  email: string;
  idToken: string;
}

interface SignInResponse {
  localId: string;
  email: string;
  idToken: string;
}

interface AccountInfoResponse {
  users?: Array<{
    localId: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
  }>;
}

const ensureApiKey = () => {
  if (!API_KEY) {
    throw new Error(
      "Firebase web API key is not configured. Set EXPO_PUBLIC_FIREBASE_API_KEY in your app config."
    );
  }

  return API_KEY;
};

const mapFirebaseError = (code?: string) => {
  switch (code) {
    case "EMAIL_EXISTS":
      return "An account with this email already exists.";
    case "INVALID_EMAIL":
      return "The email address is invalid.";
    case "INVALID_PASSWORD":
      return "The password is incorrect.";
    case "USER_DISABLED":
      return "This account has been disabled.";
    case "EMAIL_NOT_FOUND":
      return "No account found with this email.";
    case "WEAK_PASSWORD":
    case "WEAK_PASSWORD : Password should be at least 6 characters":
      return "Password should be at least 6 characters long.";
    default:
      return code ? code.replace(/_/g, " ").toLowerCase() : undefined;
  }
};

const firebaseRequest = async <T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> => {
  const apiKey = ensureApiKey();
  const response = await fetch(`${FIREBASE_AUTH_BASE_URL}/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as T | FirebaseErrorResponse;

  if (!response.ok) {
    const errorCode = (json as FirebaseErrorResponse)?.error?.message;
    const message = mapFirebaseError(errorCode);
    throw new Error(message || "Firebase request failed. Please try again.");
  }

  return json as T;
};

const syncUserProfile = async (params: {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  gender?: string;
  emailVerified?: boolean;
}) => {
  try {
    await apiFetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.warn("Failed to sync user profile", error);
  }
};

export const signup = async (formData: SignupFormState) => {
  const signUpData = await firebaseRequest<SignupResponse>("accounts:signUp", {
    email: formData.email,
    password: formData.password,
    returnSecureToken: true,
  });

  try {
    await firebaseRequest("accounts:sendOobCode", {
      requestType: "VERIFY_EMAIL",
      idToken: signUpData.idToken,
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    throw new Error("Failed to send verification email. Please try again.");
  }

  await syncUserProfile({
    uid: signUpData.localId,
    email: signUpData.email,
    name: formData.name,
    age: formData.age ? Number.parseInt(formData.age, 10) : undefined,
    gender: formData.gender || undefined,
    emailVerified: false,
  });

  return {
    uid: signUpData.localId,
    email: signUpData.email,
  };
};

export const login = async (email: string, password: string): Promise<User> => {
  const signInData = await firebaseRequest<SignInResponse>(
    "accounts:signInWithPassword",
    {
      email,
      password,
      returnSecureToken: true,
    }
  );

  const accountInfo = await firebaseRequest<AccountInfoResponse>("accounts:lookup", {
    idToken: signInData.idToken,
  });

  const firebaseUser = accountInfo.users?.[0];

  if (!firebaseUser) {
    throw new Error("Unable to retrieve user information.");
  }

  if (!firebaseUser.emailVerified) {
    try {
      await firebaseRequest("accounts:sendOobCode", {
        requestType: "VERIFY_EMAIL",
        idToken: signInData.idToken,
      });
    } catch (error) {
      console.error("Failed to resend verification email", error);
    }

    const verificationError = new Error(
      "Please verify your email address. We just sent a fresh verification link to your inbox."
    );
    (verificationError as Error & { code?: string }).code = "EMAIL_NOT_VERIFIED";
    throw verificationError;
  }

  let profile: User | null = null;

  try {
    profile = await getCurrentUser(firebaseUser.localId);
  } catch (error) {
    console.warn("Failed to load profile from database", error);
  }

  await syncUserProfile({
    uid: firebaseUser.localId,
    email: firebaseUser.email || email,
    name: profile?.name,
    age: profile?.age,
    gender: profile?.gender,
    emailVerified: firebaseUser.emailVerified,
  });

  return {
    uid: firebaseUser.localId,
    email: firebaseUser.email || email,
    name: profile?.name || firebaseUser.displayName || undefined,
    age: profile?.age,
    gender: profile?.gender,
  };
};

export const requestPasswordReset = async (email: string) => {
  await firebaseRequest("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
};

export const getCurrentUser = async (uid: string): Promise<User> => {
  const data = await apiFetch<{
    uid: string;
    email: string;
    name?: string;
    age?: number;
    gender?: string;
  }>(`/api/user/${uid}`);

  return {
    uid: data.uid || uid,
    email: data.email,
    name: data.name,
    age: data.age,
    gender: data.gender,
  };
};
