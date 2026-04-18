/**
 * firebase.js — v5
 * NEW: recurring transactions, budget limits per category
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';

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
const gp = new GoogleAuthProvider();

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginWithGoogle   = () => signInWithPopup(auth, gp);
export const loginWithEmail    = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const registerWithEmail = (e, p) => createUserWithEmailAndPassword(auth, e, p);
export const logout            = () => signOut(auth);
export const onAuthChange      = (cb) => onAuthStateChanged(auth, cb);

// ── Profile ───────────────────────────────────────────────────────────────────
export async function saveProfile(uid, data) {
  await setDoc(doc(db,'users',uid), { ...data, updatedAt: serverTimestamp() }, { merge:true });
}
export async function loadProfile(uid) {
  const s = await getDoc(doc(db,'users',uid));
  return s.exists() ? s.data() : null;
}

// ── Transactions ──────────────────────────────────────────────────────────────
export async function addTransaction(uid, tx) {
  return addDoc(collection(db,'users',uid,'transactions'), { ...tx, createdAt: serverTimestamp() });
}
export async function loadTransactions(uid) {
  const q = query(collection(db,'users',uid,'transactions'), orderBy('createdAt','desc'));
  const s = await getDocs(q);
  return s.docs.map(d => ({ id:d.id, ...d.data() }));
}
export async function deleteTransaction(uid, id) {
  await deleteDoc(doc(db,'users',uid,'transactions',id));
}

// ── Recurring Transactions (NEW v5) ───────────────────────────────────────────
export async function saveRecurring(uid, rec) {
  const ref = rec.id
    ? doc(db,'users',uid,'recurring',rec.id)
    : doc(collection(db,'users',uid,'recurring'));
  await setDoc(ref, { ...rec, id:ref.id, updatedAt:serverTimestamp() });
  return ref.id;
}
export async function loadRecurring(uid) {
  const s = await getDocs(collection(db,'users',uid,'recurring'));
  return s.docs.map(d => ({ id:d.id, ...d.data() }));
}
export async function deleteRecurring(uid, id) {
  await deleteDoc(doc(db,'users',uid,'recurring',id));
}
export async function bumpNextDue(uid, recId, nextDue) {
  await updateDoc(doc(db,'users',uid,'recurring',recId), { nextDue });
}

// ── Budget Limits (NEW v5) ────────────────────────────────────────────────────
export async function saveBudgetLimits(uid, limits) {
  await setDoc(doc(db,'users',uid,'settings','budgetLimits'),
    { limits, updatedAt:serverTimestamp() });
}
export async function loadBudgetLimits(uid) {
  const s = await getDoc(doc(db,'users',uid,'settings','budgetLimits'));
  return s.exists() ? s.data().limits : {};
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export async function saveGoal(uid, goal) {
  const ref = goal.id
    ? doc(db,'users',uid,'goals',goal.id)
    : doc(collection(db,'users',uid,'goals'));
  await setDoc(ref, { ...goal, id:ref.id, updatedAt:serverTimestamp() });
  return ref.id;
}
export async function loadGoals(uid) {
  const s = await getDocs(collection(db,'users',uid,'goals'));
  return s.docs.map(d => ({ id:d.id, ...d.data() }));
}
export async function deleteGoal(uid, id) {
  await deleteDoc(doc(db,'users',uid,'goals',id));
}

// ── Next-due calculator ───────────────────────────────────────────────────────
export function calcNextDue(fromDate, frequency) {
  const d = new Date(fromDate);
  if (frequency === 'daily')   d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly')  d.setDate(d.getDate() + 7);
  else if (frequency === 'yearly')  d.setFullYear(d.getFullYear() + 1);
  else                              d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}
