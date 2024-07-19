'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSetById, getSessionState, getStudyHistory, deleteStudyHistoryEntry } from '@/utils/firestore';
import HomeScreen from '@/components/HomeScreen';
import CreateEditSetSelectionScreen from '@/components/CreateEditSetSelectionScreen';
import QuizTypeSelectionScreen from '@/components/QuizTypeSelectionScreen';
import FlashcardCreationScreen from '@/components/FlashcardCreationScreen';
import FlashcardEditScreen from '@/components/FlashcardEditScreen';
import QACreationScreen from '@/components/QACreationScreen';
import QAEditScreen from '@/components/QAEditScreen';
import MultipleChoiceCreationScreen from '@/components/MultipleChoiceCreationScreen';
import MultipleChoiceEditScreen from '@/components/MultipleChoiceEditScreen';
import ClassificationCreationScreen from '@/components/ClassificationCreationScreen';
import ClassificationEditScreen from '@/components/ClassificationEditScreen';
import StatisticsScreen from '../components/StatisticsScreen';
import SettingsScreen from './SettingsScreen';
import StudyHistoryScreen from '@/components/StudyHistoryScreen';
import { useHashRouter } from '@/utils/hashRouter';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AuthScreen from './AuthScreen'; // 新しく追加
import SignOut from './SignOut';  // SignOutコンポーネントをインポート

