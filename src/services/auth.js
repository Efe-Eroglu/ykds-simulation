import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from 'firebase/auth';
import { getFirebaseApp } from '../lib/firebase.js';

let auth = null;
// popup/redirect çözücüsü olmadan başlatılır: gereksiz iframe yüklenmez, paket küçülür.
const A = () => (auth ??= initializeAuth(getFirebaseApp(), { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }));

export const watchAuth = cb => onAuthStateChanged(A(), cb);
export const login = (email, pass) => signInWithEmailAndPassword(A(), email, pass);
export const logout = () => signOut(A());
export const resetPassword = email => sendPasswordResetEmail(A(), email);

/** Mevcut şifreyle yeniden doğrulayıp şifreyi değiştirir. */
export async function changePassword(current, next) {
  const user = A().currentUser;
  if (!user) throw Object.assign(new Error('Oturum yok.'), { code: 'auth/requires-recent-login' });
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
}
