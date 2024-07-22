// ======================================
// アップデート通知フック
// ======================================

import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * アップデート通知を管理するカスタムフック
 * @param {string} userId - ユーザーID
 */
export const useUpdateNotification = (userId) => {
  // ----------------------------------------
  // ステート定義
  // ----------------------------------------
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateContents, setUpdateContents] = useState([]);

  // ----------------------------------------
  // アップデートチェック
  // ----------------------------------------
  useEffect(() => {
    /**
     * 最新のアップデートをチェックする
     */
    const checkForUpdates = async () => {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const lastCheckedUpdate = userDoc.data()?.lastCheckedUpdate || 0;

      const updatesRef = collection(db, 'updates');
      const q = query(updatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const newUpdates = [];
      let latestUpdateTime = lastCheckedUpdate;

      querySnapshot.forEach((doc) => {
        const updateData = doc.data();
        if (updateData.createdAt > lastCheckedUpdate) {
          newUpdates.push(updateData.content);
          latestUpdateTime = Math.max(latestUpdateTime, updateData.createdAt);
        }
      });

      if (newUpdates.length > 0) {
        setUpdateContents(newUpdates);
        setIsUpdateDialogOpen(true);
        await setDoc(userRef, { lastCheckedUpdate: latestUpdateTime }, { merge: true });
      }
    };

    if (userId) {
      checkForUpdates();
    }
  }, [userId]);

  // ----------------------------------------
  // ダイアログ制御
  // ----------------------------------------
  /**
   * アップデートダイアログを閉じる
   */
  const closeUpdateDialog = () => {
    setIsUpdateDialogOpen(false);
  };

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
  return { isUpdateDialogOpen, updateContents, closeUpdateDialog };
};