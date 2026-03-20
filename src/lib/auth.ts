import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'cliente_final' | 'profesional_reposteria' | 'admin';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
};

const provider = new GoogleAuthProvider();

const toName = (user: User) => user.displayName || user.email?.split('@')[0] || 'Usuario';

export async function ensureUserProfile(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? '',
      name: toName(user),
      role: 'cliente_final',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

export async function registerWithEmail(email: string, password: string, name: string) {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'users', credentials.user.uid), {
    uid: credentials.user.uid,
    email,
    name,
    role: 'cliente_final',
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return credentials.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credentials.user);
  return credentials.user;
}

export async function loginWithGoogle() {
  const credentials = await signInWithPopup(auth, provider);
  await ensureUserProfile(credentials.user);
  return credentials.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}
