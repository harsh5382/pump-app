# Petrol Pump Management System

Web-based system for managing daily fuel sales, stock, meter readings, staff shifts, tanker deliveries, accounting, and reporting. Supports desktop and mobile.

## Features

- **User roles**: Owner/Admin, Manager, Staff (role-based access)
- **Fuel types**: Petrol, Diesel; admin can add more
- **Tank management**: Add tanks, daily dip entry, loss/gain calculation
- **Nozzle management**: Machines linked to fuel type and tank
- **Daily meter readings**: Opening/closing meter, auto fuel sold
- **Tanker delivery**: Record deliveries, auto update stock
- **Daily sales**: Auto from meter readings; admin manual correction
- **Payment tracking**: Cash, UPI, Card, Fleet Card, Credit; mismatch warning
- **Expenses**: Generator, maintenance, cleaning, salary advance
- **Staff shifts**: Shift time, assigned machine, cash collected
- **Stock**: Opening + Received − Sold = Closing; system vs dip difference
- **Dashboard**: Today’s petrol/diesel sale, revenue, stock, tanker received, charts
- **Reports**: Daily, monthly, fuel sale, staff, expense; export Excel & PDF
- **Notifications**: Low stock, meter not entered, payment mismatch
- **Security**: Login, role-based access, audit log

## Tech Stack

- **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS
- **Backend**: Next.js API + Firebase
- **Database**: Firestore
- **Auth**: Firebase Authentication

## Setup

1. **Clone and install**
   ```bash
   cd petrol-pump-app
   npm install
   ```

2. **Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable **Authentication** (Email/Password)
   - Create **Firestore** database
   - Copy `.env.local.example` to `.env.local` and set:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - Deploy rules: `firebase deploy --only firestore:rules` (after `firebase init`)

3. **Fix "auth/configuration-not-found"**
   - In [Firebase Console](https://console.firebase.google.com) → your project:
   - **Build** → **Authentication** → **Get started** (enable Auth if needed)
   - **Sign-in method** → **Email/Password** → **Enable** → Save
   - **Settings** (gear) → **Authorized domains** → **Add domain** → add `localhost`
   - Restart the dev server after changing `.env.local`.

4. **First user**
   - Use **Sign up** on the app (first sign-up gets **admin** role).
   - Or create a user in Firebase Auth, then in Firestore add `users/{uid}` with `email`, `displayName`, `role: "admin"`, `createdAt`, `updatedAt` (ISO strings).

5. **Seed fuel types**
   - Log in as admin, go to **Fuel Types**, add **Petrol** and **Diesel** (unit: L).

6. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app/` – Next.js App Router (login, dashboard, all feature pages)
- `src/components/` – Layout, dashboard, protected route
- `src/context/` – Auth context
- `src/lib/` – Firebase, db helpers, utils, audit, export
- `src/types/` – TypeScript types

## License

MIT
