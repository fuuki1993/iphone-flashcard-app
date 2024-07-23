import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Switch } from '@/components/ui/form/switch';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react';
import { auth, updateUserProfile, updateUserEmail, updateUserPassword, reauthenticateUser } from '@/utils/firebase/auth';
import { getUserSettings, updateUserSettings, syncUnsyncedData } from '@/utils/firebase/firestore';
import styles from '@/styles/modules/SettingsScreen.module.css';

const SettingsScreen = ({ onBack, userId, dailyGoal, setDailyGoal, darkMode, setDarkMode, onSettingsUpdate }) => {
  const [localDailyGoal, setLocalDailyGoal] = useState(dailyGoal);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleSync = async () => {
    setIsSyncing(true);
    setError('');
    try {
      await syncUnsyncedData(userId);
      alert('未同期のデータの同期が完了しました。');
    } catch (error) {
      console.error('同期中にエラーが発生しました:', error);
      setError('データの同期に失敗しました。');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className={styles.title}>設定</h1>
      </div>

      <div className={styles.formGroup}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            表示名
          </label>
          <div className={styles.inputWrapper}>
            <User className={styles.icon} size={18} />
            <Input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            メールアドレス
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.icon} size={18} />
            <Input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            新しいパスワード（変更する場合のみ）
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.icon} size={18} />
            <Input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
            />
          </div>
        </div>

        {newPassword && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              現在のパスワード
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.icon} size={18} />
              <Input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワード"
              />
            </div>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label className={styles.label}>
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

        <div className={styles.switchGroup}>
          <span className={styles.label}>ダークモード</span>
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        <div className={styles.inputGroup}>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className={styles.button}
          >
            {isSyncing ? '未同期のデータを同期中...' : '未同期のデータをサーバーと同期'}
          </Button>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <Button onClick={handleSave} className={styles.button}>
          保存
        </Button>
      </div>
    </div>
  );
};

export default SettingsScreen;