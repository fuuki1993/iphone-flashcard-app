'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Play } from 'lucide-react';
import { getSets, clearSessionState } from '@/utils/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
        const [flashcardSets, qaSets, multipleChoiceSets, classificationSets] = await Promise.all([
          getSets(user.uid, 'flashcard'),
          getSets(user.uid, 'qa'),
          getSets(user.uid, 'multiple-choice'),
          getSets(user.uid, 'classification')
        ]);

        const newQuizSets = {
          flashcard: flashcardSets,
          qa: qaSets,
          'multiple-choice': multipleChoiceSets,
          classification: classificationSets
        };

        setQuizSets(newQuizSets);

        // 各タイプの最初のセットをデフォルトで選択
        const newSelectedSets = {
          flashcard: flashcardSets[0]?.id || '',
          qa: qaSets[0]?.id || '',
          'multiple-choice': multipleChoiceSets[0]?.id || '',
          classification: classificationSets[0]?.id || ''
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
      onStartQuiz(quizType, selectedSetId);
    }
  }, [selectedSets, onStartQuiz, user]);

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  if (isLoading) {
    return <div>セットを読み込んでいます...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">学習タイプを選択</h1>
      </div>

      {error ? (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          クイズタイプとセットを選択:
        </p>
      )}

      <div className="space-y-3">
        {quizTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 py-3 px-4">
              <type.icon className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
              <CardTitle className="text-base font-medium">{type.title}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <p className="text-xs text-gray-500 mb-3">{type.description}</p>
              <div className="flex items-center space-x-2">
                <Select 
                  onValueChange={(value) => handleSetSelection(type.id, value)} 
                  value={selectedSets[type.id]}
                  disabled={quizSets[type.id]?.length === 0}
                >
                  <SelectTrigger className="text-xs flex-grow">
                    <SelectValue placeholder={quizSets[type.id]?.length === 0 ? "セットがありません" : "セットを選択"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quizSets[type.id]?.map(set => (
                      <SelectItem key={set.id} value={set.id}>{set.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={() => handleStartQuiz(type.id)}
                  disabled={!selectedSets[type.id] || quizSets[type.id]?.length === 0}
                >
                  <Play className="mr-1 h-3 w-3" /> 学習開始
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuizTypeSelectionScreen;