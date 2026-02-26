# Deploy & Custom Domain (mypetrolpump.com)

This project is set up to deploy to **Firebase Hosting** and use the custom domain **mypetrolpump.com**.

---

## 1. Prerequisites

- **Node.js** 18+ and **npm**
- **Firebase CLI**:  
  `npm install -g firebase-tools`  
  Then log in:  
  `firebase login`
- A **Firebase project** (Firestore + Authentication already configured)

---

## 2. Set Your Firebase Project

The app is currently pointed at project **petrol-pump-manager-40213**. If you see "Failed to get Firebase project", that project may not exist or you may not have access.

**List your Firebase projects and pick one:**

```bash
firebase login
firebase projects:list
```

**Use a specific project:**

```bash
firebase use <your-project-id>
```

Example: `firebase use my-petrol-pump-app`

Or edit `.firebaserc` and set `"default"` to your project ID.

---

## 3. Build & Deploy

**Build the app (static export):**

```bash
npm run build
```

This creates the `out` folder used by Hosting.

**Deploy everything (Hosting + Firestore rules/indexes):**

```bash
npm run deploy
```

**Deploy only Hosting:**

```bash
npm run deploy:hosting
```

After deploy, the app will be live at:

- `https://<your-project-id>.web.app`
- `https://<your-project-id>.firebaseapp.com`

---

## 4. Custom Domain: mypetrolpump.com

### Step A – Add domain in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Go to **Hosting** (left sidebar).
3. Click **Add custom domain**.
4. Enter **mypetrolpump.com** and follow the steps.
5. Firebase will show you **DNS records** to add (usually an **A** record and sometimes a **TXT** for verification).

### Step B – Add DNS at your domain registrar

Where you bought **mypetrolpump.com** (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.):

1. Open the **DNS** or **DNS management** section for mypetrolpump.com.
2. Add the records Firebase gave you, for example:
   - **A** record:  
     - Name/host: `@` (or leave blank for root).  
     - Value: the IP Firebase shows (e.g. `151.101.1.195` or similar).
   - If Firebase asks for **TXT**: add that too for verification.
3. For **www.mypetrolpump.com** (optional):  
   Firebase will offer a CNAME or redirect. Add the CNAME if you want www to work.

Wait 5–60 minutes for DNS to propagate. In Hosting, Firebase will show when the domain is **Connected**.

### Step C – Use HTTPS (recommended)

Firebase will automatically provision an SSL certificate for mypetrolpump.com once the domain is connected. No extra steps needed.

### Step D – Allow the domain in Firebase Auth

So login/signup work on mypetrolpump.com:

1. In Firebase Console go to **Authentication** → **Settings** (or **Sign-in method** tab).
2. Open **Authorized domains**.
3. Click **Add domain** and add:
   - `mypetrolpump.com`
   - `www.mypetrolpump.com` (if you use www)

Save. After that, Auth will accept sign-in from your custom domain.

---

## 5. Quick reference

| Task              | Command / place                      |
|-------------------|--------------------------------------|
| Build only        | `npm run build`                      |
| Deploy all        | `npm run deploy`                     |
| Deploy Hosting    | `npm run deploy:hosting`             |
| Change project    | `firebase use <project-id>`          |
| Custom domain     | Hosting → Add custom domain          |
| Auth domain       | Authentication → Authorized domains  |

---

## 6. Troubleshooting

- **Build fails (e.g. “Unexpected end of JSON input” )**  
  - PDF export uses jsPDF from CDN (no jspdf packages).  
  - Run `npm install` and `npm run build` again.  
  - If the error persists (e.g. on Firebase or other chunks), try upgrading Next.js: `npm install next@latest` then `npm run build`, or use Vercel (see below).  
  - Fix any TypeScript or lint errors if reported.

- **Deploy fails**  
  Ensure you’re logged in: `firebase login`, and that the project in `.firebaserc` is correct: `firebase use`.

- **Domain not connecting**  
  Double-check the A (and TXT) records at your registrar match exactly what Firebase shows. Wait up to 24–48 hours for DNS; use [DNS checker](https://dnschecker.org) for mypetrolpump.com.

- **Login doesn’t work on mypetrolpump.com**  
  Add mypetrolpump.com (and www if used) under **Authentication → Authorized domains**.

- **Alternative: host on Vercel**  
  If Firebase Hosting build keeps failing, you can host the Next.js app on [Vercel](https://vercel.com) and add the custom domain mypetrolpump.com there. Keep using Firebase for Firestore and Authentication; only hosting moves to Vercel.
