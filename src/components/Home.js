'use client';

import React, { useState, useEffect } from 'react';
import { getSetById } from '@/utils/indexedDB';
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
import { useHashRouter } from '@/utils/hashRouter';

export default function Home() {
  const { hashPath, push } = useHashRouter();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [currentSetType, setCurrentSetType] = useState(null);
  const [editingSetId, setEditingSetId] = useState(null);
  const [quizType, setQuizType] = useState(null);
  const [quizSetId, setQuizSetId] = useState(null);
  const [quizSetTitle, setQuizSetTitle] = useState(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studyHistory, setStudyHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [todayStudyTime, setTodayStudyTime] = useState(0);

  useEffect(() => {
    if (!hashPath) {
      push('home');
    }
  }, [hashPath, push]);

  useEffect(() => {
    // Handle routing based on hashPath
    switch (hashPath) {
      case '':
      case 'home':
        setCurrentScreen('home');
        break;
      case 'createEditSet':
        setCurrentScreen('createEditSet');
        break;
      // ... (add other cases for different screens)
      default:
        setCurrentScreen('home');
    }
  }, [hashPath]);

  const navigateTo = (screen) => {
    push(screen);
  };

  const handleCreateSet = () => {
    navigateTo('createEditSet');
  };
  
  const handleStartLearning = () => {
    navigateTo('quizTypeSelection');
  };

  const handleShowStatistics = () => {
    navigateTo('statistics');
  };

  const handleSelectType = (type) => {
    setCurrentSetType(type);
    navigateTo(`${type}Creation`);
  };

  const handleEditType = (type) => {
    setCurrentSetType(type);
    navigateTo(`${type}Edit`);
  };

  const handleStartQuiz = async (type, setId) => {
    setQuizType(type);
    setQuizSetId(setId);
    try {
      if (setId === null) {
        // "すべてのセット"が選択された場合
        setQuizSetTitle("すべてのセット");
      } else {
        const set = await getSetById(setId);
        setQuizSetTitle(set.title);
      }
      navigateTo('quiz');
    } catch (error) {
      console.error("Error fetching set title:", error);
      // エラーハンドリングを行う（例：ユーザーにエラーメッセージを表示する）
    }
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen 
            onCreateSet={handleCreateSet}
            onStartLearning={handleStartLearning}
            onShowStatistics={handleShowStatistics}
            overallProgress={overallProgress}
            streak={streak}
            studyHistory={studyHistory}
            dailyGoal={dailyGoal}
            todayStudyTime={todayStudyTime}
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
            setList={[]} // この部分は適切なデータで置き換える必要があります
            initialData={null} // この部分は適切なデータで置き換える必要があます
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
            setList={[]} // この部分は適切なデータで置き換える必要があります
            initialData={null} // この部分は適切なデータで置き換える必要があります
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
            setList={[]} // この部分は適切なデータで置き換える必要があります
            initialData={null} // この部分は適切なデータで置き換える必要があります
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
            setList={[]} // この部分は適切なデータで置き換える必要があります
            initialData={null} // この部分は適切なデータで置き換える必要があります
          />
        );
      case 'quiz':
        switch (quizType) {
          case 'flashcard':
            return <FlashcardQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} />;
          case 'qa':
            return <QAQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} />;
          case 'multiple-choice':
            return <MultipleChoiceQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} />;
          case 'classification':
            return <ClassificationQuiz setId={quizSetId} title={quizSetTitle} quizType={quizType} onBack={() => navigateTo('quizTypeSelection')} onFinish={handleFinishQuiz} />;
          default:
            return null;
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
          />
        );
      default:
        return <div>Unknown screen</div>;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      {renderScreen()}
    </main>
  );
}