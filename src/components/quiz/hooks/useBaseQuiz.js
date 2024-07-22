import { useCallback, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * =============================================
 * ベースクイズフック
 * =============================================
 */

/**
 * @hook useBaseQuiz
 * @description ユーザー認証状態の管理と配列シャッフル機能を提供するカスタムフック
 * @returns {Object} user - 現在のユーザー情報
 * @returns {Function} shuffleArray - 配列をシャッフルする関数
 */
export const useBaseQuiz = () => {
  // ステート管理
  const [user, setUser] = useState(null);

  /**
   * 配列シャッフル関数
   * @param {Array} array - シャッフルする配列
   * @returns {Array} シャッフルされた新しい配列
   */
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  /**
   * ユーザー認証状態の監視
   */
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return { user, shuffleArray };
};