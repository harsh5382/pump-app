import { auth } from "@/lib/firebase";

// Bridges Firebase client auth → server session cookie. After a successful
// client sign-in we exchange the ID token for an httpOnly session cookie so the
// trusted backend (server actions / route handlers) can authorise requests.
// No-ops gracefully when the backend isn't configured yet.

export async function establishServerSession(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const idToken = await user.getIdToken(true);
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // Backend not ready — legacy client auth still works.
  }
}

export async function clearServerSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // ignore
  }
}
