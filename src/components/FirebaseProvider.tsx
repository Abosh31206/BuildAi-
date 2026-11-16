import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testConnection,
} from '../lib/firebase';

interface FirebaseContextValue {
  user: User | null;
  isAuthReady: boolean;
  isCloudConnected: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  isAuthReady: false,
  isCloudConnected: false,
  isSigningIn: false,
  authError: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testConnection().then((ok) => setIsCloudConnected(ok));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName: (firebaseUser.displayName || 'Инженер BuildAI KZ').slice(0, 120),
              role: 'engineer',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(
              userRef,
              {
                displayName: (firebaseUser.displayName || snap.data().displayName || 'Инженер BuildAI KZ').slice(0, 120),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }

          if (firebaseUser.email) {
            const privRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
            await setDoc(
              privRef,
              {
                uid: firebaseUser.uid,
                email: firebaseUser.email.slice(0, 200),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (err) {
          // Log without crashing guest UX if rules/network disallow write
          console.warn('User profile sync skipped:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка авторизации Google';
      setAuthError(msg);
      handleFirestoreError(err, OperationType.WRITE, 'auth/google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isAuthReady,
        isCloudConnected,
        isSigningIn,
        authError,
        signIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};
