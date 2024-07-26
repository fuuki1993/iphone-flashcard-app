/**
 * =============================================
 * サインインコンポーネント
 * =============================================
 */

import React, { useState } from 'react';
import { signIn } from '../../utils/firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import styles from '@/styles/modules/AuthScreen.module.css';

/**
 * @component SignIn
 * @description サインイン機能を提供するコンポーネント
 * @param {Function} onSignIn - サインイン成功時のコールバック関数
 * @param {Function} onSwitchToSignUp - サインアップ画面への切り替え関数
 */
const SignIn = ({ onSignIn, onSwitchToSignUp }) => {
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
      await signIn(email, password);
      onSignIn();
    } catch (error) {
      let errorMessage = "サインインに失敗しました。";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "このメールアドレスに対応するアカウントが見つかりません。";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "パスワードが正しくありません。";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "無効なメールアドレスです。";
      }
      setError(errorMessage);
    }
  };

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>サインイン</h2>
        <p className={styles.cardDescription}>アカウントにサインインしてください</p>
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
          <Button type="submit" className={styles.signInButton}>サインイン</Button>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </form>
        <p className="text-center">
          アカウントをお持ちでない方は
          <Button variant="link" onClick={onSwitchToSignUp}>サインアップ</Button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;