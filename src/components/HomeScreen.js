'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, BookOpen, BarChart2, Settings, Calendar, Clock, Trophy, Book, Globe, Code } from 'lucide-react';
import { getAllSets, getSessionState } from '@/utils/firestore';
import AddEventModal from './AddEventModal';
import StatisticsScreen from './StatisticsScreen';

const HomeScreen = ({ 
  onCreateSet, 
  onStartLearning, 
  onShowStatistics, 
  overallProgress, 
  setOverallProgress,
  streak, 
  setStreak,
  studyHistory, 
  setStudyHistory,
  dailyGoal, 
  setDailyGoal,
  todayStudyTime, 
  setTodayStudyTime,
  onOpenSettings,
  onSignOut,
  userId
}) => {
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showStatistics, setShowStatistics] = useState(false);

  const convertSecondsToMinutes = useCallback((seconds) => {
    return Math.floor(seconds / 60);
  }, []);

  useEffect(() => {
    console.log('Current todayStudyTime:', todayStudyTime); // デバッグログ
  }, [todayStudyTime]);

  const loadData = useCallback(async () => {
    try {
      const allSets = await getAllSets(userId);
      // ここでoverallProgressを計算し、setOverallProgressを呼び出す
      // studyHistoryを使用してstreakを計算し、setStreakを呼び出す
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [userId, setOverallProgress, setStreak]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStudyTimeToday = studyHistory
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === today.getFullYear() &&
               entryDate.getMonth() === today.getMonth() &&
               entryDate.getDate() === today.getDate();
      })
      .reduce((total, entry) => total + entry.studyDuration, 0);

    console.log('Study history:', studyHistory); // デバッグログ
    console.log('Filtered entries:', studyHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === today.getFullYear() &&
             entryDate.getMonth() === today.getMonth() &&
             entryDate.getDate() === today.getDate();
    })); // デバッグログ
    console.log('Total study time today (seconds):', totalStudyTimeToday); // デバッグログ

    setTodayStudyTime(totalStudyTimeToday);
  }, [studyHistory, setTodayStudyTime]);

  useEffect(() => {
    console.log('Current todayStudyTime (seconds):', todayStudyTime); // デバッグログ
    console.log('Converted to minutes:', convertSecondsToMinutes(todayStudyTime)); // デバッグログ
  }, [todayStudyTime, convertSecondsToMinutes]);

  useEffect(() => {
    setIsGoalAchieved(convertSecondsToMinutes(todayStudyTime) >= dailyGoal);
  }, [todayStudyTime, dailyGoal, convertSecondsToMinutes]);

  const updateStreak = useCallback(() => {
    // ストリーク更新ロジックをここに実装
  }, [isGoalAchieved, setStreak]);

  useEffect(() => {
    updateStreak();
  }, [isGoalAchieved, updateStreak]);

  const getIconForSetType = useCallback((type) => {
    switch (type) {
      case 'flashcard':
        return <Book className="mr-3 text-blue-500" size={24} />;
      case 'qa':
        return <Globe className="mr-3 text-green-500" size={24} />;
      case 'multiple-choice':
        return <Code className="mr-3 text-purple-500" size={24} />;
      case 'classification':
        return <Calendar className="mr-3 text-red-500" size={24} />;
      default:
        return <Book className="mr-3 text-blue-500" size={24} />;
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (isNaN(date.getTime())) {
      return '日付不明';
    } else if (diffTime < 0) {
      return '今';
    } else if (diffMinutes < 1) {
      return 'たった今';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }, []);

  const formatEventDate = useCallback((date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setIsAddEventModalOpen(true);
  }, []);

  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setIsAddEventModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((newEvent) => {
    setScheduledEvents(prevEvents => {
      if (newEvent.id) {
        return prevEvents.map(event => 
          event.id === newEvent.id ? newEvent : event
        );
      } else {
        return [...prevEvents, { ...newEvent, id: Date.now() }];
      }
    });
    scheduleNotification(newEvent);
  }, []);

  const handleDeleteEvent = useCallback((eventId) => {
    setScheduledEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  }, []);

  const scheduleNotification = useCallback((event) => {
    const now = new Date();
    const eventTime = new Date(event.date);
    const timeUntilEvent = eventTime.getTime() - now.getTime();

    if (timeUntilEvent > 0) {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(event.title, {
            body: '予定の時間です！',
          });
        }
      }, timeUntilEvent);
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    try {
      const allSets = await getAllSets(userId);
      const incompleteSessions = await Promise.all(
        allSets.map(async (set) => {
          const sessionState = await getSessionState(userId, set.id, set.type);
          if (sessionState && sessionState.state) {
            return { 
              ...set, 
              sessionState: sessionState.state, 
              timestamp: sessionState.updatedAt ? sessionState.updatedAt.toDate() : new Date(),
              type: set.type
            };
          }
          return null;
        })
      );
  
      const filteredIncompleteSessions = incompleteSessions
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
  
      setRecentActivities(filteredIncompleteSessions);
    } catch (error) {
      console.error("Error loading recent activities:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadRecentActivities();
  }, [loadRecentActivities]);

  const renderActivityItem = useCallback((activity) => {
    return (
      <li 
        key={activity.id} 
        className="flex items-center p-2 rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200"
        onClick={() => onStartLearning(activity.id, activity.type, activity.sessionState)}
      >
        {getIconForSetType(activity.type)}
        <div className="flex-1 ml-2">
          <span className="font-medium text-xs">{activity.title}</span>
          <p className="text-[10px] text-gray-500">{formatDate(activity.timestamp)}</p>
        </div>
        <span className="text-xs text-blue-500">再開</span>
      </li>
    );
  }, [onStartLearning, getIconForSetType, formatDate]);

  const handleShowStatistics = useCallback(() => {
    setShowStatistics(true);
  }, []);

  const handleBackFromStatistics = useCallback(() => {
    setShowStatistics(false);
  }, []);

  if (showStatistics) {
    return (
      <StatisticsScreen
        onBack={handleBackFromStatistics}
        totalStudyTime={studyHistory.reduce((total, entry) => total + entry.studyDuration, 0)}
        todayStudiedCards={todayStudyTime} // この値は適切に計算されていることを確認してください
      />
    );
  }

  return (
    <div className="p-3 w-full max-w-[390px] mx-auto bg-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold text-gray-800">暗記アプリ</h1>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings className="text-gray-600 h-5 w-5" />
        </Button>
      </div>

      <Card className="mb-3 bg-gray-800 text-white">
        <CardContent className="py-2 px-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Trophy className="mr-1 text-gray-300" size={16} />
              <span className="font-bold text-xs">継続: {streak}日</span>
            </div>
            <Button 
              variant="outline" 
              size="xs" 
              onClick={handleShowStatistics}
              className="text-xs px-2 py-1 text-gray-800 bg-gray-200 hover:bg-gray-300"
            >
              <BarChart2 className="mr-1 h-3 w-3" />
              詳細
            </Button>
          </div>
          <p className="mb-1 text-xs">全体の進捗</p>
          <Progress value={overallProgress} className="w-full h-2 bg-gray-600" indicatorClassName="bg-white" />
          <p className="text-center mt-1 text-xs">{overallProgress.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Button className="h-10 bg-gray-700 hover:bg-gray-600 text-white text-xs" onClick={onCreateSet}>
          <PlusCircle className="mr-1 h-3 w-3" />
          作成/編集
        </Button>
        <Button className="h-10 bg-gray-700 hover:bg-gray-600 text-white text-xs" onClick={onStartLearning}>
          <BookOpen className="mr-1 h-3 w-3" />
          学習開始
        </Button>
      </div>

      <Tabs defaultValue="recent" className="mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent" className="text-xs">最近の学習</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">予定</TabsTrigger>
        </TabsList>
        <TabsContent value="recent">
          <Card>
            <CardContent className="py-2 px-3">
              {recentActivities.length > 0 ? (
                <ul className="space-y-2">
                  {recentActivities.map(renderActivityItem)}
                </ul>
              ) : (
                <p className="text-center text-gray-500">未完了のセッションはありません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scheduled">
          <Card>
            <CardContent className="py-2 px-3">
              <ul className="space-y-2">
                {scheduledEvents.map((event) => (
                  <li key={event.id} className="flex items-center">
                    <Calendar className="mr-3 text-blue-500" size={24} />
                    <div className="flex-1 cursor-pointer" onClick={() => handleEditEvent(event)}>
                      <span className="font-medium text-xs">{event.title}</span>
                      <p className="text-[10px] text-gray-500">{formatEventDate(event.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-4" onClick={handleAddEvent}>
                <PlusCircle className="mr-2 h-4 w-4" />
                予定を追加
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center text-sm">
            <Clock className="mr-2 text-gray-600" size={16} />
            今日の目標
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs">
              {convertSecondsToMinutes(todayStudyTime)}分 / {dailyGoal}分
              （{todayStudyTime}秒）
            </span>
            <Progress 
              value={(convertSecondsToMinutes(todayStudyTime) / dailyGoal) * 100} 
              className="w-1/2 h-2" 
            />
          </div>
          {isGoalAchieved && (
            <p className="text-gray-700 font-bold text-xs">目標達成！</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button onClick={onSignOut} variant="outline" className="w-full">
          サインアウト
        </Button>
      </div>

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        editingEvent={editingEvent}
      />
    </div>
  );
};

export default HomeScreen;