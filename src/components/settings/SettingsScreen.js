import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Switch } from '@/components/ui/form/switch';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react';
import { auth, updateUserProfile, updateUserEmail, updateUserPassword, reauthenticateUser } from '@/utils/firebase/auth';
import { getUserSettings, updateUserSettings } from '@/utils/firebase/firestore';

const SettingsScreen = ({ onBack, userId, dailyGoal, setDailyGoal, darkMode, setDarkMode, onSettingsUpdate }) => {
  const [localDailyGoal, setLocalDailyGoal] = useState(dailyGoal);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUserSettings = async () => {
      if (userId) {
        try {
          const settings = await getUserSettings(userId);
          setLocalDailyGoal(settings.dailyGoal || 60);
          setDarkMode(settings.darkMode || false);
        } catch (error) {
          console.error('Failed to load user settings:', error);
          setError('設定の読み込みに失敗しました。');
        }
      }
    };

    loadUserSettings();

    const user = auth.currentUser;
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [userId]);

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
          if (!currentPassword) {
            setError('現在のパスワードを入力してください。');
            return;
          }
          await reauthenticateUser(currentPassword);
          await updateUserPassword(newPassword);
        }
      }

      await updateUserSettings(userId, {
        dailyGoal: localDailyGoal,
        darkMode: darkMode
      });

      setDailyGoal(localDailyGoal);

      // 設定更新後にコールバックを呼び出す
      if (typeof onSettingsUpdate === 'function') {
        onSettingsUpdate();
      }

      onBack();
    } catch (error) {
      console.error('Failed to save settings:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('セキュリティのため、再度ログインが必要です。');
      } else if (error.code === 'auth/wrong-password') {
        setError('現在のパスワードが正しくありません。');
      } else {
        setError('設定の保存に失敗しました。');
      }
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

        {newPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在のパスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                className="pl-10"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワード"
              />
            </div>
          </div>
        )}

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