'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form/select';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Play } from 'lucide-react';
import { getSets, clearSessionState } from '@/utils/firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from '@/styles/modules/QuizTypeSelectionScreen.module.css';

// 遅延ロードするコンポーネント
const LazyFlashcardQuiz = lazy(() => import('./FlashcardQuiz'));
const LazyQAQuiz = lazy(() => import('./QAQuiz'));
const LazyMultipleChoiceQuiz = lazy(() => import('./MultipleChoiceQuiz'));
const LazyClassificationQuiz = lazy(() => import('./ClassificationQuiz'));

const QuizTypeSelectionScreen = ({ onBack, onStartQuiz }) => {
  const [quizSets, setQuizSets] = useState({
    flashcard: [],
    qa: [],
    'multiple-choice': [],
    classification: []
  });

  const [selectedSets, setSelectedSets] = useState({
    flashcard: '',
    qa: '',
    'multiple-choice': '',
    classification: ''
  });

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadSets = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const allSets = await getSets(user.uid);
        
        const newQuizSets = {
          flashcard: allSets.filter(set => set.type === 'flashcard' || set.type === 'qa'),
          qa: allSets.filter(set => set.type === 'qa' || set.type === 'flashcard'),
          'multiple-choice': allSets.filter(set => 
            set.type === 'multiple-choice' || 
            (set.type === 'qa' && set.qaItems && set.qaItems.length >= 4) || 
            (set.type === 'flashcard' && set.cards && set.cards.length >= 4)
          ),
          classification: allSets.filter(set => set.type === 'classification')
        };
  
        setQuizSets(newQuizSets);
  
        // 各タイプの最初のセットをデフォルトで選択
        const newSelectedSets = {
          flashcard: newQuizSets.flashcard[0]?.id || '',
          qa: newQuizSets.qa[0]?.id || '',
          'multiple-choice': newQuizSets['multiple-choice'][0]?.id || '',
          classification: newQuizSets.classification[0]?.id || ''
        };
  
        setSelectedSets(newSelectedSets);
  
        // セットが空の場合のエラーハンドリング
        if (Object.values(newQuizSets).every(sets => sets.length === 0)) {
          setError("セットが見つかりません。新しいセットを作成してください。");
        }
      } catch (error) {
        console.error("Error loading sets:", error);
        setError("セットの読み込み中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };
  
    if (user) {
      loadSets();
    }
  }, [user]);

  // プリフェッチ関数
  const prefetchQuizData = useCallback(async (quizType, setId) => {
    if (!user) return;
    try {
      // クイズデータをプリフェッチ
      await getSets(user.uid, quizType, setId);
    } catch (error) {
      console.error("Error prefetching quiz data:", error);
    }
  }, [user]);

  // セットが選択されたときにプリフェッチを開始
  useEffect(() => {
    Object.entries(selectedSets).forEach(([quizType, setId]) => {
      if (setId) {
        prefetchQuizData(quizType, setId);
      }
    });
  }, [selectedSets, prefetchQuizData]);

  const quizTypes = [
    { id: 'flashcard', title: 'フラッシュカード', icon: BookOpen, description: '表と裏のある単語カードスタイル' },
    { id: 'qa', title: '一問一答', icon: List, description: '質問と回答のペアで学習' },
    { id: 'multiple-choice', title: '多肢選択', icon: CheckSquare, description: '複数の選択肢から正解を選ぶ' },
    { id: 'classification', title: '分類', icon: Layers, description: '項目をカテゴリーに分類' },
  ];

  const handleSetSelection = useCallback((quizType, setId) => {
    setSelectedSets(prev => ({ ...prev, [quizType]: setId }));
  }, []);

  const handleStartQuiz = useCallback(async (quizType) => {
    if (!user) return;
    const selectedSetId = selectedSets[quizType];
    if (selectedSetId) {
      await clearSessionState(user.uid, selectedSetId, quizType);
      // 状態をリセット
      setIsLoading(true);
      setError(null);
      // クイズコンポーネントを遅延ロード
      const QuizComponent = getQuizComponent(quizType);
      const selectedSet = quizSets[quizType].find(set => set.id === selectedSetId);
      onStartQuiz(quizType, selectedSetId, QuizComponent, selectedSet.type);
    }
  }, [selectedSets, onStartQuiz, user, quizSets]);

  // クイズコンポーネントを取得する関数
  const getQuizComponent = (quizType) => {
    switch (quizType) {
      case 'flashcard':
        return LazyFlashcardQuiz;
      case 'qa':
        return LazyQAQuiz;
      case 'multiple-choice':
        return LazyMultipleChoiceQuiz;
      case 'classification':
        return LazyClassificationQuiz;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>ログインしてください。</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>セットを読み込んでいます...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className={styles.title}>学習タイプを選択</h1>
      </div>

      {error ? (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      ) : (
        <p className={styles.description}>
          クイズタイプとセットを選択:
        </p>
      )}

      <div className={styles.quizTypeList}>
        {quizTypes.map((type) => (
          <Card key={type.id} className={styles.quizTypeCard}>
            <CardHeader className={styles.cardHeader}>
              <type.icon className={styles.cardIcon} />
              <CardTitle className={styles.cardTitle}>{type.title}</CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContent}>
              <p className={styles.cardDescription}>{type.description}</p>
              <div className={styles.selectContainer}>
                <Select 
                  onValueChange={(value) => handleSetSelection(type.id, value)} 
                  value={selectedSets[type.id]}
                  disabled={quizSets[type.id]?.length === 0}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder={quizSets[type.id]?.length === 0 ? "セットがありません" : "セットを選択"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quizSets[type.id]?.map(set => (
                      <SelectItem key={set.id} value={set.id}>{set.title} ({set.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm"
                  className={styles.startButton}
                  onClick={() => handleStartQuiz(type.id)}
                  disabled={!selectedSets[type.id] || quizSets[type.id]?.length === 0}
                >
                  <Play className={styles.startButtonIcon} /> 学習開始
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        {/* クイズコンポーネントをここに配置 */}
      </Suspense>
    </div>
  );
};

export default QuizTypeSelectionScreen;