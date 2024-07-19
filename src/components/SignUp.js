import React, { useState } from 'react';
import { signUp } from '../utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SignUp = ({ onSignUp, onSwitchToSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

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
        <Button type="submit">Sign Up</Button>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </form>
      <p className="text-center">
        既にアカウントをお持ちの方は
        <Button variant="link" onClick={onSwitchToSignIn}>サインイン</Button>
      </p>
    </div>
  );
};

export default SignUp;