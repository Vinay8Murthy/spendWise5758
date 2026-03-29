# Spendwise Firebase Setup

## Files
- App: `C:\Users\vinay\source\repos\statementToCSV\spendwise-firebase-ready.html`
- Config: `C:\Users\vinay\source\repos\statementToCSV\firebase-config.js`
- Config sample: `C:\Users\vinay\source\repos\statementToCSV\firebase-config.sample.js`

## What This Version Supports
- Firebase Hosting
- Google Sign-In
- Cloud Firestore sync across devices
- Local `localStorage` fallback until Firebase is configured

## 1. Create A Firebase Project
1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Add a Web App to the project.
4. Copy the Firebase config object.

## 2. Enable Authentication
1. In Firebase Console, go to `Authentication`.
2. Click `Get started`.
3. Enable `Google` as a sign-in provider.
4. Add your support email.

## 3. Enable Firestore
1. Go to `Firestore Database`.
2. Click `Create database`.
3. Start in `Production mode` or `Test mode`.
4. Pick your region.

## 4. Paste Firebase Config Into The Config File
Open `firebase-config.js` and replace:

```js
window.SPENDWISE_FIREBASE_CONFIG = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_FIREBASE_AUTH_DOMAIN",
  projectId: "PASTE_FIREBASE_PROJECT_ID",
  storageBucket: "PASTE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "PASTE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "PASTE_FIREBASE_APP_ID"
};
```

with your real Firebase config from the console.

You can use `firebase-config.sample.js` as a backup template.

## 5. Firestore Rules
Use rules like these so each signed-in user only accesses their own data:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/app/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 6. Test Locally
You can open the HTML directly in the browser for a quick check, but Google popup auth works more reliably when served over HTTP.

Simple local option:

```powershell
cd C:\Users\vinay\source\repos\statementToCSV
python -m http.server 5500
```

Then open:

```txt
http://localhost:5500/spendwise-firebase-ready.html
```

## 7. Install Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
```

## 8. Initialize Hosting
From the project folder:

```powershell
cd C:\Users\vinay\source\repos\statementToCSV
firebase init hosting
```

Recommended answers:
- Use existing Firebase project: `Yes`
- Public directory: `.`
- Configure as single-page app: `No`
- Set up automatic builds: `No`

## 9. Deploy

```powershell
firebase deploy
```

## 10. How Sync Works
- Before sign-in: data stays in local `localStorage`
- After Google sign-in: app syncs to Firestore
- Same Google account on other devices will load the same data
- Local backup is still kept in the browser

## 11. Data Location In Firestore
This version stores app state at:

```txt
users/{uid}/app/state
```

## 12. Free Plan Notes
- Good for small personal/shared use
- Charges only become a concern if reads/writes or storage grow significantly
- Hosting + Auth + light Firestore usage are usually fine for low-volume usage
