/**
 * firebase.js
 * Firebase setup — Auth + Firestore.
 * All credentials come from VITE_ env vars — never hardcoded.
 *
 * Setup:
 *  1. Create project at https://console.firebase.google.com
 *  2. Add a Web app → copy config values
 *  3. Enable Authentication → Email/Password + Google
 *  4. Enable Firestore Database (start in production mode)
 *  5. Paste values into frontend/.env (see .env.example)
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';

// ─── INIT ─────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// ─── FIRESTORE HELPERS ────────────────────────────────────────────────────────

/** Save / overwrite a user's financial profile + last analysis */
export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Load a user's saved profile */
export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Transactions (expense tracker) ──────────────────────────────────────────

/** Add a transaction */
export async function addTransaction(uid, tx) {
  const ref = collection(db, 'users', uid, 'transactions');
  return addDoc(ref, { ...tx, createdAt: serverTimestamp() });
}

/** Load all transactions, newest first */
export async function loadTransactions(uid) {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Delete a transaction */
export async function deleteTransaction(uid, txId) {
  await deleteDoc(doc(db, 'users', uid, 'transactions', txId));
}

// ── Goals ────────────────────────────────────────────────────────────────────

/** Save / update a goal */
export async function saveGoal(uid, goal) {
  const ref = goal.id
    ? doc(db, 'users', uid, 'goals', goal.id)
    : doc(collection(db, 'users', uid, 'goals'));
  await setDoc(ref, { ...goal, id: ref.id, updatedAt: serverTimestamp() });
  return ref.id;
}

/** Load all goals */
export async function loadGoals(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'goals'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Delete a goal */
export async function deleteGoal(uid, goalId) {
  await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
}
