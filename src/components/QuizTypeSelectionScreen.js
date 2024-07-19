'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Play } from 'lucide-react';
import { getSets, clearSessionState } from '@/utils/firestore';

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
        const [flashcardSets, qaSets, multipleChoiceSets, classificationSets] = await Promise.all([
          getSets('flashcard'),
          getSets('qa'),
          getSets('multiple-choice'),
          getSets('classification')
        ]);

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

  const handleSetSelection = useCallback((quizType, setId) => {
    setSelectedSets(prev => ({ ...prev, [quizType]: setId }));
  }, []);

  const handleStartQuiz = useCallback(async (quizType) => {
    const selectedSetId = selectedSets[quizType] || quizSets[quizType]?.[0]?.id;
    if (selectedSetId) {
      await clearSessionState(selectedSetId, quizType);
      onStartQuiz(quizType, selectedSetId.toString());
    }
  }, [selectedSets, quizSets, onStartQuiz]);

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">学習タイプを選択</h1>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        クイズタイプとセットを選択:
      </p>

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
                  value={selectedSets[type.id] || (quizSets[type.id]?.[0]?.id || '')}
                >
                  <SelectTrigger className="text-xs flex-grow">
                    <SelectValue placeholder="セットを選択" />
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