/**
 * Authentication helpers: email/password and phone OTP (Firebase).
 * User profile is stored in Firestore `users/{uid}` for display and joins.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import type { FirebaseAuthApplicationVerifier } from 'expo-firebase-recaptcha';
import { getFirebaseApp, getFirebaseAuth, isFirebaseConfigured } from './firebaseConfig';

/** Holds the SMS verification step between "send code" and "verify OTP". */
let pendingPhoneConfirmation: ConfirmationResult | null = null;

function requireAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  return getFirebaseAuth();
}

function requireDb() {
  return getFirestore(getFirebaseApp());
}

/**
 * Writes/merges the standard user document in Firestore.
 * Call after every successful sign-in so email/phone stay current.
 */
export async function syncUserDocument(user: User): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? undefined;
  const phone = user.phoneNumber ?? undefined;
  const payload: Record<string, unknown> = {
    uid: user.uid,
    displayName: user.displayName ?? null,
    updatedAt: serverTimestamp(),
  };
  if (email) payload.email = email;
  if (phone) payload.phone = phone;
  if (!snap.exists) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
}

export async function signupWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const auth = requireAuth();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  await syncUserDocument(cred.user);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await syncUserDocument(cred.user);
  return cred.user;
}

/**
 * Sends an SMS with a verification code. Next call `verifyOTP` with the code.
 * `recaptcha` must be a mounted FirebaseRecaptchaVerifierModal ref (implements ApplicationVerifier).
 */
export async function loginWithPhone(
  phoneE164: string,
  recaptcha: FirebaseAuthApplicationVerifier
): Promise<void> {
  const auth = requireAuth();
  pendingPhoneConfirmation = await signInWithPhoneNumber(auth, phoneE164.trim(), recaptcha);
}

/** Confirms the SMS code and completes phone sign-in. */
export async function verifyOTP(code: string): Promise<User> {
  const auth = requireAuth();
  if (!pendingPhoneConfirmation) {
    throw new Error('No pending phone verification. Request a new code.');
  }
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error('Enter the verification code');
  }
  const cred = await pendingPhoneConfirmation.confirm(trimmed);
  pendingPhoneConfirmation = null;
  await syncUserDocument(cred.user);
  return cred.user;
}

export function clearPendingPhoneVerification(): void {
  pendingPhoneConfirmation = null;
}

export async function signOutUser(): Promise<void> {
  clearPendingPhoneVerification();
  if (!isFirebaseConfigured()) return;
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser;
}

export function getUserDisplayName(user: User): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.email) return user.email.split('@')[0] ?? user.email;
  if (user.phoneNumber) return user.phoneNumber;
  return 'Member';
}
