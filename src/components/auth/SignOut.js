/**
 * =============================================
 * サインアウトコンポーネント
 * =============================================
 */

import React from 'react';
import { logOut } from '../../utils/firebase/auth';
import { Button } from '@/components/ui/button';
import styles from '@/styles/modules/AuthScreen.module.css';

/**
 * @component SignOut
 * @description サインアウト機能を提供するコンポーネント
 * @param {Function} onSignOut - サインアウト成功時のコールバック関数
 */
const SignOut = ({ onSignOut }) => {
  // ----------------------------------------
  // イベントハンドラ
  // ----------------------------------------
  /**
   * サインアウト処理を行う
   */
  const handleSignOut = async () => {
    try {
      await logOut();
      onSignOut();
    } catch (error) {
      console.error("サインアウト中にエラーが発生しました:", error);
    }
  };

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <Button onClick={handleSignOut} className={styles.signOutButton}>サインアウト</Button>
  );
};

export default SignOut;