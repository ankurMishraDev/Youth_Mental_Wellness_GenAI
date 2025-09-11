import { User } from "./types"

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()

    if (response.ok) {
      const user: User = { uid: data.uid, email }
      localStorage.setItem("youthguide_user", JSON.stringify(user))
      return user
    } else {
      throw new Error(data.error || "Login failed")
    }
  } catch (error) {
    console.error("Login failed:", error)
    throw new Error("Login failed. Please try again.")
  }
}

export const signup = async (formData: {
  email: string
  password: string
  name: string
  age: string
  gender: string
}): Promise<User> => {
  try {
    const response = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
    const data = await response.json()

    if (response.ok) {
      const user: User = {
        uid: data.uid,
        email: formData.email,
        name: formData.name,
        age: Number.parseInt(formData.age),
        gender: formData.gender,
      }
      localStorage.setItem("youthguide_user", JSON.stringify(user))
      return user
    } else {
      throw new Error(data.error || "Signup failed")
    }
  } catch (error) {
    console.error("Signup failed:", error)
    throw new Error("Signup failed. Please try again.")
  }
}

export const logout = () => {
  localStorage.removeItem("youthguide_user")
}