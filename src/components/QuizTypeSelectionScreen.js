'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Play } from 'lucide-react';
import { getSets, clearSessionState } from '@/utils/indexedDB';

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

  useEffect(() => {
    const loadSets = async () => {
      try {
        const flashcardSets = await getSets('flashcard');
        const qaSets = await getSets('qa');
        const multipleChoiceSets = await getSets('multiple-choice');
        const classificationSets = await getSets('classification');

        setQuizSets({
          flashcard: flashcardSets,
          qa: qaSets,
          'multiple-choice': multipleChoiceSets,
          classification: classificationSets
        });
      } catch (error) {
        console.error("Error loading sets:", error);
      }
    };

    loadSets();
  }, []);

  const quizTypes = [
    { id: 'flashcard', title: 'フラッシュカード', icon: BookOpen, description: '表と裏のある単語カードスタイル' },
    { id: 'qa', title: '一問一答', icon: List, description: '質問と回答のペアで学習' },
    { id: 'multiple-choice', title: '多肢選択', icon: CheckSquare, description: '複数の選択肢から正解を選ぶ' },
    { id: 'classification', title: '分類', icon: Layers, description: '項目をカテゴリーに分類' },
  ];

  const handleSetSelection = (quizType, setId) => {
    setSelectedSets(prev => ({ ...prev, [quizType]: setId }));
  };

  const handleStartQuiz = async (quizType) => {
    const selectedSetId = selectedSets[quizType] || quizSets[quizType]?.[0]?.id?.toString();
    if (selectedSetId) {
      // セッション状態をクリア
      await clearSessionState(parseInt(selectedSetId, 10), quizType);
      onStartQuiz(quizType, parseInt(selectedSetId, 10));
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">学習タイプを選択</h1>
      </div>

      <p className="text-gray-600 mb-6">
        学習したいクイズタイプとセットを選択し、「学習開始」ボタンをクリックしてください。
      </p>

      <div className="space-y-4">
        {quizTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{type.title}</CardTitle>
              <type.icon className="h-6 w-6 text-gray-500 ml-2" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{type.description}</p>
              <Select 
                onValueChange={(value) => handleSetSelection(type.id, value)} 
                value={selectedSets[type.id] || (quizSets[type.id]?.[0]?.id?.toString() || '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="セットを選択" />
                </SelectTrigger>
                <SelectContent>
                  {quizSets[type.id]?.map(set => (
                    <SelectItem key={set.id} value={set.id.toString()}>{set.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleStartQuiz(type.id)}
              >
                <Play className="mr-2 h-4 w-4" /> 学習開始
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuizTypeSelectionScreen;