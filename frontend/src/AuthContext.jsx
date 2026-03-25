/**
 * AuthContext.jsx
 * Provides { user, profile, saveUserProfile, loading } to all components.
 * Automatically loads Firestore profile when user logs in.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, loadProfile, saveProfile } from './firebase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = initialising
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const p = await loadProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
  }, []);

  const saveUserProfile = async (data) => {
    if (!user) return;
    await saveProfile(user.uid, data);
    setProfile(prev => ({ ...prev, ...data }));
  };

  return (
    <AuthCtx.Provider value={{
      user,
      profile,
      saveUserProfile,
      loading: user === undefined,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
