# Production Readiness Checklist

## Firestore

### 1. Firestore security rules

Your `firestore.rules` are already production-ready:

- All operations require authentication
- Admin-only: create/update/delete for fuel types, tanks, nozzles, meter readings, deliveries, payments, expenses, shifts, notifications
- Users can read their own profile; admins manage user roles

Deploy rules if not already deployed:

```bash
firebase deploy --only firestore:rules
```

### 2. Firebase Authentication

- Ensure **Email/Password** sign-in is enabled in Firebase Console → Authentication → Sign-in method
- Add your production domain (e.g. `your-app.vercel.app`) to **Authorized domains** in Authentication → Settings

### 3. Environment variables

Ensure these are set in Vercel (or your host):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
