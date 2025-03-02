/**
 * =============================================
 * サインアップコンポーネント
 * =============================================
 */

import React, { useState } from 'react';
import { signUp } from '../../utils/firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import styles from '@/styles/modules/AuthScreen.module.css';  // CSSモジュールをインポート

/**
 * @component SignUp
 * @description サインアップ機能を提供するコンポーネント
 * @param {Function} onSignUp - サインアップ成功時のコールバック関数
 * @param {Function} onSwitchToSignIn - サインイン画面への切り替え関数
 */
const SignUp = ({ onSignUp, onSwitchToSignIn }) => {
  // ----------------------------------------
  // ステート管理
  // ----------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // ----------------------------------------
  // イベントハンドラ
  // ----------------------------------------
  /**
   * フォーム送信時の処理
   * @param {Event} e - フォーム送信イベント
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      onSignUp();
    } catch (error) {
      let errorMessage = "サインアップに失敗しました。";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "このメールアドレスは既に使用されています。";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "無効なメールアドレスです。";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "パスワードが弱すぎます。少なくとも6文字以上にしてください。";
      }
      setError(errorMessage);
    }
  };

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <>
      <h2 className={styles.cardTitle}>サインアップ</h2>
      <p className={styles.cardDescription}>新しいアカウントを作成してください</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
        />
        <Button type="submit" className={styles.button}>サインアップ</Button>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </form>
      <p className="text-center mt-4">
        既にアカウントをお持ちの方は
        <Button variant="link" onClick={onSwitchToSignIn}>サインイン</Button>
      </p>
    </>
  );
};

export default SignUp;