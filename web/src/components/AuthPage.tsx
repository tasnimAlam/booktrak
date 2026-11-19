import { useState, type FormEvent } from "react";
import { login, signup } from "../api.ts";
import type { User } from "../types.ts";
import { btnDark } from "./ui.ts";

const input =
  "h-11 w-full rounded-[10px] border border-line-strong bg-white px-3 focus:border-brand";

export default function AuthPage({
  onAuth,
  notice,
}: {
  onAuth: (u: User) => void;
  notice?: string | null;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    try {
      onAuth(
        isSignup
          ? await signup(String(form.get("name")), email, password)
          : await login(email, password),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          {isSignup ? "Create account" : "Log in"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Sign up to browse the library." : "Log in to browse the library."}
        </p>

        {(error ?? notice) && (
          <p role="alert" className="mt-4 rounded-[10px] bg-chip px-3 py-2 text-sm text-chip-ink">
            {error ?? notice}
          </p>
        )}

        {/* key resets the fields when switching between login and signup */}
        <form key={mode} onSubmit={submit} className="mt-5 flex flex-col gap-4">
          {isSignup && (
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">Name</span>
              <input name="name" required maxLength={100} autoComplete="name" className={input} />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Email</span>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              maxLength={128}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className={input}
            />
            {isSignup && <span className="text-xs text-muted">At least 8 characters.</span>}
          </label>
          <button type="submit" disabled={busy} className={`${btnDark} disabled:opacity-60`}>
            {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isSignup ? "Already have an account?" : "No account yet?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError(null);
            }}
            className="min-h-8 cursor-pointer font-medium text-brand underline"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </main>
  );
}
