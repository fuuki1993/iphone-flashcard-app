import React, { useState } from 'react';
import { signIn } from '../utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SignIn = ({ onSignIn, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <Button type="submit">Sign In</Button>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </form>
      <p className="text-center">
        アカウントをお持ちでない方は
        <Button variant="link" onClick={onSwitchToSignUp}>サインアップ</Button>
      </p>
    </div>
  );
};

export default SignIn;