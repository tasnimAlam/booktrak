import { useCallback, useEffect, useState } from "react";
import { fetchMe, getToken, setToken } from "./api.ts";
import AuthPage from "./components/AuthPage.tsx";
import BooksPage from "./components/BooksPage.tsx";
import type { User } from "./types.ts";

export default function App() {
  // undefined = still checking a saved token, null = logged out
  const [user, setUser] = useState<User | null | undefined>(getToken() ? undefined : null);
  const [notice, setNotice] = useState<string | null>(null);

  // A saved token may be expired; /me confirms it and returns the user.
  useEffect(() => {
    if (user === undefined) fetchMe().then(setUser, () => setUser(null));
  }, [user]);

  // Stable: BooksPage's fetch effects depend on it, so a new function would refetch.
  const logout = useCallback((message: string | null = null) => {
    setToken(null);
    setNotice(message);
    setUser(null);
  }, []);

  if (user === undefined) return <p className="p-6 text-muted">Loading…</p>;
  if (!user)
    return (
      <AuthPage
        notice={notice}
        onAuth={(u) => {
          setNotice(null);
          setUser(u);
        }}
      />
    );
  return <BooksPage user={user} onLogout={logout} />;
}
