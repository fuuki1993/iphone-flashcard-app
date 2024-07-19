import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react';
import { auth, updateUserProfile, updateUserEmail, updateUserPassword } from '@/utils/auth';

const SettingsScreen = ({ onBack, dailyGoal, setDailyGoal, darkMode, setDarkMode }) => {
  const [localDailyGoal, setLocalDailyGoal] = useState(dailyGoal);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, []);

  const handleSave = async () => {
    setError('');
    try {
      const user = auth.currentUser;
      if (user) {
        if (user.displayName !== displayName) {
          await updateUserProfile({ displayName });
        }
        if (user.email !== email) {
          await updateUserEmail(email);
        }
        if (newPassword) {
          await updateUserPassword(newPassword);
        }
      }
      setDailyGoal(localDailyGoal);
      onBack();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="p-4 w-full max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">設定</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            表示名
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            新しいパスワード（変更する場合のみ）
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1日の学習目標（分）
          </label>
          <Input
            type="number"
            value={localDailyGoal}
            onChange={(e) => setLocalDailyGoal(Number(e.target.value))}
            min="1"
            max="1440"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">ダークモード</span>
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSave} className="w-full">
          保存
        </Button>
      </div>
    </div>
  );
};

export default SettingsScreen;