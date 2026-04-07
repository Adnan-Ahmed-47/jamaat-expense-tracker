/**
 * Firebase Authentication only. Main app is shown after sign-in.
 * If Firebase keys are missing in app.json, see FirebaseRequiredScreen (no app access).
 */
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebaseConfig';
import { syncUserDocument } from '../services/authService';

const LEGACY_OFFLINE_BYPASS_KEY = '@jamaat_offline_bypass';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  firebaseConfigured: boolean;
  /** True when Firebase is configured and the user is signed in */
  showMainApp: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Remove legacy local-only bypass from older app versions
  useEffect(() => {
    void AsyncStorage.removeItem(LEGACY_OFFLINE_BYPASS_KEY);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        await syncUserDocument(u);
      }
    });
    return unsub;
  }, []);

  const firebaseConfigured = isFirebaseConfigured();
  const showMainApp = firebaseConfigured && !!user;

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseConfigured,
      showMainApp,
    }),
    [user, loading, firebaseConfigured, showMainApp]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
