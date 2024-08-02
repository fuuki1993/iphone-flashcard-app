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
  limit,
  Timestamp,
  writeBatch,
  getDocsFromCache
} from 'firebase/firestore';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// コレクション名の定数
const SETS_COLLECTION = 'sets';
const HISTORY_COLLECTION = 'studyHistory';
const SESSION_STATES_COLLECTION = 'sessionStates';
const SETTINGS_COLLECTION = 'settings';

//=============================================================================
// セット関連の関数
//=============================================================================

/**
 * 新しいセットを保存する
 * @param {Object} set - 保存するセットのデータ
 * @param {string} userId - ユーザーID
 * @returns {Promise<string>} 保存されたセットのID
 */
export const saveSet = async (set, userId) => {
  try {
    const newSetRef = doc(collection(db, `users/${userId}/${SETS_COLLECTION}`));
    const newSet = {
      ...set,
      id: newSetRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(newSetRef, newSet);
    return newSet;
  } catch (error) {

    throw error;
  }
};

/**
 * ユーザーのセットを取得する
 * @param {string} userId - ユーザーID
 * @param {string|null} type - セットのタイプ（オプション）
 * @returns {Promise<Array>} セットの配列
 */
export const getSets = async (userId, type = null) => {
  try {
    let q = collection(db, `users/${userId}/${SETS_COLLECTION}`);
    q = query(q, orderBy("updatedAt", "desc"));

    const querySnapshot = await getDocs(q);
    const sets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (type) {
      return sets.filter(set => set.type === type);
    }
    return sets;
  } catch (error) {

    throw error;
  }
};

/**
 * ユーザーの全セットを取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 全セットの配列
 */
export const getAllSets = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/${SETS_COLLECTION}`), orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {

    throw error;
  }
};

/**
 * 特定のセットをIDで取得する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @returns {Promise<Object>} セットのデータ
 */
export const getSetById = async (userId, setId) => {
  try {
    if (!setId || typeof setId !== 'string' || setId.trim() === '') {
      throw new Error('無効なsetIdです');
    }
    const setRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, setId);
    const setSnap = await getDoc(setRef);
    if (setSnap.exists()) {
      const setData = setSnap.data();
      if (setData.type === 'qa' && !setData.qaItems) {
        console.warn('QAクイズセットにqaItemsフィールドがありません');
        setData.qaItems = []; // デフォルト値を設定
      }
      return { id: setSnap.id, ...setData };
    } else {
      throw new Error(`セットが見つかりません: ${setId}`);
    }
  } catch (error) {

    throw error;
  }
};

/**
 * セットを更新する
 * @param {Object} set - 更新するセットのデータ
 * @param {string} userId - ユーザID
 * @returns {Promise<string>} 更新されたセットのID
 */
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

/**
 * セットを削除する
 * @param {string} userId - ユーザーID
 * @param {string} setId - 削除するセットのID
 * @returns {Promise<number>} 新しい進捗状況
 */
export const deleteSet = async (userId, setId) => {
  const batch = writeBatch(db);

  try {
    // セットの削除
    const setRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, setId);
    batch.delete(setRef);

    // 関連するsessionstateの削除
    const sessionStateTypes = ['qa', 'flashcard', 'classification', 'multiple-choice'];
    sessionStateTypes.forEach(type => {
      const sessionStateRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${type}`);
      batch.delete(sessionStateRef);
    });

    // 関連するstudyhistoryの削除
    const studyHistoryRef = collection(db, `users/${userId}/${HISTORY_COLLECTION}`);
    const q = query(studyHistoryRef, where("setId", "==", setId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // バッチ処理を実行
    await batch.commit();

    // セット削除後に進捗を再計算
    const newProgress = await recalculateProgressAfterDeletion(userId);
    return newProgress;
  } catch (error) {

    throw error;
  }
};

/**
 * セットのタイトルを取得する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @returns {Promise<string>} セットのタイトル
 */
export const getSetTitle = async (userId, setId) => {
  try {
    const set = await getSetById(userId, setId);
    return set.title;
  } catch (error) {

    throw error;
  }
};

