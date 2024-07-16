'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, List, CheckSquare, Layers, Plus, Edit } from 'lucide-react';

const CreateEditSetSelectionScreen = ({ onBack, onSelectType, onEditType }) => {
  const setTypes = [
    { id: 'flashcard', title: 'フラッシュカード', icon: BookOpen, description: '表と裏のある単語カードスタイル' },
    { id: 'qa', title: '一問一答', icon: List, description: '質問と回答のペアを作成' },
    { id: 'multiple-choice', title: '多肢選択', icon: CheckSquare, description: '複数の選択肢から正解を選ぶ' },
    { id: 'classification', title: '分類', icon: Layers, description: '項目をカテゴリーに分類' },
  ];

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">セットの作成・編集</h1>
      </div>

      <p className="text-gray-600 mb-6">
        新規作成または編集したい学習セットのタイプを選択してください。
      </p>

      <div className="grid gap-4">
        {setTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{type.title}</CardTitle>
              <type.icon className="h-6 w-6 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{type.description}</p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => onSelectType(type.id)}>
                  <Plus className="mr-2 h-4 w-4" /> このタイプで作成
                </Button>
                <Button className="w-full" variant="outline" onClick={() => onEditType(type.id)}>
                  <Edit className="mr-2 h-4 w-4" /> このタイプを編集
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