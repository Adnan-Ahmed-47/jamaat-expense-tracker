import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
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

export function isFirebaseConfigured(): boolean {
  return getFirebaseWebConfig() !== null;
}

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;

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
