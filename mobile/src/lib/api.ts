const ensureLeadingSlash = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export const resolveApiUrl = (path: string) => {
  if (/^https?:/i.test(path)) {
    return path;
  }

  if (!API_BASE_URL) {
    return ensureLeadingSlash(path);
  }

  return `${API_BASE_URL}${ensureLeadingSlash(path)}`;
};

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    const errorMessage = (data as unknown as { error?: string }).error;
    throw new Error(errorMessage || response.statusText || "Request failed");
  }

  return data;
};
