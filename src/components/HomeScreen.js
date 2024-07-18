'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, BookOpen, BarChart2, Settings, Calendar, Clock, Trophy, Book, Globe, Code, Trash2 } from 'lucide-react';
import { getStudyHistory, getAllSets, getSessionState } from '@/utils/indexedDB';
import AddEventModal from './AddEventModal';

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
    setTodayStudyTime
  }) => {
    const [isGoalAchieved, setIsGoalAchieved] = useState(false);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [incompleteSessions, setIncompleteSessions] = useState([]);

    const loadData = useCallback(async () => {
      try {
        const history = await getStudyHistory();
        const allSets = await getAllSets();

        // Calculate overall progress
        let totalQuestions = 0;
        let totalCorrectAnswers = 0;

        allSets.forEach(set => {
          if (set.type === 'flashcard' || set.type === 'qa') {
            totalQuestions += set.cards ? set.cards.length : 0;
          } else if (set.type === 'multiple-choice' || set.type === 'classification') {
            totalQuestions += set.questions ? set.questions.length : 0;
          }
        });

        history.forEach(entry => {
          const correctAnswers = Math.round((entry.score / 100) * (entry.totalQuestions || 1));
          totalCorrectAnswers += correctAnswers;
        });

        // Ensure totalCorrectAnswers doesn't exceed totalQuestions
        totalCorrectAnswers = Math.min(totalCorrectAnswers, totalQuestions);

        const overallProgressPercentage = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : 0;
        setOverallProgress(Math.round(overallProgressPercentage));

        // Calculate today's study time and goal achievement
        const today = new Date().toISOString().split('T')[0];
        const todayHistory = history.filter(item => item.date.startsWith(today));
        const todayTotalSeconds = todayHistory.reduce((total, item) => total + (item.studyDuration || 0), 0);
        const todayTotalMinutes = Math.round(todayTotalSeconds / 60);
        setTodayStudyTime(todayTotalMinutes);
        setIsGoalAchieved(todayTotalMinutes >= dailyGoal);

        // Get the latest 3 unique set entries
        const uniqueSetEntries = Array.from(new Set(history.map(entry => entry.setId)))
          .slice(0, 3)
          .map(setId => history.find(entry => entry.setId === setId));
        setStudyHistory(uniqueSetEntries);

      } catch (error) {
        console.error("Error loading study data:", error);
      }
    }, [dailyGoal, setOverallProgress, setTodayStudyTime, setStudyHistory]);

    useEffect(() => {
      loadData();
    }, [loadData]);

    useEffect(() => {
      setIsGoalAchieved(todayStudyTime >= dailyGoal);
    }, [todayStudyTime, dailyGoal]);

    const updateStreak = useCallback(() => {
      if (isGoalAchieved) {
        setStreak(prevStreak => prevStreak + 1);
      } else {
        setStreak(0);
      }
    }, [isGoalAchieved]);

    useEffect(() => {
      updateStreak();
    }, [isGoalAchieved, updateStreak]);

    const getIconForSetType = (type) => {
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
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
      if (isNaN(date.getTime())) {
        return '日付不明';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分前`;
      } else if (diffHours < 24) {
        return `${diffHours}時間前`;
      } else if (diffDays === 0) {
        return '今日';
      } else if (diffDays === 1) {
        return '昨日';
      } else {
        return `${diffDays}日前`;
      }
    };

    const formatEventDate = (date) => {
      return new Date(date).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const handleAddEvent = () => {
      setEditingEvent(null);
      setIsAddEventModalOpen(true);
    };

    const handleEditEvent = (event) => {
      setEditingEvent(event);
      setIsAddEventModalOpen(true);
    };

    const handleSaveEvent = (newEvent) => {
      if (newEvent.id) {
        setScheduledEvents(scheduledEvents.map(event => 
          event.id === newEvent.id ? newEvent : event
        ));
      } else {
        setScheduledEvents([...scheduledEvents, { ...newEvent, id: Date.now() }]);
      }
      scheduleNotification(newEvent);
    };

    const handleDeleteEvent = (eventId) => {
      setScheduledEvents(scheduledEvents.filter(event => event.id !== eventId));
    };

    const scheduleNotification = (event) => {
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
    };

    useEffect(() => {
      if ('Notification' in window) {
        Notification.requestPermission();
      }
    }, []);

    useEffect(() => {
      const loadIncompleteSessions = async () => {
        const allSets = await getAllSets();
        const incompleteSessions = await Promise.all(
          allSets.map(async (set) => {
            const sessionState = await getSessionState(set.id, set.type);
            if (sessionState && sessionState.state) {
              return { ...set, sessionState: sessionState.state, timestamp: sessionState.timestamp };
            }
            return null;
          })
        );
        const filteredIncompleteSessions = incompleteSessions.filter(Boolean);
        console.log('Incomplete sessions:', filteredIncompleteSessions); // デバッグログ
        setIncompleteSessions(filteredIncompleteSessions.slice(0, 3));
      };
      loadIncompleteSessions();
    }, []);
    
    useEffect(() => {
      const loadStudyHistory = async () => {
        const history = await getStudyHistory();
        console.log('Study history:', history); // デバッグログ
        setStudyHistory(history.slice(0, 3));
      };
      loadStudyHistory();
    }, [setStudyHistory]);

    return (
      <div className="p-3 w-full max-w-[390px] mx-auto bg-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-bold text-gray-800">暗記アプリ</h1>
          <Button variant="ghost" size="sm" onClick={() => console.log('設定を開く')}>
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
                onClick={onShowStatistics}
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
                <ul className="space-y-2">
                  {incompleteSessions.map((session) => (
                    <li 
                      key={session.id} 
                      className="flex items-center p-2 rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200"
                      onClick={() => onStartLearning(session.id, session.type, session.sessionState)}
                    >
                      {getIconForSetType(session.type)}
                      <div className="flex-1 ml-2">
                        <span className="font-medium text-xs">{session.title}</span>
                        <p className="text-[10px] text-gray-500">{formatDate(session.timestamp)}</p>
                      </div>
                      <span className="text-xs text-blue-500">再開</span>
                    </li>
                  ))}
                  {studyHistory.map((entry) => (
                    <li 
                      key={entry.id} 
                      className="flex items-center p-2 rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200"
                      onClick={() => onStartLearning(entry.setId, entry.setType)}
                    >
                      {getIconForSetType(entry.setType)}
                      <div className="flex-1 ml-2">
                        <span className="font-medium text-xs">{entry.setTitle}</span>
                        <p className="text-[10px] text-gray-500">{formatDate(entry.date)}</p>
                      </div>
                      <span className="text-[10px] font-medium">{Math.round(entry.score)}%</span>
                    </li>
                  ))}
                </ul>
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
              <span className="text-xs">{todayStudyTime}分 / {dailyGoal}分</span>
              <Progress 
                value={(todayStudyTime / dailyGoal) * 100} 
                className="w-1/2 h-2" 
              />
            </div>
            {isGoalAchieved && (
              <p className="text-gray-700 font-bold text-xs">目標達成！</p>
            )}
          </CardContent>
        </Card>

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