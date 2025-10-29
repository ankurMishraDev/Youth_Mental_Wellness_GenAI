import { User } from "./types"

const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

type FirebaseErrorResponse = {
  error?: {
    message?: string
  }
}

type SignupResponse = {
  localId: string
  email: string
  idToken: string
}

type SignInResponse = {
  localId: string
  email: string
  idToken: string
}

type AccountInfoResponse = {
  users?: Array<{
    localId: string
    email?: string
    emailVerified?: boolean
    displayName?: string
  }>
}

type SignupFormData = {
  email: string
  password: string
  name: string
  age: string
  gender: string
}

type SyncProfileParams = {
  uid: string
  email: string
  name?: string
  age?: number
  gender?: string
  emailVerified?: boolean
}

export type SignupResult = {
  uid: string
  email: string
}

const ensureApiKey = () => {
  if (!API_KEY) {
    throw new Error(
      "Firebase web API key is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY."
    )
  }
  return API_KEY
}

const mapFirebaseError = (code?: string) => {
  switch (code) {
    case "EMAIL_EXISTS":
      return "An account with this email already exists."
    case "INVALID_EMAIL":
      return "The email address is invalid."
    case "INVALID_PASSWORD":
      return "The password is incorrect."
    case "USER_DISABLED":
      return "This account has been disabled."
    case "EMAIL_NOT_FOUND":
      return "No account found with this email."
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "Password should be at least 6 characters long."
    default:
      return code ? code.replace(/_/g, " ").toLowerCase() : undefined
  }
}

const firebaseRequest = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const apiKey = ensureApiKey()
  const response = await fetch(`${FIREBASE_AUTH_BASE_URL}/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as T | FirebaseErrorResponse

  if (!response.ok) {
    const firebaseError = (data as FirebaseErrorResponse)?.error?.message
    const message = mapFirebaseError(firebaseError)
    throw new Error(message || "Firebase request failed. Please try again.")
  }

  return data as T
}

const syncUserProfile = async ({
  uid,
  email,
  name,
  age,
  gender,
  emailVerified,
}: SyncProfileParams) => {
  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        email,
        name,
        age,
        gender,
        emailVerified,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      console.warn("Failed to persist user profile:", data.error || response.statusText)
    }
  } catch (error) {
    console.error("Failed to sync user profile:", error)
  }
}

export const signup = async (formData: SignupFormData): Promise<SignupResult> => {
  try {
    const signUpData = await firebaseRequest<SignupResponse>("accounts:signUp", {
      email: formData.email,
      password: formData.password,
      returnSecureToken: true,
    })

    try {
      await firebaseRequest("accounts:sendOobCode", {
        requestType: "VERIFY_EMAIL",
        idToken: signUpData.idToken,
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
      throw new Error("Failed to send verification email. Please try again.")
    }

    await syncUserProfile({
      uid: signUpData.localId,
      email: signUpData.email,
      name: formData.name,
      age: formData.age ? Number.parseInt(formData.age) : undefined,
      gender: formData.gender || undefined,
      emailVerified: false,
    })

    return {
      uid: signUpData.localId,
      email: signUpData.email,
    }
  } catch (error) {
    console.error("Signup failed:", error)
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error("Signup failed. Please try again.")
  }
}

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const signInData = await firebaseRequest<SignInResponse>("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    })

    const accountInfo = await firebaseRequest<AccountInfoResponse>("accounts:lookup", {
      idToken: signInData.idToken,
    })

    const firebaseUser = accountInfo.users?.[0]

    if (!firebaseUser) {
      throw new Error("Unable to retrieve user information.")
    }

    if (!firebaseUser.emailVerified) {
      try {
        await firebaseRequest("accounts:sendOobCode", {
          requestType: "VERIFY_EMAIL",
          idToken: signInData.idToken,
        })
      } catch (error) {
        console.error("Failed to resend verification email:", error)
      }
      const verificationError = new Error(
        "Please verify your email address. We have sent a new verification link to your inbox."
      )
      ;(verificationError as Error & { code?: string }).code = "EMAIL_NOT_VERIFIED"
      throw verificationError
    }

    await syncUserProfile({
      uid: firebaseUser.localId,
      email: firebaseUser.email || email,
      name: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
    })

    let profile: User | null = null

    try {
      profile = await getCurrentUser(firebaseUser.localId)
    } catch (error) {
      console.warn("Failed to load profile from database:", error)
    }

    const user: User = {
      uid: firebaseUser.localId,
      email: firebaseUser.email || email,
      name: profile?.name || firebaseUser.displayName || undefined,
      age: profile?.age,
      gender: profile?.gender,
    }

    localStorage.setItem("curez_user", JSON.stringify(user))
    return user
  } catch (error) {
    console.error("Login failed:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Login failed. Please try again.")
  }
}

export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await firebaseRequest("accounts:sendOobCode", {
      requestType: "PASSWORD_RESET",
      email,
    })
  } catch (error) {
    console.error("Failed to request password reset:", error)
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error("Failed to request password reset. Please try again.")
  }
}

export const getCurrentUser = async (uid: string): Promise<User> => {
  try {
    const response = await fetch(`/api/user/${uid}`)
    const data = await response.json()

    if (response.ok) {
      const user: User = {
        uid: data.uid || uid,
        email: data.email,
        name: data.name,
        age: data.age,
        gender: data.gender,
      }
      return user
    } else {
      throw new Error(data.error || "Failed to fetch user data")
    }
  } catch (error) {
    console.error("Failed to fetch user data:", error)
    throw new Error("Failed to fetch user data. Please try again.")
  }
}

export const logout = () => {
  localStorage.removeItem("curez_user")
}

/*
 * DEPRECATED: This file is no longer used.
 * Use lib/api/auth.ts for authentication functions.
 * This file used insecure localStorage and has been replaced with
 * secure HTTP-only cookie-based authentication.
 */
