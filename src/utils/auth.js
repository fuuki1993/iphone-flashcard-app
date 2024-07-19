// utils/auth.js
import { getAuth } from 'firebase/auth';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword
} from 'firebase/auth';

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

export const updateUserPassword = (newPassword) => {
  const user = auth.currentUser;
  if (user) {
    return updatePassword(user, newPassword);
  }
  throw new Error('No user is signed in');
};