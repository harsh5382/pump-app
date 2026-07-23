import "server-only";

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// ───────────────────────────────────────────────────────────────────────────
// Firebase Admin SDK — SERVER ONLY.
//
// Credentials are read from one of:
//   1. FIREBASE_SERVICE_ACCOUNT  – the service-account JSON as a single-line
//      string (recommended for Vercel / App Hosting secrets).
//   2. GOOGLE_APPLICATION_CREDENTIALS – path to a service-account file, OR the
//      ambient credentials when running on Google infrastructure (ADC).
//
// Init is LAZY and never throws at import time, so the app still builds and the
// public surfaces (landing / login / signup) run without admin credentials.
// Trusted operations call requireAdminApp() and fail closed if unconfigured.
// ───────────────────────────────────────────────────────────────────────────

let cachedApp: App | null = null;

function createApp(): App | null {
  if (getApps().length) return getApps()[0]!;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const serviceAccount = JSON.parse(raw);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch (err) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON:", err);
      return null;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
    try {
      return initializeApp({ credential: applicationDefault() });
    } catch (err) {
      console.error("Failed to init Admin SDK with default credentials:", err);
      return null;
    }
  }

  return null;
}

/** Returns the Admin app, or null when no credentials are configured. */
export function getAdminApp(): App | null {
  if (cachedApp) return cachedApp;
  cachedApp = createApp();
  return cachedApp;
}

/** Returns the Admin app or throws — use in trusted operations that must run. */
export function requireAdminApp(): App {
  const app = getAdminApp();
  if (!app) {
    throw new Error(
      "Firebase Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT " +
        "(service-account JSON) in the server environment.",
    );
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(requireAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(requireAdminApp());
}

/** True when admin credentials are present (use to gate trusted features in UI). */
export function isAdminConfigured(): boolean {
  return getAdminApp() !== null;
}
