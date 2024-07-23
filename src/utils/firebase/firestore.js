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
    console.error("Error saving set:", error);
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

    console.log('Retrieved sets:', sets); // デバッグ用ログ

    return sets;
  } catch (error) {
    console.error("Error getting sets:", error);
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
    console.error("Error getting all sets:", error);
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
    console.error(`Error getting set by ID (${setId}):`, error);
    throw error;
  }
};

/**
 * セットを更新する
 * @param {Object} set - 更新するセットのデータ
 * @param {string} userId - ユーザーID
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
    console.error("Error updating set:", error);
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
    console.error("Error deleting set and related data:", error);
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
    console.error("Error getting set title:", error);
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
    const cachedStudyHistory = localStorage.getItem(`studyHistory_${userId}`);
    if (cachedStudyHistory) {
      const { data, timestamp } = JSON.parse(cachedStudyHistory);
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }

    const studyHistoryRef = collection(db, 'users', userId, 'studyHistory');
    const q = query(studyHistoryRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const studyHistory = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
      };
    });

    localStorage.setItem(`studyHistory_${userId}`, JSON.stringify({ data: studyHistory, timestamp: Date.now() }));
    return studyHistory;
  } catch (error) {
    console.error("Error fetching study history:", error);
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
    console.error("Error deleting study history entry:", error);
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
 * @param {string} setType - セットタイプ
 * @param {Object} state - セッション状態
 */
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
    console.error("Error saving session state:", error);
    throw error;
  }
};

/**
 * セッション状態を取得する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @param {string} setType - セットタイプ
 * @returns {Promise<Object|null>} セッション状態
 */
export const getSessionState = async (userId, setId, setType) => {
  try {
    const docRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${setType}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().state;
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
 * @param {string} setType - セットタイプ
 */
export const clearSessionState = async (userId, setId, setType) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${setType}`));
  } catch (error) {
    console.error("Error clearing session state:", error);
    throw error;
  }
};

/**
 * セッション状態を更新する
 * @param {string} userId - ユーザーID
 * @param {string} setId - セットID
 * @param {string} quizType - クイズタイプ
 * @param {Object} data - 更新データ
 */
export const updateSessionState = async (userId, setId, quizType, data) => {
  const sessionStateRef = doc(db, `users/${userId}/${SESSION_STATES_COLLECTION}`, `${setId}_${quizType}`);
  await setDoc(sessionStateRef, data, { merge: true });
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

/**
 * ユーザー設定を更新する
 * @param {string} userId - ユーザーID
 * @param {Object} settings - 更新する設定
 */
export const updateUserSettings = async (userId, settings) => {
  try {
    const userSettingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
    await setDoc(userSettingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

/**
 * ユーザー設定を取得する
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} ユーザー設定
 */
export const getUserSettings = async (userId) => {
  try {
    const userSettingsRef = doc(db, `users/${userId}/${SETTINGS_COLLECTION}`, 'userSettings');
    const docSnap = await getDoc(userSettingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return {}; // デフォルトの設定を返す
    }
  } catch (error) {
    console.error('Error getting user settings:', error);
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
    console.error("Error updating user max progress:", error);
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
    console.error("Error getting current progress:", error);
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
    console.error("Error updating current progress:", error);
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
      allSets.map(set => getSessionState(userId, set.id, set.type))
    );

    const completedItems = sessionStates.reduce((total, state, index) => {
      if (state) {
        const set = allSets[index];
        switch (set.type) {
          case 'flashcard':
            return total + (state.studiedCards ? state.studiedCards.length : 0);
          case 'qa':
          case 'multiple-choice':
            return total + (state.studiedQuestions ? state.studiedQuestions.length : 0);
          case 'classification':
            return total + (state.studiedItems ? state.studiedItems.length : 0);
          default:
            return total;
        }
      }
      return total;
    }, 0);

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  } catch (error) {
    console.error("Error calculating current progress:", error);
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
    console.error("Error recalculating progress after deletion:", error);
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

    const userStatsRef = doc(db, `users/${userId}/statistics/userStatistics`);
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
    console.error('Error getting user statistics:', error);
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
    console.error("Error uploading image:", error);
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
    const sessionState = await getSessionState(userId, set.id, set.type);
    if (sessionState) {
      switch (set.type) {
        case 'flashcard':
          completedItems += sessionState.studiedCards ? sessionState.studiedCards.length : 0;
          break;
        case 'qa':
        case 'multiple-choice':
          completedItems += sessionState.studiedQuestions ? sessionState.studiedQuestions.length : 0;
          break;
        case 'classification':
          completedItems += sessionState.studiedItems ? sessionState.studiedItems.length : 0;
          break;
      }
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
      await saveSessionState(userId, state.setId, state.setType, state.state);
    }

    // ユーザー設定の同期
    const unsyncedSettings = await getUnsyncedUserSettings(userId);
    if (unsyncedSettings) {
      await updateUserSettings(userId, unsyncedSettings);
    }

    // 進捗の再計算と同期（必要な場合のみ）
    const currentProgress = await getCurrentProgress(userId);
    const calculatedProgress = await calculateCurrentProgress(userId);
    if (currentProgress !== calculatedProgress) {
      await updateCurrentProgress(userId, calculatedProgress);
    }

    console.log('未同期のデータの同期が完了しました');
  } catch (error) {
    console.error('データの同期中にエラーが発生しました:', error);
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
 * @returns {Promise<Array>} 未同期の学習履歴の配列
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
  return querySnapshot.docs.map(doc => doc.data());
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