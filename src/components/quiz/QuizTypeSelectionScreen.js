'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/form/input";
import { ArrowLeft, Search, Filter, Play } from 'lucide-react';
import { getSets, clearSessionState } from '@/utils/firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from '@/styles/modules/QuizTypeSelectionScreen.module.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QuizTypeSelectionScreen = ({ onBack, onStartQuiz }) => {
  const [user, setUser] = useState(null);
  const [userSets, setUserSets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSets = async () => {
      if (user) {
        setIsLoading(true);
        setError(null);
        try {
          const sets = await getSets(user.uid);
          setUserSets(sets);
        } catch (err) {
          console.error("セットの取得中にエラーが発生しました:", err);
          setError("セットの読み込み中にエラーが発生しました。");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchSets();
  }, [user]);

  const filteredSets = userSets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (activeQuizType === 'all' || set.type === activeQuizType)
  );

  const getAvailableQuizTypes = (set) => {
    const baseTypes = [set.type];
    switch (set.type) {
      case 'flashcard':
        baseTypes.push('qa');
        if (set.cards?.length >= 4) {
          baseTypes.push('multiple-choice');
        }
        break;
      case 'qa':
        baseTypes.push('flashcard');
        if (set.qaItems?.length >= 4) {
          baseTypes.push('multiple-choice');
        }
        break;
      case 'classification':
        // 分類タイプの場合は他のタイプを追加しない
        break;
    }
    return baseTypes;
  };

  const getQuizTypeLabel = (type) => {
    switch (type) {
      case 'flashcard':
        return 'フラッシュカード';
      case 'qa':
        return '一問一答';
      case 'multiple-choice':
        return '多肢選択';
      case 'classification':
        return '分類';
      default:
        return type;
    }
  };

  const handleQuizTypeSelect = (setId, quizType) => {
    setSelectedQuizTypes(prev => ({
      ...prev,
      [setId]: quizType
    }));
  };

  const handleStartQuiz = useCallback(async (setId, set) => {
    if (!user) return;
    const quizType = selectedQuizTypes[setId] || set.type;
    await clearSessionState(user.uid, setId, quizType);
    onStartQuiz(quizType, setId, set.title);
  }, [user, onStartQuiz, selectedQuizTypes]);

  if (!user) {
    return (
      <div className={styles.container}>
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>ログインしてください。</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Button variant="ghost" size="icon" onClick={onBack} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>セットを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className={styles.title}>学習するセットを選択</h1>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.searchFilterContainer}>
          <div className={styles.searchContainer}>
            <Input
              type="text"
              placeholder="セットを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <Search className={styles.searchIcon} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={styles.filterButton}>
                <Filter className="mr-2 h-4 w-4" /> フィルター
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>クイズタイプ</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveQuizType('all')}>全て</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveQuizType('flashcard')}>フラッシュカード</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveQuizType('qa')}>一問一答</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveQuizType('multiple-choice')}>多肢選択</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveQuizType('classification')}>分類</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className={styles.cardList}>
          {filteredSets.map((set) => {
            const availableTypes = getAvailableQuizTypes(set);
            return (
              <Card key={set.id} className={styles.quizTypeCard}>
                <CardHeader className={styles.cardHeader}>
                  <CardTitle className={styles.cardTitle}>{set.title}</CardTitle>
                </CardHeader>
                <CardContent className={styles.cardContent}>
                  <div className={styles.cardFooter}>
                    <p className={styles.cardDescription}>
                      タイプ: {availableTypes.map(getQuizTypeLabel).join(', ')}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className={styles.quizTypeButton}>
                          {getQuizTypeLabel(selectedQuizTypes[set.id] || set.type)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>クイズタイプを選択</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {availableTypes.map((type) => (
                          <DropdownMenuItem key={type} onSelect={() => handleQuizTypeSelect(set.id, type)}>
                            {getQuizTypeLabel(type)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      size="sm"
                      className={styles.startButton}
                      onClick={() => handleStartQuiz(set.id, set)}
                    >
                      <Play className={styles.startButtonIcon} /> 学習開始
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizTypeSelectionScreen;