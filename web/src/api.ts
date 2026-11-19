import type { Book, Facets, Filters, User } from "./types.ts";

// shortcut: token in localStorage is readable by any script on the page (XSS risk); move to an httpOnly cookie if the app grows.
const TOKEN_KEY = "booktrak.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage blocked (private mode, disabled site data)
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: the user stays logged in only for this page load
  }
}

// Thrown on 401 so the UI can send the user back to the login screen.
export class UnauthorizedError extends Error {}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401 && !url.startsWith("/api/auth/login")) {
    setToken(null); // expired or invalid
    throw new UnauthorizedError("Session expired. Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      data.error ?? `${init.method ?? "GET"} ${url} failed: ${res.status}`,
    );
  return data as T;
}

// Filtering happens in SQL on the server; this only turns filters into query params.
export function fetchBooks(f: Filters, signal?: AbortSignal): Promise<Book[]> {
  const q = new URLSearchParams();
  for (const a of f.authors) q.append("author", a);
  for (const g of f.genres) q.append("genre", g);
  if (f.minPages !== null) q.set("minPages", String(f.minPages));
  if (f.maxPages !== null) q.set("maxPages", String(f.maxPages));
  return request(`/api/books?${q}`, { signal });
}

export function fetchFacets(): Promise<Facets> {
  return request("/api/books/facets");
}

export function fetchMe(): Promise<User> {
  return request("/api/auth/me");
}

async function authenticate(
  path: "login" | "signup",
  body: object,
): Promise<User> {
  const { token, user } = await request<{ token: string; user: User }>(
    `/api/auth/${path}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  setToken(token);
  return user;
}

export const login = (email: string, password: string) =>
  authenticate("login", { email, password });

export const signup = (name: string, email: string, password: string) =>
  authenticate("signup", { name, email, password });
