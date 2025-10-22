import { apiFetch } from "./api";
import type { User } from "../types";

interface UpdateProfilePayload {
  uid: string;
  name?: string;
  age?: number | string;
  gender?: string;
}

export const updateUserProfile = async (
  payload: UpdateProfilePayload,
  currentUser: User
): Promise<User> => {
  const response = await apiFetch<Partial<User> & { success?: boolean }>("/api/update-profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    uid: response.uid || payload.uid,
    email: response.email || currentUser.email,
    name: response.name ?? payload.name ?? currentUser.name,
    age:
      typeof response.age === "number"
        ? response.age
        : typeof payload.age === "number"
          ? payload.age
          : typeof payload.age === "string" && payload.age.trim()
            ? Number.parseInt(payload.age, 10)
            : currentUser.age,
    gender: response.gender ?? payload.gender ?? currentUser.gender,
  };
};
