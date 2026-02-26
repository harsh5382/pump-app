# How to Use the Petrol Pump Management Website

This guide explains how to set up, sign in, and use every feature of the Petrol Pump Management System.

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [Sign up and sign in](#2-sign-up-and-sign-in)
3. [User roles](#3-user-roles)
4. [Navigation and layout](#4-navigation-and-layout)
5. [Initial setup (one-time)](#5-initial-setup-one-time)
6. [Daily operations](#6-daily-operations)
7. [Dashboard (home)](#7-dashboard-home)
8. [Tanks](#8-tanks)
9. [Nozzles (dispensing machines)](#9-nozzles-dispensing-machines)
10. [Meter readings](#10-meter-readings)
11. [Tanker deliveries](#11-tanker-deliveries)
12. [Sales](#12-sales)
13. [Payments](#13-payments)
14. [Expenses](#14-expenses)
15. [Shifts](#15-shifts)
16. [Stock](#16-stock)
17. [Reports](#17-reports)
18. [Alerts & notifications](#18-alerts--notifications)
19. [Fuel types (admin)](#19-fuel-types-admin)
20. [Users (admin)](#20-users-admin)
21. [Mobile use](#21-mobile-use)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. Getting started

### What you need

- A modern web browser (Chrome, Edge, Firefox, Safari).
- The app URL (e.g. `http://localhost:3000` for local development, or your deployed URL).
- Firebase must be configured (see project `README.md`): Authentication (Email/Password) and Firestore with rules and indexes deployed.

### First time

1. Open the website.
2. On the home page you will see **Sign In** and **Sign Up**.
3. If no account exists yet, use **Sign Up** to create the first account. The **first user becomes an admin**; after that you can sign in or sign up as needed.

---

## 2. Sign up and sign in

### Sign up (create account)

1. Click **Sign Up** on the home page (or go to `/signup`).
2. Enter:
   - **Display name** (e.g. your name).
   - **Email** (used to sign in).
   - **Password** (keep it safe).
3. Click the sign-up button.
4. You are taken to the **Dashboard**.
5. **Role:** The **first** account created in the app gets the **admin** role. All later sign-ups get **staff** until an admin creates more users and assigns roles.

### Sign in

1. Click **Sign In** on the home page (or go to `/login`).
2. Enter your **email** and **password**.
3. Click **Sign In**.
4. You are taken to the **Dashboard**.

### If you don’t have admin access

- Only the **first** sign-up gets admin automatically.
- To make another user admin: an existing admin can go to **Users** and create a new user with role **Admin**, or an admin can set your role in Firestore (see [Troubleshooting](#22-troubleshooting)).

---

## 3. User roles

| Role     | What they can do |
|----------|-------------------|
| **Admin** | Everything. Can add **Fuel types**, **Nozzles**, and **Users**. Sees “Admin” section in the sidebar (Fuel Types, Users). Can see “Manual correction (Admin only)” note on Sales. |
| **Manager** | Same dashboard access as staff in the current app. (Reserved for future use.) |
| **Staff**   | Use all daily features: Tanks, Meter readings, Tanker deliveries, Sales view, Payments, Expenses, Shifts, Stock, Reports, Alerts. Cannot add Fuel types, Nozzles, or Users. |

- **Adding tanks and fuel types:** Any signed-in user (any role) can add tanks and fuel types so that a single person can set up the pump.
- **Adding nozzles:** Only **admin** can add nozzles (dispensing machines).
- **Managing users:** Only **admin** can open the Users page and create users with a chosen role.

---

## 4. Navigation and layout

### Sidebar (desktop)

- **Main links (all roles):** Dashboard, Tanks, Nozzles, Meter Readings, Tanker Deliveries, Sales, Payments, Expenses, Shifts, Stock, Reports, Alerts.
- **Admin block (admin only):** Fuel Types, Users.

### Header

- **Left:** Your role (e.g. “admin”, “staff”).
- **Right:** Your name/email; click to open the menu:
  - **Alerts** → Alerts & Notifications page.
  - **Users** (admin only) → Users page.
  - **Sign Out** → sign out and return to login.

### Mobile

- Use the **menu icon (☰)** at the top left to open the sidebar.
- Tap the **X** or the dark overlay to close it.
- The rest of the app is the same; tables scroll horizontally where needed.

---

## 5. Initial setup (one-time)

Do this once when the pump is new or when adding new fuel/machines.

### Step 1: Fuel types

1. Go to **Fuel Types** (sidebar under Admin if you are admin; otherwise in the main nav depending on your build).
2. Click **Add** after entering:
   - **Name** (e.g. Petrol, Diesel).
   - **Unit** (e.g. L).
3. Add all fuel types you sell (e.g. Petrol, Diesel).

### Step 2: Tanks

1. Go to **Tanks**.
2. Click **Add tank**.
3. Fill:
   - **Tank name** (e.g. Tank 1).
   - **Fuel type** (choose one from the list).
   - **Capacity (liters)**.
4. Click **Save**.
5. Repeat for every tank.

### Step 3: Nozzles (admin only)

1. Go to **Nozzles**.
2. If you are admin, you will see the “Add nozzle” form.
3. Enter:
   - **Machine number** (e.g. 1, 2).
   - **Fuel type** (e.g. Petrol).
   - **Tank connected** (the tank that feeds this machine).
4. Click **Add**.
5. Repeat for every dispensing machine.

After this, you can use daily features: meter readings, tanker deliveries, payments, etc.

---

## 6. Daily operations

Typical daily flow:

1. **Meter readings** – Enter opening and closing meter for each nozzle for the day.
2. **Sales** – View fuel sold (from meter readings) and payments.
3. **Payments** – Record cash, UPI, card, etc., and optionally check against expected revenue.
4. **Tanker delivery** – When a tanker arrives, add a delivery; tank stock increases automatically.
5. **Dip entry** (Tanks) – Record dip reading and actual quantity for tanks; see loss/gain vs system stock.
6. **Expenses / Shifts** – Record expenses and staff shifts as needed.
7. **Reports** – Run and export reports when needed.

---

## 7. Dashboard (home)

**Path:** Dashboard (first link in sidebar) or `/dashboard`.

Shows for **today**:

- **Petrol sold today** (liters) – from meter readings.
- **Diesel sold today** (liters) – from meter readings.
- **Total revenue** – sum of payments for the day.
- **Stock remaining** – total current stock across tanks (from tanker deliveries; not reduced by sales in the app).
- **Chart:** Fuel sales by type (bar chart).
- **Chart:** Stock by tank (pie chart).
- **Table:** Tanker deliveries received today.

All figures are read-only on the dashboard; data is entered on the respective pages (Meter Readings, Payments, Tanks, Tanker Deliveries).

---

## 8. Tanks

**Path:** Tanks → `/dashboard/tanks`.

### Add tank

1. Click **Add tank**.
2. Enter **Tank name**, **Fuel type**, **Capacity (liters)**.
3. Click **Save**.

Any signed-in user can add tanks.

### Tanks list

- Table shows: Name, Fuel type, Capacity, Current stock (liters).
- Current stock increases when you add a **Tanker delivery** for that tank; the app does not reduce stock when sales are recorded.

### Daily dip entry

1. Choose **Date**.
2. Select **Tank** from the dropdown (if no tanks exist, add one first).
3. Enter **Dip reading** and **Actual quantity (L)**.
4. The page shows **Loss/Gain** vs the system’s expected quantity (tank’s current stock).
5. Click **Save dip**.

Dip history for the selected date is shown below the form.

---

## 9. Nozzles (dispensing machines)

**Path:** Nozzles → `/dashboard/nozzles`.

### View nozzles

- Table lists: Machine number, Fuel type, Tank. All users can view.

### Add nozzle (admin only)

1. If you are admin, fill **Machine number**, **Fuel type**, **Tank connected**.
2. Click **Add**.

Each nozzle must be linked to one fuel type and one tank. Used later for **Meter readings** (one row per nozzle per day).

---

## 10. Meter readings

**Path:** Meter Readings → `/dashboard/meter-readings`.

Used to record **opening and closing meter** for each machine so the app can compute fuel sold.

### How it works

- **Fuel sold** = Closing meter − Opening meter (per nozzle per day).
- One row per nozzle; you can create or update the reading for that nozzle and date.

### Steps

1. Select **Date**.
2. For each nozzle (machine), enter:
   - **Opening** (morning meter).
   - **Closing** (evening meter).
3. **Sold** is calculated automatically.
4. Click **Save** on the row(s) you want to save.

If there are no nozzles, add them first from **Nozzles** (admin).

---

## 11. Tanker deliveries

**Path:** Tanker Deliveries → `/dashboard/tanker-deliveries`.

Record fuel received from a tanker; **tank stock increases automatically**.

### Add delivery

1. Select **Date**.
2. Enter **Tanker company** and **Invoice number**.
3. Choose **Fuel type** and **Tank**.
4. Enter **Quantity received (L)**.
5. Click **Add** (or Save).

The tank’s **current stock** is increased by that quantity. You can see updated stock on **Tanks** and **Stock** and on the Dashboard.

---

## 12. Sales

**Path:** Sales → `/dashboard/sales`.

### What you see

- **Date** selector.
- **Fuel sold by type** – from meter readings for that date (Petrol, Diesel, etc.).
- **Total payments** – sum of payments for that date.
- **Admin:** A note about “Manual correction (Admin only)” – corrections are not implemented in the UI; they would be via API or a future form.

Sales view is informational; enter data in **Meter readings** and **Payments**.

---

## 13. Payments

**Path:** Payments → `/dashboard/payments`.

Record money received (cash, UPI, card, etc.).

### Add payment

1. Select **Date**.
2. Optionally enter **Expected revenue** – if total payments differ from this, the app can show a mismatch warning (depends on your build).
3. Click **Add payment** (or similar).
4. Choose **Payment type:** Cash, UPI, Credit card, Fleet card, Credit customer.
5. Enter **Amount** and optional **Notes**.
6. Save.

Payments are summed for the day and shown on **Sales** and **Dashboard** (today’s total revenue).

---

## 14. Expenses

**Path:** Expenses → `/dashboard/expenses`.

Record daily expenses.

### Add expense

1. Select **Date**.
2. Choose **Category:** e.g. Generator diesel, Maintenance, Cleaning, Salary advance, Other.
3. Enter **Amount** and **Description**.
4. Save.

You can see the list and total for the selected date on the same page.

---

## 15. Shifts

**Path:** Shifts → `/dashboard/shifts`.

Record staff shifts and cash collected.

### Add shift

1. Select **Date**.
2. Enter **Staff name**, **Shift start**, **Shift end**.
3. Optionally select **Assigned nozzles** and **Cash collected**.
4. Save.

Shifts are used for reporting and accountability; they do not change tank stock or meter readings.

---

## 16. Stock

**Path:** Stock → `/dashboard/stock`.

### What you see

- **Date** selector.
- Table per **tank**: System stock (from tanker deliveries and current stock field), Dip test (from dip entries), and **Difference** (dip vs system).

Use this to compare system stock with physical dip and spot discrepancies. Stock increases only via **Tanker deliveries**; the app does not reduce stock when sales are recorded.

---

## 17. Reports

**Path:** Reports → `/dashboard/reports`.

### Options

- **Report type:** Daily, Monthly, Fuel sale, Staff, Expense (or similar, depending on build).
- **Date range:** Start and end date.
- Click **Refresh** (or similar) to load data.
- **Export:** Excel and/or PDF.

Use this for summaries and record-keeping. Exact report types and columns are defined in the app.

---

## 18. Alerts & notifications

**Path:** Alerts (in sidebar) → `/dashboard/notifications`.

- View a list of notifications (e.g. low stock, meter not entered, payment mismatch, info).
- Mark items as read.
- Notification **creation** is not done from this page; it would be from backend logic or a future feature. This page is for **viewing and marking read**.

---

## 19. Fuel types (admin)

**Path:** Fuel Types (in Admin section if admin) → `/dashboard/fuel-types`.

- **Add fuel type:** Name (e.g. Petrol, Diesel) and Unit (e.g. L). **Any signed-in user** can add fuel types in the current build.
- **Existing types:** List of all fuel types. No edit/delete in the UI.

Add fuel types before adding tanks and nozzles.

---

## 20. Users (admin)

**Path:** Users (in sidebar and header menu, admin only) → `/dashboard/users`.

- **Non-admin:** You see “Only admin can manage users.” and cannot open the full page.
- **Admin:** Can create users and see the user list.

### Create user (admin only)

1. Enter **Email**, **Password**, **Display name**.
2. Choose **Role:** Admin, Manager, or Staff.
3. Click create/save.

The new user can sign in with that email and password and will have the chosen role.

---

## 21. Mobile use

- **Layout:** On small screens the sidebar is hidden; tap the **menu icon (☰)** to open it. Tap **X** or the overlay to close.
- **Forms and tables:** Pages use responsive layout; tables scroll horizontally. Buttons and inputs are sized for touch where possible.
- **Same features:** All features (Tanks, Meter readings, Payments, etc.) are available on mobile; only the layout and menu behavior change.

---

## 22. Troubleshooting

### Can’t sign in / stuck on “Signing in…”

- Check browser console and network tab: look for Firebase Auth or Firestore errors.
- Ensure Firebase Auth is enabled (Email/Password) and your domain (e.g. `localhost`) is in Authorized domains.
- Ensure Firestore rules are deployed and allow read for `users/{uid}` when signed in. If your user has no Firestore profile doc, the app may still let you in with a fallback profile; you can add a `users/{uid}` document in Firestore with `role: "admin"` if needed.

### “Missing or insufficient permissions”

- Deploy Firestore rules: `firebase deploy --only firestore:rules`.
- Deploy indexes if the error mentions an index: `firebase deploy --only firestore:indexes` or create the index from the link in the error.
- Ensure your user has a `users/{uid}` document in Firestore (or the app’s fallback profile). Rules use `getUserRole()` which defaults to `staff` if the doc is missing; create/update rules allow creating your own `users` doc.

### I don’t see “Add tank” or “Add fuel type”

- In the current build, **any signed-in user** can add tanks and fuel types. If you still don’t see them, hard-refresh the page and ensure you are logged in. If the UI was different in your version, check that you have the latest code.

### I don’t see “Add nozzle” or “Users”

- Only **admin** sees and can use Add nozzle and the Users page. Sign in as the first user (admin) or have an admin create your account with Admin role, or set your `users/{uid}.role` to `"admin"` in Firestore.

### Tank dropdown has no options

- Add at least one **Tank** from the Tanks page (and at least one **Fuel type** from Fuel Types first). The dropdown will then list tanks.

### Notifications / Alerts page needs an index

- If Firebase asks for a composite index, you can create it from the link in the error, or deploy indexes: `firebase deploy --only firestore:indexes`. The app can also work without that index by fetching recent notifications and filtering in memory.

### Making my user an admin

- **Option A:** Be the first to sign up; the first user is set to admin.
- **Option B:** An existing admin creates you from **Users** with role **Admin**.
- **Option C:** In Firebase Console → Firestore → `users` collection, find the document with ID = your user UID (from Authentication). Edit the document and set field **role** to **admin**. Then sign out and sign in again.

---

## Quick reference

| I want to…              | Where to go        | Who can do it   |
|-------------------------|--------------------|-----------------|
| Sign in / Sign up       | Home → Sign In/Up  | Anyone          |
| See today’s summary     | Dashboard          | All             |
| Add fuel type           | Fuel Types         | All             |
| Add tank                | Tanks → Add tank   | All             |
| Add nozzle              | Nozzles            | Admin only      |
| Daily meter readings    | Meter Readings     | All             |
| Record tanker delivery  | Tanker Deliveries | All             |
| Record payments         | Payments           | All             |
| Record expenses         | Expenses           | All             |
| Record shifts           | Shifts             | All             |
| Dip entry               | Tanks → Daily dip  | All             |
| View stock vs dip       | Stock              | All             |
| Run / export reports    | Reports            | All             |
| View alerts             | Alerts             | All             |
| Add/manage users        | Users              | Admin only      |

---

*This guide describes the Petrol Pump Management System as implemented in the codebase. For technical setup (Firebase, env, deploy), see the project `README.md`.*