//=============================================================================
// 学習履歴関連の関数
//=============================================================================

/**
 * 学習履歴を保存する
 * @param {string} userId - ユーザーID
 * @param {Object} studyHistoryEntry - 学習履歴エントリ
 * @returns {Promise<string>} 保存された学習履歴のID
 */
export const saveStudyHistory = async (userId, studyHistoryEntry) => {
  try {
    const studyHistoryRef = collection(db, 'users', userId, 'studyHistory');
    const docRef = await addDoc(studyHistoryRef, {
      ...studyHistoryEntry,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving study history:", error);
    throw error;
  }
};

/**
 * ユーザーの学習履歴を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 学習履歴の配列
 */
export const getStudyHistory = async (userId) => {

  try {
    const studyHistoryRef = collection(db, 'users', userId, 'studyHistory');
    const q = query(studyHistoryRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const studyHistory = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
      };
    });


    return studyHistory;
  } catch (error) {

    throw error;
  }
};

/**
 * 学習履歴エントリを削除する
 * @param {string} userId - ユーザーID
 * @param {string} entryId - 削除する学習履歴エントリのID
 */
export const deleteStudyHistoryEntry = async (userId, entryId) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${HISTORY_COLLECTION}`, entryId));
  } catch (error) {

    throw error;
  }
};

//=============================================================================
// セッション状態関連の関数
//=============================================================================

/**
 * セッション状態を保存する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @param {string} quizType - クイズタイプ
 * @param {Object} sessionState - セッション状態
 */
export const saveSessionState = async (userId, setId, quizType, sessionState) => {
  try {
    const docRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${quizType}`);
    const now = serverTimestamp();
    await setDoc(docRef, { 
      ...sessionState,
      quizType,
      lastStudyDate: now,
      updatedAt: now
    }, { merge: true });
  } catch (error) {
    console.error("Error saving session state:", error);
    throw error;
  }
};

/**
 * セッション状態を取得する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @param {string} quizType - クイズタイプ
 * @returns {Promise<Object|null>} セッション状態
 */
export const getSessionState = async (userId, setId, quizType) => {
  try {
    const docRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${quizType}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting session state:", error);
    throw error;
  }
};

/**
 * セッション状態をクリアする
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @param {string} quizType - クイズタイプ
 */
