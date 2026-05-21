/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Combine Environment Variables with local JSON configuration (giving priority to environment variables VITE_*)
const finalConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey || "").trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain || "").trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "").trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket || "").trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId || "").trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId || "").trim(),
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || "").trim(),
};

// Initialize safety variables
let app;
let db: any = null;
let auth: any = null;
let storage: any = null;
let isFirebaseAvailable = false;

const hasValidConfig = finalConfig.apiKey !== "" && finalConfig.projectId !== "";

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(finalConfig) : getApp();
    db = getFirestore(app, finalConfig.firestoreDatabaseId || '(default)');
    auth = getAuth(app);
    storage = getStorage(app);
    isFirebaseAvailable = true;
    console.log("Firebase initialized successfully using unified configuration.");

    // Validate connection dynamically as mandated by security skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase is offline. Please check your network and configuration.");
        }
      }
    };
    testConnection();

  } catch (error) {
    console.error("Firebase SDK failed to load:", error);
  }
} else {
  console.warn("Firebase config is empty. System is operating in optimized Local Storage mode.");
}

export { db, auth, storage, isFirebaseAvailable };
export default app;
