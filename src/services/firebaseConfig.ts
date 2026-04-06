import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import {
  initializeAuth,
  getAuth,
  // @ts-expect-error Present in React Native Firebase Auth bundle (Metro), not in web .d.ts
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readExtra(): Record<string, unknown> {
  return (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Record<string, unknown>;
}

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const extra = readExtra();
  const apiKey = String(extra.firebaseApiKey ?? '');
  const projectId = String(extra.firebaseProjectId ?? '');
  const appId = String(extra.firebaseAppId ?? '');
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: String(extra.firebaseAuthDomain ?? `${projectId}.firebaseapp.com`),
    projectId,
    storageBucket: String(extra.firebaseStorageBucket ?? `${projectId}.appspot.com`),
    messagingSenderId: String(extra.firebaseMessagingSenderId ?? ''),
    appId,
  };
}

/** Config object for expo-firebase-recaptcha (same fields as Firebase web client). */
export function getFirebaseOptionsForRecaptcha(): Record<string, string> | null {
  const c = getFirebaseWebConfig();
  if (!c) return null;
  return {
    apiKey: c.apiKey,
    authDomain: c.authDomain,
    projectId: c.projectId,
    storageBucket: c.storageBucket,
    messagingSenderId: c.messagingSenderId,
    appId: c.appId,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseWebConfig() !== null;
}

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let auth: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const cfg = getFirebaseWebConfig();
  if (!cfg) {
    throw new Error('Firebase is not configured. Add firebase keys to app.json extra.');
  }
  if (getApps().length === 0) {
    app = initializeApp(cfg);
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function getDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getFirebaseApp());
  return firestore;
}

/**
 * Firebase Auth with AsyncStorage persistence so login survives app restarts.
 * Uses React Native auth build (Metro); getReactNativePersistence is required on RN.
 */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const firebaseApp = getFirebaseApp();
  try {
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Hot reload / second init: fall back to existing instance
    auth = getAuth(firebaseApp);
  }
  return auth;
}