export default function Home() {
  const { hashPath, push, isReady } = useHashRouter();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [currentSetType, setCurrentSetType] = useState(null);
  const [editingSetId, setEditingSetId] = useState(null);
  const [quizType, setQuizType] = useState(null);
  const [quizSetId, setQuizSetId] = useState(null);
  const [quizSetTitle, setQuizSetTitle] = useState(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studyHistory, setStudyHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(60);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [sessionState, setSessionState] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [todayStudiedCards, setTodayStudiedCards] = useState(0);
  const [weeklyStudyTime, setWeeklyStudyTime] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isReady && !hashPath) {
      push('home');
    }
  }, [isReady, hashPath, push]);

  useEffect(() => {
    // Handle routing based on hashPath
    const [mainPath, subPath] = hashPath.split('/');
    switch (mainPath) {
      case '':
      case 'home':
        setCurrentScreen('home');
        break;
      case 'createEditSet':
        setCurrentScreen('createEditSet');
        break;
      case 'quizTypeSelection':
        setCurrentScreen('quizTypeSelection');
        break;
      case 'flashcard':
      case 'qa':
      case 'multiple-choice':
      case 'classification':
        setCurrentSetType(mainPath);
        setCurrentScreen(subPath === 'edit' ? `${mainPath}Edit` : `${mainPath}Creation`);
        break;
      case 'quiz':
        setCurrentScreen('quiz');
        break;
      case 'statistics':
        setCurrentScreen('statistics');
        break;
      case 'settings':
        setCurrentScreen('settings');
        break;
      case 'studyHistory':
        setCurrentScreen('studyHistory');
        break;
      default:
        setCurrentScreen('home');
    }
  }, [hashPath]);

  useEffect(() => {
    const loadStudyHistory = async () => {
      const history = await getStudyHistory();
      setStudyHistory(history);
      
      // 総学習時間の計算
      const total = history.reduce((acc, entry) => acc + (entry.duration || 0), 0);
      setTotalStudyTime(total);

      // 今日の日付を取得
      const today = new Date().toDateString();
      
      // 今日学習したカードの数を計算
      const todayCards = history
        .filter(entry => new Date(entry.date).toDateString() === today)
        .reduce((acc, entry) => acc + (entry.cardsStudied || 0), 0);
      setTodayStudiedCards(todayCards);
    };
    loadStudyHistory();
  }, []);

  const handleDeleteStudyEntry = async (entryId) => {
    await deleteStudyHistoryEntry(entryId);
    setStudyHistory(prevHistory => prevHistory.filter(entry => entry.id !== entryId));
  };

  const navigateTo = (screen, subPath = '') => {
    push(subPath ? `${screen}/${subPath}` : screen);
  };

  const handleCreateSet = () => {
    navigateTo('createEditSet');
  };
  
  const handleStartLearning = async (setId, setType, savedSessionState = null) => {
    if (savedSessionState) {
      // 保存されたセッション状態がある場合、直接クイズを開始
      setQuizType(setType);
      setQuizSetId(setId);
      setSessionState(savedSessionState);
      try {
        const set = await getSetById(setId);
        setQuizSetTitle(set.title);
        navigateTo('quiz');
      } catch (error) {
        // エラーハンドリング
      }
    } else {
      // 新しいセッションの場合、クイズタイプ選択画面に遷移
      navigateTo('quizTypeSelection');
    }
  };

  const handleStartQuiz = async (type, setId) => {
    try {
  
      if (!setId || typeof setId !== 'string' || setId.trim() === '') {
        // エラーハンドリング（例：ユーザーにエラーメッセージを表示）
        return;
      }
  
      setQuizType(type);
      setQuizSetId(setId);
  
      // セッション状態を取得
      const sessionState = await getSessionState(setId, type);
      setSessionState(sessionState);
  
      const set = await getSetById(setId);
      if (!set) {
        throw new Error('Set not found');
      }
      setQuizSetTitle(set.title);
  
      navigateTo('quiz');
    } catch (error) {
      // エラーハンドリング（例：ユーザーにエラーメッセージを表示）
    }
  };

  const handleShowStatistics = () => {
    navigateTo('statistics');
  };

  const handleSelectType = (type) => {
    setCurrentSetType(type);
    navigateTo(type, 'creation');
  };
  
  const handleEditType = (type) => {
    setCurrentSetType(type);
    navigateTo(type, 'edit');
  };

  const handleSave = (data) => {
    // ここでデータを保存する処理を実装
    navigateTo('home');
  };

  const handleFinishQuiz = useCallback((results, studyDuration, cardsStudied) => {
    
    setTodayStudyTime(prevTime => {
      const newTime = prevTime + studyDuration;
      return newTime;
    });
    
    setTotalStudyTime(prevTime => prevTime + studyDuration);
    setTodayStudiedCards(prevCards => prevCards + cardsStudied);
    navigateTo('home');
  }, [navigateTo]);

  const handleOpenSettings = () => {
    navigateTo('settings');
  };

  const handleShowStudyHistory = () => {
    navigateTo('studyHistory');
  };

  const renderScreen = useCallback(() => {
    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return <AuthScreen onSignIn={() => console.log('Signed in')} onSignUp={() => console.log('Signed up')} />;
    }

    switch (currentScreen) {
      case 'home':
        return (
          <>
            <HomeScreen 
              onCreateSet={handleCreateSet}
              onStartLearning={handleStartLearning}
              onShowStatistics={handleShowStatistics}
              onOpenSettings={handleOpenSettings}
              overallProgress={overallProgress}
              setOverallProgress={setOverallProgress}
              streak={streak}
              setStreak={setStreak}
              studyHistory={studyHistory}
              setStudyHistory={setStudyHistory}
              dailyGoal={dailyGoal}
              setDailyGoal={setDailyGoal}
              todayStudyTime={todayStudyTime}
              setTodayStudyTime={setTodayStudyTime}
              onSignOut={() => {
                const auth = getAuth();
                auth.signOut().then(() => {
                  // 必要に応じて追加の処理を行う
                });
              }}
            />
          </>
        );
      case 'createEditSet':
        return (
          <CreateEditSetSelectionScreen 
            onBack={() => navigateTo('home')}
            onSelectType={handleSelectType}
            onEditType={handleEditType}
          />
        );
      case 'quizTypeSelection':
        return (
          <QuizTypeSelectionScreen 
            onBack={() => navigateTo('home')}
            onStartQuiz={handleStartQuiz}
          />
        );
      case 'flashcardCreation':
        return (
          <FlashcardCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'flashcardEdit':
        return (
          <FlashcardEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'qaCreation':
        return (
          <QACreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'qaEdit':
        return (
          <QAEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'multiple-choiceCreation':
        return (
          <MultipleChoiceCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'multiple-choiceEdit':
        return (
          <MultipleChoiceEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'classificationCreation':
        return (
          <ClassificationCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'classificationEdit':
        return (
          <ClassificationEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
          />
        );
      case 'quiz':
        if (!quizType) {
          return <div>エラー: クイズタイプが設定されていません</div>;
        }
        const QuizComponent = React.lazy(() => {
          switch (quizType) {
            case 'flashcard':
              return import('./FlashcardQuiz');
            case 'qa':
              return import('./QAQuiz');
            case 'multiple-choice':
              return import('./MultipleChoiceQuiz');
            case 'classification':
              return import('./ClassificationQuiz');
            default:
              throw new Error(`Unknown quiz type: ${quizType}`);
          }
        });
        return (
          <React.Suspense fallback={<div>Loading...</div>}>
            <QuizComponent
              setId={quizSetId}
              title={quizSetTitle}
              quizType={quizType}
              onBack={() => navigateTo('quizTypeSelection')}
              onFinish={(results, studyDuration, cardsStudied) => handleFinishQuiz(results, studyDuration, cardsStudied)}
              sessionState={sessionState}
              setTodayStudyTime={setTodayStudyTime}
            />
          </React.Suspense>
        );
      case 'statistics':
        return (
          <StatisticsScreen
            onBack={() => navigateTo('home')}
            totalStudyTime={totalStudyTime}
            todayStudiedCards={todayStudiedCards}
            weeklyStudyTime={weeklyStudyTime}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => navigateTo('home')}
            dailyGoal={dailyGoal}
            setDailyGoal={setDailyGoal}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      case 'studyHistory':
        return (
          <StudyHistoryScreen
            studyHistory={studyHistory}
            onDeleteEntry={handleDeleteStudyEntry}
            onBack={() => navigateTo('statistics')}
          />
        );
      default:
        return <div>Unknown screen: {currentScreen}</div>;
    }
  }, [currentScreen, user, loading, todayStudyTime, overallProgress, streak, studyHistory, dailyGoal, navigateTo, handleFinishQuiz, setTodayStudyTime, quizType, quizSetId, quizSetTitle, sessionState]);

  if (!isReady) {
    return null; // または適切なローディング表示
  }

  return (
    <div className="bg-gray-100 min-h-screen w-full">
      <main className="flex flex-col items-center justify-between max-w-4xl mx-auto">
        {renderScreen()}
      </main>
    </div>
  );
}