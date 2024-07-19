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

export const saveSet = async (set) => {
  try {
    const docRef = await addDoc(collection(db, SETS_COLLECTION), {
      ...set,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {

    throw error;
  }
};

export const getSets = async (type = null) => {
  try {
    let q = collection(db, SETS_COLLECTION);
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

export const getAllSets = async () => {
  try {
    const q = query(collection(db, SETS_COLLECTION), orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

export const getSetById = async (setId) => {
  try {

    if (!setId || typeof setId !== 'string' || setId.trim() === '') {
      throw new Error('無効なsetIdです');
    }
    const setRef = doc(db, 'sets', setId);
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

export const updateSet = async (set) => {
  try {
    const docRef = doc(db, SETS_COLLECTION, set.id);
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

export const deleteSet = async (id) => {
  try {
    await deleteDoc(doc(db, SETS_COLLECTION, id));
  } catch (error) {

    throw error;
  }
};

export const saveStudyHistory = async (setId, setTitle, setType, score, endTime, studyDuration) => {
  try {
    const newEntry = {
      setId,
      setTitle,
      setType,
      score,
      date: new Date(endTime).toISOString(),
      studyDuration,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), newEntry);
    return docRef.id;
  } catch (error) {

    throw error;
  }
};

export const getStudyHistory = async () => {
  try {
    const q = query(collection(db, HISTORY_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

export const saveSessionState = async (setId, setType, state) => {
  try {
    const docRef = doc(db, SESSION_STATES_COLLECTION, `${setId}_${setType}`);
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

export const getSessionState = async (setId, setType) => {
  try {
    const docRef = doc(db, SESSION_STATES_COLLECTION, `${setId}_${setType}`);
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

export const clearSessionState = async (setId, setType) => {
  try {
    await deleteDoc(doc(db, SESSION_STATES_COLLECTION, `${setId}_${setType}`));
  } catch (error) {

    throw error;
  }
};

export const saveSettings = async (key, value) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, key), { 
      value, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {

    throw error;
  }
};

export const getSettings = async (key) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, key);
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

export const getLastResetDate = async () => {
  return getSettings('lastResetDate');
};

export const setLastResetDate = async (date) => {
  await saveSettings('lastResetDate', date);
};

export const getLastGoalResetDate = async () => {
  return getSettings('lastGoalResetDate');
};

export const setLastGoalResetDate = async (date) => {
  await saveSettings('lastGoalResetDate', date);
};

export const getTodayStudyTime = async () => {
  return getSettings('todayStudyTime') || 0;
};

export const saveTodayStudyTime = async (time) => {
  await saveSettings('todayStudyTime', time);
};

export const saveOverallProgress = async (progress) => {
  await saveSettings('overallProgress', progress);
};

export const getOverallProgress = async () => {
  return getSettings('overallProgress') || 0;
};

export const getSetTitle = async (setId) => {
  try {
    const set = await getSetById(setId);
    return set.title;
  } catch (error) {

    throw error;
  }
};

export const deleteStudyHistoryEntry = async (entryId) => {
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, entryId));
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