'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FlipHorizontal, MessageCircleQuestion, ListChecks, Combine, Plus, Edit } from 'lucide-react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from '@/styles/modules/CreateEditSetSelectionScreen.module.css';

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
    { id: 'flashcard', title: 'フラッシュカード', icon: FlipHorizontal, description: '表と裏のある単語カードスタイル' },
    { id: 'qa', title: '一問一答', icon: MessageCircleQuestion, description: '質問と回答のペアを作成' },
    { id: 'multiple-choice', title: '多肢選択', icon: ListChecks, description: '複数の選択肢から正解を選ぶ' },
    { id: 'classification', title: '分類', icon: Combine, description: '項目をカテゴリーに分類' },
  ];

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
      <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className={styles.title}>セットの作成・編集</h1>
      </div>

      <p className={styles.description}>
        学習セットのタイプを選択:
      </p>

      <div className={styles.cardList}>
        {setTypes.map((type) => (
          <Card key={type.id} className={styles.quizTypeCard}>
            <CardHeader className={styles.cardHeader}>
              <type.icon className={styles.cardIcon} />
              <CardTitle className={styles.cardTitle}>{type.title}</CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContent}>
              <p className={styles.cardDescription}>{type.description}</p>
              <div className={styles.buttonGroup}>
                <Button 
                  size="sm"
                  className={styles.button}
                  onClick={() => onSelectType(type.id)}
                >
                  <Plus className={styles.buttonIcon} /> 新規作成
                </Button>
                <Button 
                  size="sm"
                  variant="outline" 
                  className={styles.button}
                  onClick={() => onEditType(type.id)}
                >
                  <Edit className={styles.buttonIcon} /> 編集
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