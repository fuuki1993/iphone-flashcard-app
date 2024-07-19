'use client';

import React, { useState, useEffect } from 'react';
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
import FlashcardQuiz from '@/components/FlashcardQuiz';
import QAQuiz from '@/components/QAQuiz';
import MultipleChoiceQuiz from '@/components/MultipleChoiceQuiz';
import ClassificationQuiz from '@/components/ClassificationQuiz';
import StatisticsScreen from '../components/StatisticsScreen';
import SettingsScreen from './SettingsScreen';
import StudyHistoryScreen from '@/components/StudyHistoryScreen';
import { useHashRouter } from '@/utils/hashRouter';

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

  useEffect(() => {
    if (isReady && !hashPath) {
      push('home');
    }
  }, [isReady, hashPath, push]);

  useEffect(() => {
    console.log('Current hash path:', hashPath); // デバッグ用ログ
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
    };
    loadStudyHistory();
  }, []);

  const handleDeleteStudyEntry = async (entryId) => {
    await deleteStudyHistoryEntry(entryId);
    setStudyHistory(prevHistory => prevHistory.filter(entry => entry.id !== entryId));
  };

  const navigateTo = (screen, subPath = '') => {
    console.log('Navigating to:', screen, subPath); // デバッグ用ログ
    push(subPath ? `${screen}/${subPath}` : screen);
  };

  const handleCreateSet = () => {
    navigateTo('createEditSet');
  };
  
  const handleStartLearning = async (setId, setType, savedSessionState = null) => {
    console.log('handleStartLearning called', { setId, setType, savedSessionState });
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
        console.error("Error fetching set title:", error);
        // エラーハンドリング
      }
    } else {
      // 新しいセッションの場合、クイズタイプ選択画面に遷移
      navigateTo('quizTypeSelection');
    }
  };

  const handleStartQuiz = async (type, setId) => {
    try {
      let numericSetId = null;
      if (setId !== null && setId !== undefined && setId !== '') {
        numericSetId = setId;
      }

      // セッション状態を取得
      const sessionState = await getSessionState(numericSetId, type);

      setQuizType(type);
      setQuizSetId(numericSetId);
      setSessionState(sessionState);

      if (numericSetId === null) {
        setQuizSetTitle("すべてのセット");
      } else {
        const set = await getSetById(numericSetId);
        setQuizSetTitle(set.title);
      }
      navigateTo('quiz');
    } catch (error) {
      console.error('Error fetching set data:', error);
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
    console.log('Saving data:', data);
    // ここでデータを保存する処理を実装
    navigateTo('home');
  };

  const handleFinishQuiz = (results) => {
    console.log('Quiz finished with results:', results);
    // ここでクイズ結果を処理する
    navigateTo('home');
  };

  const handleOpenSettings = () => {
    navigateTo('settings');
  };

  const handleShowStudyHistory = () => {
    navigateTo('studyHistory');
  };

  const renderScreen = () => {
    console.log('Rendering screen:', currentScreen); // デバッグ用ログ
    switch (currentScreen) {
      case 'home':
        return (
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
          />
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
        console.log('Quiz type:', quizType);  // デバッグ用ログ
        switch (quizType) {
          case 'flashcard':
            return <FlashcardQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} sessionState={sessionState} />;
          case 'qa':
            return <QAQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} sessionState={sessionState} />;
          case 'multiple-choice':
            return <MultipleChoiceQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} sessionState={sessionState} />;
          case 'classification':
            return <ClassificationQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} sessionState={sessionState} />;
          default:
            return <div>Unknown quiz type: {quizType}</div>;
        }
      case 'statistics':
        return (
          <StatisticsScreen
            onBack={() => navigateTo('home')}
            overallProgress={overallProgress}
            streak={streak}
            studyHistory={studyHistory}
            dailyGoal={dailyGoal}
            todayStudyTime={todayStudyTime}
            onShowStudyHistory={handleShowStudyHistory}
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
  };

  if (!isReady) {
    return null; // または適切なローディング表示
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      {renderScreen()}
    </main>
  );
}