export const clearSessionState = async (userId, setId, quizType) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${quizType}`));
  } catch (error) {
    console.error("Error clearing session state:", error);
    throw error;
  }
};

//=============================================================================
// 設定関連の関数
//=============================================================================

/**
 * 設定を保存する
 * @param {string} userId - ユーザーID
 * @param {string} key - 設定キー
 * @param {*} value - 設定値
 */
export const saveSettings = async (userId, key, value) => {
  try {
    await setDoc(doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, key), { 
      value, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
};

/**
 * 設定を取得する
 * @param {string} userId - ユーザーID
 * @param {string} key - 設定キー
 * @returns {Promise<*>} 設定値
 */
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
    console.error("Error getting settings:", error);
    throw error;
  }
};

// ユーザー設定を更新する関数を修正
export const updateUserSettings = async (userId, settings) => {
  try {
    const userSettingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
    await setDoc(userSettingsRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// ユーザー設定を取得する関数を修正
export const getUserSettings = async (userId) => {
  try {
    const userSettingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
    const docSnap = await getDoc(userSettingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return {
        darkMode: false, // デフォルト値
        dailyGoal: 60,   // デフォルト値
        // 他のデフォルト設定...
      };
    }
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
};

export const getDarkModeSetting = async (userId) => {
  const userDoc = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userDoc);
  if (userSnapshot.exists()) {
    const userData = userSnapshot.data();
    return userData.darkMode || false;
  }
  return false;
};

export const updateDarkModeSetting = async (userId, darkMode) => {
  const userDoc = doc(db, 'users', userId);
  await setDoc(userDoc, { darkMode }, { merge: true });
};

/**
 * ユーザーの表示名を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<string>} ユーザーの表示名
 */
export const getUserDisplayName = async (userId) => {
  try {
    const userSettingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
    const docSnap = await getDoc(userSettingsRef);
    if (docSnap.exists()) {
      return docSnap.data().displayName || '';
    } else {
      return '';
    }
  } catch (error) {
    console.error('Error getting user display name:', error);
    throw error;
  }
};

//=============================================================================
// 共有関連の関数
//=============================================================================
// セットを公開する
export const publishSet = async (userId, setId) => {
  try {
    const setRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, setId);
    await updateDoc(setRef, { isPublished: true });
    
    // 公開セットコレクションにコピーを作成
    const publicSetRef = doc(collection(db, 'publicSets'));
    const setData = await getDoc(setRef);
    await setDoc(publicSetRef, {
      ...setData.data(),
      originalAuthorId: userId,
      publishedAt: serverTimestamp()
    });
    
    console.log(`Set published successfully. Public set ID: ${publicSetRef.id}`);
    return publicSetRef.id;
  } catch (error) {
    console.error("Error publishing set:", error);
    throw error;
  }
};

// セットの公開を解除する
export const unpublishSet = async (userId, setId) => {
  try {
    const setRef = doc(db, `users/${userId}/${SETS_COLLECTION}`, setId);
    await updateDoc(setRef, { isPublished: false });
    
    // 公開セットコレクションから削
    const publicSetsRef = collection(db, 'publicSets');
    const q = query(publicSetsRef, where("originalAuthorId", "==", userId), where("id", "==", setId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  } catch (error) {

    throw error;
  }
};

// 公開されたセットを取得する
export const getPublishedSets = async () => {
  try {
    const publicSetsRef = collection(db, 'publicSets');
    const q = query(publicSetsRef, orderBy("publishedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const publishedSets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    publishedSets.forEach(set => {

    });
    return publishedSets;
  } catch (error) {

    throw error;
  }
};

// 公されたセットをコピーする
export const copyPublishedSet = async (userId, publishedSetId) => {
  try {
    console.log(`Attempting to copy published set with ID: ${publishedSetId}`);
    
    // 全ての公開セットを取得
    const allPublicSets = await getAllPublicSets();
    console.log('All public sets:', allPublicSets);
    
    // IDに基づいてセットを検索
    const publicSetData = allPublicSets.find(set => set.id === publishedSetId);
    
    if (publicSetData) {
      console.log('Found public set data:', publicSetData);
      
      const newSetData = {
        cards: publicSetData.cards,
        title: publicSetData.title,
        type: publicSetData.type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: false,
        originalAuthorId: publicSetData.originalAuthorId
      };

      const newSetRef = doc(collection(db, `users/${userId}/${SETS_COLLECTION}`));
      await setDoc(newSetRef, {
        ...newSetData,
        id: newSetRef.id
      });

      return newSetRef.id;
    } else {
      console.log('All public sets:', allPublicSets);
      throw new Error(`公開されたセットが見つかりません。ID: ${publishedSetId}`);
    }
  } catch (error) {
    console.error(`Error copying published set (ID: ${publishedSetId}):`, error);
    throw error;
  }
};

// すべての公開セットを取得する補助関数
const getAllPublicSets = async () => {
  const publicSetsRef = collection(db, 'publicSets');
  const snapshot = await getDocs(publicSetsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * 公開セットの詳細を取得する
 * @param {string} publicSetId - 公開セットのID
 * @returns {Promise<Object>} 公開セットの詳細
 */
export const getPublicSetDetails = async (publicSetId) => {
  try {
    console.log("Fetching public set details for ID:", publicSetId);
    
    const publicSetsRef = collection(db, 'publicSets');
    const q = query(publicSetsRef, where("id", "==", publicSetId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const setData = querySnapshot.docs[0].data();
      console.log("Public set found:", setData);
      return { id: querySnapshot.docs[0].id, ...setData };
    } else {
      console.log("Public set not found");
      throw new Error('公開セットが見つかりません');
    }
  } catch (error) {
    console.error("公開セットの詳細取得中にエラーが発生しました:", error);
    throw error;
  }
};

//=============================================================================
// 日付関連の関数
//=============================================================================

/**
 * 最終リセット日を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<*>} 最終リセット日
 */
export const getLastResetDate = async (userId) => {
  return getSettings(userId, 'lastResetDate');
};

/**
 * 最終リセット日を設定する
 * @param {string} userId - ユーザーID
 * @param {*} date - 最終リセット日
 */
export const setLastResetDate = async (userId, date) => {
  await saveSettings(userId, 'lastResetDate', date);
};

/**
 * 最終目標リセット日を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<*>} 最終目標リセット日
 */
export const getLastGoalResetDate = async (userId) => {
  return getSettings(userId, 'lastGoalResetDate');
};

/**
 * 最終目標リセット日を設定する
 * @param {string} userId - ユーザーID
 * @param {*} date - 最終目標リセット日
 */
export const setLastGoalResetDate = async (userId, date) => {
  await saveSettings(userId, 'lastGoalResetDate', date);
};

//=============================================================================
// 学習時間関連の関数
//=============================================================================

/**
 * 今日の学習時間を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 今日の学習時間
 */
export const getTodayStudyTime = async (userId) => {
  return getSettings(userId, 'todayStudyTime') || 0;
};

/**
 * 今日の学習時間を保存する
 * @param {string} userId - ユーザーID
 * @param {number} time - 学習時間
 */
export const saveTodayStudyTime = async (userId, time) => {
  await saveSettings(userId, 'todayStudyTime', time);
};

/**
 * 今日の学習時間を計算する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 今日の学習時間（秒）
 */
export const calculateTodayStudyTime = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const studyHistoryRef = collection(db, `users/${userId}/${HISTORY_COLLECTION}`);
    const q = query(studyHistoryRef, 
      where('date', '>=', today.toISOString()),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const todayStudyTime = querySnapshot.docs.reduce((total, doc) => {
      const data = doc.data();
      return total + (data.studyDuration || 0);
    }, 0);

    return todayStudyTime;
  } catch (error) {
    console.error("Error calculating today's study time:", error);
    throw error;
  }
};

//=============================================================================
// 進捗関連の関数
//=============================================================================

/**
 * 全体の進捗を保存する
 * @param {string} userId - ユーザーID
 * @param {number} progress - 進捗
 */
export const saveOverallProgress = async (userId, progress) => {
  await saveSettings(userId, 'overallProgress', progress);
};

/**
 * 全体の進捗を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 全体の進捗
 */
export const getOverallProgress = async (userId) => {
  return getSettings(userId, 'overallProgress') || 0;
};

/**
 * ユーザーの最大進捗を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} ユーザーの最大進捗
 */
export const getUserMaxProgress = async (userId) => {
  try {
    const maxProgressRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'maxProgress');
    const docSnap = await getDoc(maxProgressRef);
    if (docSnap.exists()) {
      return docSnap.data().value;
    } else {
      return 0; // デフォルト値として0を返す
    }
  } catch (error) {
    console.error("Error getting user max progress:", error);
    throw error;
  }
};

/**
 * ユーザーの最大進捗を更新する
 * @param {string} userId - ユーザーID
 * @param {number} newProgress - 新しい最大進捗
 */
export const updateUserMaxProgress = async (userId, newProgress) => {
  try {
    const maxProgressRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'maxProgress');
    await setDoc(maxProgressRef, { 
      value: newProgress, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {

    throw error;
  }
};

/**
 * 現在の進捗を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 現在の進捗
 */
export const getCurrentProgress = async (userId) => {
  try {
    const progressRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'currentProgress');
    const docSnap = await getDoc(progressRef);
    if (docSnap.exists()) {
      return docSnap.data().value;
    } else {
      return 0; // デフォルト値として0を返す
    }
  } catch (error) {

    throw error;
  }
};

/**
 * 現在の進捗を更新する
 * @param {string} userId - ユーザーID
 * @param {number} newProgress - 新しい進捗
 */
export const updateCurrentProgress = async (userId, newProgress) => {
  try {
    const progressRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'currentProgress');
    await setDoc(progressRef, { 
      value: newProgress, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {

    throw error;
  }
};

/**
 * 現在の進捗を計算する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 現在の進捗
 */
export const calculateCurrentProgress = async (userId) => {
  try {
    const allSets = await getAllSets(userId);
    const totalItems = calculateTotalItems(allSets);

    const sessionStates = await Promise.all(
      allSets.map(set => getSessionState(userId, set.id))
    );

    const completedItems = sessionStates.reduce((total, state) => {
      if (state && state.studiedItems) {
        return total + state.studiedItems.length;
      }
      return total;
    }, 0);

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  } catch (error) {

    throw error;
  }
};

/**
 * 削除後の進捗を再計算する
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 新しい進捗
 */
export const recalculateProgressAfterDeletion = async (userId) => {
  try {
    const allSets = await getAllSets(userId);
    const totalItems = calculateTotalItems(allSets);
    const completedItems = await calculateCompletedItems(userId, allSets);
    const newProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    
    await updateCurrentProgress(userId, newProgress);
    
    // 最大進捗も更新（ただし減少させない）
    const currentMaxProgress = await getUserMaxProgress(userId);
    if (newProgress > currentMaxProgress) {
      await updateUserMaxProgress(userId, newProgress);
    }
    
    return newProgress;
  } catch (error) {

    throw error;
  }
};

//=============================================================================
// 統計関連の関数
//=============================================================================

/**
 * ユーザー統計を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} ユーザー統計
 */
export const getUserStatistics = async (userId) => {
  try {
    const cachedUserStats = localStorage.getItem(`userStats_${userId}`);
    if (cachedUserStats) {
      const { data, timestamp } = JSON.parse(cachedUserStats);
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }

    // ここを修正
    const userStatsRef = doc(db, `userStatistics/${userId}`);
    const userStatsSnap = await getDoc(userStatsRef);
    
    if (userStatsSnap.exists()) {
      const userStats = userStatsSnap.data();
      localStorage.setItem(`userStats_${userId}`, JSON.stringify({ data: userStats, timestamp: Date.now() }));
      return userStats;
    } else {
      // デフォルトの統計データを返す
      const defaultStats = {
        totalStudyTime: 0,
        todayStudiedCards: 0,
        totalStudyTimeComparison: 0,
        todayStudiedCardsComparison: 0
      };
      localStorage.setItem(`userStats_${userId}`, JSON.stringify({ data: defaultStats, timestamp: Date.now() }));
      return defaultStats;
    }
  } catch (error) {

    throw error;
  }
};

//=============================================================================
// 画像アップロード関連の関数
//=============================================================================

/**
 * 画像をアップロードする
 * @param {File} file - アップロードするファイル
 * @param {string} path - アップロード先のパス
 * @returns {Promise<string>} ダウンロードURL
 */
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

//=============================================================================
// ヘルパー関数
//=============================================================================

/**
 * セットの総アイテム数を計算する
 * @param {Array} sets - セットの配列
 * @returns {number} 総アイテム数
 */
const calculateTotalItems = (sets) => {
  return sets.reduce((total, set) => {
    switch (set.type) {
      case 'flashcard':
        return total + (set.cards ? set.cards.length : 0);
      case 'qa':
        return total + (set.qaItems ? set.qaItems.length : 0);
      case 'multiple-choice':
        return total + (set.questions ? set.questions.length : 0);
      case 'classification':
        return total + (set.categories ? set.categories.reduce((sum, category) => sum + (category.items ? category.items.length : 0), 0) : 0);
      default:
        return total;
    }
  }, 0);
};

/**
 * 完了したアイテム数を計算する
 * @param {string} userId - ユーザーID
 * @param {Array} sets - セットの配列
 * @returns {Promise<number>} 完了したアイテム数
 */
const calculateCompletedItems = async (userId, sets) => {
  let completedItems = 0;
  for (const set of sets) {
    const sessionState = await getSessionState(userId, set.id);
    if (sessionState) {
      completedItems += sessionState.studiedItems ? sessionState.studiedItems.length : 0;
    }
  }
  return completedItems;
};


/**
 * 同期されていないデータのみをサーバーと同期する
 * @param {string} userId - ユーザーID
 */
export const syncUnsyncedData = async (userId) => {
  try {
    // セットの同期
    const unsyncedSets = await getUnsyncedSets(userId);
    for (const set of unsyncedSets) {
      await updateSet(set, userId);
    }

    // 学習履歴の同期
    const unsyncedHistory = await getUnsyncedStudyHistory(userId);
    for (const entry of unsyncedHistory) {
      await saveStudyHistory(userId, entry);
    }

    // セッション状態の同期
    const unsyncedSessionStates = await getUnsyncedSessionStates(userId);
    for (const state of unsyncedSessionStates) {
      await saveSessionState(userId, state.setId, state.state);
    }

    // ユーザー設定の同期
    const unsyncedSettings = await getUnsyncedUserSettings(userId);
    if (unsyncedSettings) {
      await updateUserSettings(userId, unsyncedSettings);
    }

    // 進捗の再計算と同期（必な場合のみ）
    const currentProgress = await getCurrentProgress(userId);
    const calculatedProgress = await calculateCurrentProgress(userId);
    if (currentProgress !== calculatedProgress) {
      await updateCurrentProgress(userId, calculatedProgress);
    }


  } catch (error) {

    throw error;
  }
};

/**
 * 同期されていないセットを取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 未同期のセットの配列
 */
const getUnsyncedSets = async (userId) => {
  const lastSyncTime = await getLastSyncTime(userId, 'sets');
  const setsRef = collection(db, `users/${userId}/${SETS_COLLECTION}`);
  const q = query(setsRef, where('updatedAt', '>', lastSyncTime));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};


/**
 * 同期されていない学習履歴を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 未の学習履歴の配列
 */
const getUnsyncedStudyHistory = async (userId) => {
  const lastSyncTime = await getLastSyncTime(userId, 'studyHistory');
  const historyRef = collection(db, `users/${userId}/${HISTORY_COLLECTION}`);
  const q = query(historyRef, where('createdAt', '>', lastSyncTime));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * 同期されていないセッション状態を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} 未同期のセッション状態の配列
 */
const getUnsyncedSessionStates = async (userId) => {
  const lastSyncTime = await getLastSyncTime(userId, 'sessionStates');
  const statesRef = collection(db, `users/${userId}/${SESSION_STATES_COLLECTION}`);
  const q = query(statesRef, where('updatedAt', '>', lastSyncTime));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ setId: doc.id, state: doc.data() }));
};

/**
 * 同期されていないユーザー設定を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object|null>} 未同期のユーザー設定
 */
const getUnsyncedUserSettings = async (userId) => {
  const lastSyncTime = await getLastSyncTime(userId, 'userSettings');
  const settingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
  const docSnap = await getDoc(settingsRef);
  if (docSnap.exists() && docSnap.data().updatedAt > lastSyncTime) {
    return docSnap.data();
  }
  return null;
};

/**
 * 最後の同期時刻を取得する
 * @param {string} userId - ユーザーID
 * @param {string} dataType - データタイプ
 * @returns {Promise<Timestamp>} 最後の同期時刻
 */
const getLastSyncTime = async (userId, dataType) => {
  const syncTimeRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, `lastSyncTime_${dataType}`);
  const docSnap = await getDoc(syncTimeRef);
  if (docSnap.exists()) {
    return docSnap.data().timestamp;
  }
  return Timestamp.fromDate(new Date(0)); // 1970年1月1日（未同期の場合）
};

/**
 * 最後の同期時刻を更新する
 * @param {string} userId - ユーザーID
 * @param {string} dataType - データタイプ
 */
const updateLastSyncTime = async (userId, dataType) => {
  const syncTimeRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, `lastSyncTime_${dataType}`);
  await setDoc(syncTimeRef, { timestamp: serverTimestamp() });
};