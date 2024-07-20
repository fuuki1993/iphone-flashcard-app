import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SETS_COLLECTION = 'sets';
const HISTORY_COLLECTION = 'studyHistory';
const SESSION_STATES_COLLECTION = 'sessionStates';
const SETTINGS_COLLECTION = 'settings';

export const saveSet = async (set, userId) => {
  try {
    const docRef = await addDoc(collection(db, `users/${userId}/${SETS_COLLECTION}`), {
      ...set,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {

    throw error;
  }
};

export const getSets = async (userId, type = null) => {
  try {
    let q = collection(db, `users/${userId}/${SETS_COLLECTION}`);
    if (type) {
      q = query(q, where("type", "==", type));
    }
    q = query(q, orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

export const getAllSets = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/${SETS_COLLECTION}`), orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

export const getSetById = async (userId, setId) => {
  try {

    if (!setId || typeof setId !== 'string' || setId.trim() === '') {
      throw new Error('無効なsetIdです');
    }
    const setRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, setId);
    const setSnap = await getDoc(setRef);
    if (setSnap.exists()) {

      return { id: setSnap.id, ...setSnap.data() };
    } else {

      throw new Error('セットが見つかりません');
    }
  } catch (error) {

    throw error;
  }
};

export const updateSet = async (set, userId) => {
  try {
    const docRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, set.id);
    const { categoryImages, ...setWithoutImages } = set;
    
    // Update main set data without images
    await updateDoc(docRef, {
      ...setWithoutImages,
      updatedAt: serverTimestamp()
    });

    // If there are images, upload them to Firebase Storage and update URLs in Firestore
    if (categoryImages && categoryImages.length > 0) {
      const imageUrls = await Promise.all(categoryImages.map(async (image, index) => {
        if (image && image.startsWith('data:')) {
          const response = await fetch(image);
          const blob = await response.blob();
          const imagePath = `sets/${set.id}/category_${index}.jpg`;
          return await uploadImage(blob, imagePath);
        }
        return image; // If it's already a URL, keep it as is
      }));

      await updateDoc(docRef, {
        categoryImages: imageUrls
      });
    }

    return set.id;
  } catch (error) {

    throw error;
  }
};

export const deleteSet = async (userId, id) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${SETS_COLLECTION}`, id));
  } catch (error) {

    throw error;
  }
};

export const saveStudyHistory = async (userId, setId, setTitle, setType, score, endTime, studyDuration, cardsStudied) => {
  try {
    const newEntry = {
      setId,
      setTitle,
      setType,
      score,
      date: new Date(endTime).toISOString(),
      studyDuration,
      cardsStudied,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, `users/${userId}/${HISTORY_COLLECTION}`), newEntry);
    return docRef.id;
  } catch (error) {

    throw error;
  }
};

export const getStudyHistory = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/${HISTORY_COLLECTION}`), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

export const saveSessionState = async (userId, setId, setType, state) => {
  try {
    const docRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${setType}`);
    await setDoc(docRef, { 
      setId, 
      setType, 
      state, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {

    throw error;
  }
};

export const getSessionState = async (userId, setId, setType) => {
  try {
    const docRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${setType}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {

    throw error;
  }
};

export const clearSessionState = async (userId, setId, setType) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${setType}`));
  } catch (error) {

    throw error;
  }
};

export const saveSettings = async (userId, key, value) => {
  try {
    await setDoc(doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, key), { 
      value, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {

    throw error;
  }
};

export const getSettings = async (userId, key) => {
  try {
    const docRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().value;
    } else {
      return null;
    }
  } catch (error) {

    throw error;
  }
};

export const getLastResetDate = async (userId) => {
  return getSettings(userId, 'lastResetDate');
};

export const setLastResetDate = async (userId, date) => {
  await saveSettings(userId, 'lastResetDate', date);
};

export const getLastGoalResetDate = async (userId) => {
  return getSettings(userId, 'lastGoalResetDate');
};

export const setLastGoalResetDate = async (userId, date) => {
  await saveSettings(userId, 'lastGoalResetDate', date);
};

export const getTodayStudyTime = async (userId) => {
  return getSettings(userId, 'todayStudyTime') || 0;
};

export const saveTodayStudyTime = async (userId, time) => {
  await saveSettings(userId, 'todayStudyTime', time);
};

export const saveOverallProgress = async (userId, progress) => {
  await saveSettings(userId, 'overallProgress', progress);
};

export const getOverallProgress = async (userId) => {
  return getSettings(userId, 'overallProgress') || 0;
};

export const getSetTitle = async (userId, setId) => {
  try {
    const set = await getSetById(userId, setId);
    return set.title;
  } catch (error) {

    throw error;
  }
};

export const deleteStudyHistoryEntry = async (userId, entryId) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${HISTORY_COLLECTION}`, entryId));
  } catch (error) {

    throw error;
  }
};

export const uploadImage = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {

    throw error;
  }
};