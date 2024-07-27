'use client';

import '@/styles/global.css';
import React, { useState, useEffect, useCallback } from 'react';
import { getSetById, getSessionState, getStudyHistory, deleteStudyHistoryEntry, getAllSets, getUserSettings, updateUserSettings, getDarkModeSetting, updateDarkModeSetting } from '@/utils/firebase/firestore';
import HomeScreen from '@/components/home/HomeScreen';
import CreateEditSetSelectionScreen from '@/components/set/CreateEditSetSelectionScreen';
import QuizTypeSelectionScreen from '@/components/quiz/QuizTypeSelectionScreen';
import FlashcardCreationScreen from '@/components/set/creation/FlashcardCreationScreen';
import FlashcardEditScreen from '@/components/set/edit/FlashcardEditScreen';
import QACreationScreen from '@/components/set/creation/QACreationScreen';
import QAEditScreen from '@/components/set/edit/QAEditScreen';
import MultipleChoiceCreationScreen from '@/components/set/creation/MultipleChoiceCreationScreen';
import MultipleChoiceEditScreen from '@/components/set/edit/MultipleChoiceEditScreen';
import ClassificationCreationScreen from '@/components/set/creation/ClassificationCreationScreen';
import ClassificationEditScreen from '@/components/set/edit/ClassificationEditScreen';
import StatisticsScreen from '../statistics/StatisticsScreen';
import SettingsScreen from '../settings/SettingsScreen';
import StudyHistoryScreen from '@/components/screens/StudyHistoryScreen';
import { useHashRouter } from '@/utils/hooks/hashRouter';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AuthScreen from '../auth/AuthScreen';
import SignOut from '../auth/SignOut';
import styles from '@/styles/modules/Home.module.css';

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
  const [userDailyGoal, setUserDailyGoal] = useState(60); // デフォルト値を60分に設定
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [sessionState, setSessionState] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [todayStudiedCards, setTodayStudiedCards] = useState(0);
  const [weeklyStudyTime, setWeeklyStudyTime] = useState([]);

  const calculateTotalItems = useCallback((sets) => {
    return sets.reduce((total, set) => {
      switch (set.type) {
        case 'flashcard':
          return total + (set.cards ? set.cards.length : 0);
        case 'qa':
          return total + (set.qaItems ? set.qaItems.length : 0);
        case 'multiple-choice':
          return total + (set.questions ? set.questions.length : 0);
        case 'classification':
          return total + (set.categories ? set.categories.reduce((sum, category) => sum + (category.items ? category.items.length : 0), 0) : 0);
        default:
          return total;
      }
    }, 0);
  }, []);

  const calculateCompletedItems = useCallback(async (userId, sets) => {
    let completedItems = 0;
    for (const set of sets) {
      const sessionState = await getSessionState(userId, set.id, set.type);
      if (sessionState && sessionState.completedItems) {
        completedItems += sessionState.completedItems;
      }
    }
    return completedItems;
  }, []);

  const updateOverallProgress = useCallback(async (studiedItems, totalItems) => {
    if (!user) return;
    try {
      const allSets = await getAllSets(user.uid);
      const totalCompletedItems = await calculateCompletedItems(user.uid, allSets);
      const totalItemsCount = calculateTotalItems(allSets);
      const newProgress = ((totalCompletedItems + studiedItems) / (totalItemsCount + totalItems)) * 100;
      setOverallProgress(Math.round(newProgress));
    } catch (error) {
      console.error("Error updating overall progress:", error);
    }
  }, [user, calculateCompletedItems, calculateTotalItems]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      if (!user) return;
      const history = await getStudyHistory(user.uid);
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
    if (user) {
      loadStudyHistory();
    }
  }, [user]);

  useEffect(() => {
    const loadUserSettings = async () => {
      if (user) {
        try {
          const settings = await getUserSettings(user.uid);
          setUserDailyGoal(settings.dailyGoal || 60);
          const darkModeSetting = await getDarkModeSetting(user.uid);
          setDarkMode(darkModeSetting);
          applyDarkMode(darkModeSetting);
        } catch (error) {
          console.error('Failed to load user settings:', error);
        }
      }
    };
    loadUserSettings();
  }, [user]);

  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleUpdateDarkMode = async (newDarkMode) => {
    if (user) {
      try {
        await updateDarkModeSetting(user.uid, newDarkMode);
        setDarkMode(newDarkMode);
        applyDarkMode(newDarkMode);
      } catch (error) {
        console.error('Failed to update dark mode setting:', error);
      }
    }
  };

  const handleUpdateDailyGoal = async (newGoal) => {
    if (user) {
      try {
        await updateUserSettings(user.uid, { dailyGoal: newGoal });
        setUserDailyGoal(newGoal);
      } catch (error) {
        console.error('Failed to update daily goal:', error);
      }
    }
  };

  const handleDeleteStudyEntry = async (entryId) => {
    if (!user) return;
    await deleteStudyHistoryEntry(user.uid, entryId);
    setStudyHistory(prevHistory => prevHistory.filter(entry => entry.id !== entryId));
  };

  const navigateTo = (screen, subPath = '') => {
    push(subPath ? `${screen}/${subPath}` : screen);
  };

  const handleCreateSet = () => {
    navigateTo('createEditSet');
  };
  
  const handleStartLearning = async (setId, setType, savedSessionState = null) => {
    if (!user) return;
    if (savedSessionState) {
      // 保存されたセッション状態がある場合、直接クイズを開始
      setQuizType(setType);
      setQuizSetId(setId);
      setSessionState(savedSessionState);
      try {
        const set = await getSetById(user.uid, setId);
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
    if (!user) return;
    try {
  
      if (!setId || typeof setId !== 'string' || setId.trim() === '') {
        // エラーハンドリング（例：ユーザーにエラーメッセージを表示）
        return;
      }
  
      setQuizType(type);
      setQuizSetId(setId);
  
      // セッション状態を取得
      const sessionState = await getSessionState(user.uid, setId, type);
      setSessionState(sessionState);
  
      const set = await getSetById(user.uid, setId);
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

  const handleFinishQuiz = useCallback(async (results, studyDuration, cardsStudied) => {
    setTodayStudyTime(prevTime => prevTime + studyDuration);
    setTotalStudyTime(prevTime => prevTime + studyDuration);
    setTodayStudiedCards(prevCards => prevCards + cardsStudied);
  
    // Update overall progress
    if (user && quizSetId) {
      const set = await getSetById(user.uid, quizSetId);
      const totalItems = calculateTotalItems([set]);
      await updateOverallProgress(cardsStudied, totalItems);
    }
  
    navigateTo('home');
  }, [navigateTo, user, quizSetId, setTodayStudyTime, setTotalStudyTime, setTodayStudiedCards, updateOverallProgress, calculateTotalItems]);

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
              dailyGoal={userDailyGoal}
              setDailyGoal={handleUpdateDailyGoal}
              todayStudyTime={todayStudyTime}
              setTodayStudyTime={setTodayStudyTime}
              onSignOut={() => {
                const auth = getAuth();
                auth.signOut().then(() => {
                  // 必要に応じて追加の処理を行う
                });
              }}
              userId={user.uid}
            />
          </>
        );
      case 'createEditSet':
        return (
          <CreateEditSetSelectionScreen 
            onBack={() => navigateTo('home')}
            onSelectType={handleSelectType}
            onEditType={handleEditType}
            userId={user.uid}
          />
        );
      case 'quizTypeSelection':
        return (
          <QuizTypeSelectionScreen 
            onBack={() => navigateTo('home')}
            onStartQuiz={handleStartQuiz}
            userId={user.uid}
          />
        );
      case 'flashcardCreation':
        return (
          <FlashcardCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'flashcardEdit':
        return (
          <FlashcardEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'qaCreation':
        return (
          <QACreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'qaEdit':
        return (
          <QAEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'multiple-choiceCreation':
        return (
          <MultipleChoiceCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'multiple-choiceEdit':
        return (
          <MultipleChoiceEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'classificationCreation':
        return (
          <ClassificationCreationScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'classificationEdit':
        return (
          <ClassificationEditScreen
            onBack={() => navigateTo('createEditSet')}
            onSave={handleSave}
            userId={user.uid}
          />
        );
      case 'quiz':
        if (!quizType) {
          return <div>エラー: クイズタイプが設定されていません</div>;
        }
        const QuizComponent = React.lazy(() => {
          switch (quizType) {
            case 'flashcard':
              return import('../quiz/FlashcardQuiz');
            case 'qa':
              return import('../quiz/QAQuiz');
            case 'multiple-choice':
              return import('../quiz/MultipleChoiceQuiz');
            case 'classification':
              return import('../quiz/ClassificationQuiz');
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
              userId={user.uid}
              updateOverallProgress={updateOverallProgress}
              onFinishQuiz={(score, studiedItems, studyDuration) => {
                handleFinishQuiz(score, studyDuration, studiedItems);
                navigateTo('home');
              }}
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
              dailyGoal={userDailyGoal}
              setDailyGoal={handleUpdateDailyGoal}
              darkMode={darkMode}
              setDarkMode={handleUpdateDarkMode}
              userId={user.uid}
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
  }, [currentScreen, user, loading, todayStudyTime, overallProgress, streak, studyHistory, userDailyGoal, navigateTo, handleFinishQuiz, setTodayStudyTime, quizType, quizSetId, quizSetTitle, sessionState, handleUpdateDailyGoal, darkMode, handleUpdateDarkMode]);

  if (!isReady) {
    return null; // または適切なローディング表示
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {renderScreen()}
        </div>
      </main>
    </div>
  );
}