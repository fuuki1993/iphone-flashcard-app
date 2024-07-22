// utils/auth.js
import { getAuth } from 'firebase/auth';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export const auth = getAuth();

export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  return firebaseSignOut(auth);
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const updateUserProfile = (profileData) => {
  const user = auth.currentUser;
  if (user) {
    return updateProfile(user, profileData);
  }
  throw new Error('No user is signed in');
};

export const updateUserEmail = (newEmail) => {
  const user = auth.currentUser;
  if (user) {
    return updateEmail(user, newEmail);
  }
  throw new Error('No user is signed in');
};

export const reauthenticateUser = async (password) => {
  const user = auth.currentUser;
  if (user) {
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  }
  throw new Error('No user is signed in');
};

export const updateUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await reauthenticateUser(currentPassword);
      return updatePassword(user, newPassword);
    } catch (error) {
      throw error;
    }
  }
  throw new Error('No user is signed in');
};

export const checkUserRole = async (userId) => {
  const db = getFirestore();
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().role || 'user';
  }

  return 'user';
};