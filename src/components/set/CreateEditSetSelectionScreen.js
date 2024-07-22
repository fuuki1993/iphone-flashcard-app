'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Plus, Edit } from 'lucide-react';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const CreateEditSetSelectionScreen = ({ onBack, onSelectType, onEditType }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const setTypes = [
    { id: 'flashcard', title: 'フラッシュカード', icon: BookOpen, description: '表と裏のある単語カードスタイル' },
    { id: 'qa', title: '一問一答', icon: List, description: '質問と回答のペアを作成' },
    { id: 'multiple-choice', title: '多肢選択', icon: CheckSquare, description: '複数の選択肢から正解を選ぶ' },
    { id: 'classification', title: '分類', icon: Layers, description: '項目をカテゴリーに分類' },
  ];

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">セットの作成・編集</h1>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        学習セットのタイプを選択:
      </p>

      <div className="space-y-3">
        {setTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 py-3 px-4">
              <type.icon className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
              <CardTitle className="text-base font-medium">{type.title}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <p className="text-xs text-gray-500 mb-3">{type.description}</p>
              <div className="flex space-x-2">
                <Button 
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onSelectType(type.id)}
                >
                  <Plus className="mr-1 h-3 w-3" /> 新規作成
                </Button>
                <Button 
                  size="sm"
                  variant="outline" 
                  className="flex-1 text-xs"
                  onClick={() => onEditType(type.id)}
                >
                  <Edit className="mr-1 h-3 w-3" /> 編集
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CreateEditSetSelectionScreen;