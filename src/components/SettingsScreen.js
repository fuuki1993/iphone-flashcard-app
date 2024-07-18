import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';

const SettingsScreen = ({ onBack, dailyGoal, setDailyGoal, darkMode, setDarkMode }) => {
  const [localDailyGoal, setLocalDailyGoal] = useState(dailyGoal);

  const handleSave = () => {
    setDailyGoal(localDailyGoal);
    // ここで他の設定も保存できます
    onBack();
  };

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">設定</h1>
      </div>

      <div className="space-y-4">
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

        {/* 他の設定項目をここに追加できます */}

        <Button onClick={handleSave} className="w-full">
          保存
        </Button>
      </div>
    </div>
  );
};

export default SettingsScreen;