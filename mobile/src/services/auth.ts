import { FIREBASE_API_KEY, API_BASE_URL } from "./config"

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

export type AuthUser = {
  uid: string
  email: string
  name?: string
  age?: number
  gender?: string
  emailVerified?: boolean
}

export type SignupForm = {
  email: string
  password: string
  name: string
  age: string
  gender: string
}

const ensureApiKey = () => {
  if (!FIREBASE_API_KEY) {
    throw new Error(
      "Firebase web API key is not configured. Set EXPO_PUBLIC_FIREBASE_API_KEY to continue."
    )
  }
  return FIREBASE_API_KEY
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
    case "WEAK_PASSWORD":
    case "WEAK_PASSWORD : Password should be at least 6 characters":
      return "Password should be at least 6 characters long."
    default:
      return code ? code.replace(/_/g, " ").toLowerCase() : undefined
  }
}

const firebaseRequest = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const apiKey = ensureApiKey()
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey}`, {
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

const syncUserProfile = async (
  payload: Partial<AuthUser> & { uid: string; email: string; emailVerified?: boolean }
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      console.warn("Failed to persist user profile:", data.error || response.statusText)
    }
  } catch (error) {
    console.error("Failed to sync user profile:", error)
  }
}

export const signup = async (form: SignupForm) => {
  const signupData = await firebaseRequest<SignupResponse>("accounts:signUp", {
    email: form.email,
    password: form.password,
    returnSecureToken: true,
  })

  try {
    await firebaseRequest("accounts:sendOobCode", {
      requestType: "VERIFY_EMAIL",
      idToken: signupData.idToken,
    })
  } catch (error) {
    console.error("Failed to send verification email:", error)
    throw new Error("Failed to send verification email. Please try again.")
  }

  await syncUserProfile({
    uid: signupData.localId,
    email: signupData.email,
    name: form.name,
    age: form.age ? Number.parseInt(form.age, 10) : undefined,
    gender: form.gender || undefined,
    emailVerified: false,
  })

  return { uid: signupData.localId, email: signupData.email }
}

export const login = async (email: string, password: string) => {
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
    const error: Error & { code?: string } = new Error(
      "Email not verified. We sent you another verification link."
    )
    error.code = "EMAIL_NOT_VERIFIED"
    throw error
  }

  const profile = await getCurrentUser(signInData.localId)

  return {
    uid: signInData.localId,
    email: signInData.email,
    name: profile?.name,
    age: profile?.age,
    gender: profile?.gender,
    emailVerified: firebaseUser.emailVerified,
  } as AuthUser
}

export const requestPasswordReset = async (email: string) => {
  await firebaseRequest("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  })
}

export const getCurrentUser = async (uid: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/${uid}`)
    if (!response.ok) {
      return null
    }
    return (await response.json()) as Partial<AuthUser> | null
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return null
  }
}

export const updateProfile = async (payload: Partial<AuthUser> & { uid: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || "Failed to update profile")
  }

  return (await response.json()) as AuthUser
}
