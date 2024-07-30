'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FlipHorizontal, MessageCircleQuestion, ListChecks, Combine, Plus, Edit, Search, Filter, Trash2, X } from 'lucide-react';
import { Input } from "@/components/ui/form/input";
import { Checkbox } from "@/components/ui/form/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getSets, deleteSet } from '@/utils/firebase/firestore';
import { getStorage, ref, deleteObject } from "firebase/storage";
import styles from '@/styles/modules/CreateEditSetSelectionScreen.module.css';

const CreateEditSetSelectionScreen = ({ onBack, onSelectType, onEditType }) => {
  const [user, setUser] = useState(null);
  const [userSets, setUserSets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSets, setSelectedSets] = useState([]);

  // クイズタイプの定義
  const quizTypes = [
    { id: 'flashcard', title: 'フラッシュカード', icon: FlipHorizontal },
    { id: 'qa', title: '一問一答', icon: MessageCircleQuestion },
    { id: 'multiple-choice', title: '多肢選択', icon: ListChecks },
    { id: 'classification', title: '分類', icon: Combine },
  ];

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
        try {
          const sets = await getSets(user.uid);
          setUserSets(sets);
          console.log('Fetched sets:', sets); // デバッグ用ログ
        } catch (err) {
          console.error("セットの取得中にエラーが発生しました:", err);
          console.error("エラーのスタック:", err.stack); // スタックトレースを出力
        }
      }
    };
    fetchSets();
  }, [user]);

  const filteredSets = userSets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (activeQuizType === 'all' || set.type === activeQuizType)
  );

  const handleDeleteSelected = async () => {
    const selectedSetsInfo = selectedSets.map(setId => {
      const set = userSets.find(s => s.id === setId);
      return `"${set.title}" (${set.type})`;
    });

    const firstConfirmMessage = `以下の${selectedSets.length}個のセットを削除しますか？\n\n${selectedSetsInfo.join('\n')}`;

    if (window.confirm(firstConfirmMessage)) {
      const secondConfirmMessage = "本当に削除してもよろしいですか？この操作は取り消せません。";
      
      if (window.confirm(secondConfirmMessage)) {
        try {
          for (const setId of selectedSets) {
            const set = userSets.find(s => s.id === setId);
            await handleDelete(setId, set.type);
          }
          setIsSelectionMode(false);
          setSelectedSets([]);
          const updatedSets = await getSets(user.uid);
          setUserSets(updatedSets);
          alert(`${selectedSets.length}個のセットが正常に削除されました。`);
        } catch (error) {
          console.error("Error deleting sets:", error);
          alert("セットの削除中にエラーが発生しました。");
        }
      }
    }
  };

  const handleDelete = async (setId, setType) => {
    const storage = getStorage();
    const set = userSets.find(s => s.id === setId);
    
    // 画像の削除処理（セットタイプに応じて）
    if (setType === 'flashcard' || setType === 'multiple-choice') {
      for (const item of set.cards || set.questions) {
        if (item.image) {
          const imageRef = ref(storage, item.image);
          await deleteObject(imageRef);
        }
      }
    } else if (setType === 'classification') {
      for (const category of set.categories) {
        if (category.image) {
          const imageRef = ref(storage, category.image);
          await deleteObject(imageRef);
        }
      }
    }

    await deleteSet(user.uid, setId);
    
    // ローカルストレージからセットデータを削除
    localStorage.removeItem(`${setType}Set_${setId}`);
    localStorage.removeItem(`lastEdited${setType.charAt(0).toUpperCase() + setType.slice(1)}SetId`);

    // sessionStatesを削除
    const sessionStates = JSON.parse(localStorage.getItem('sessionStates')) || {};
    delete sessionStates[setId];
    localStorage.setItem('sessionStates', JSON.stringify(sessionStates));
  };

  const handleEditSet = (setType, setId) => {
    // 直接編集画面に遷移する
    onEditType(setType, setId);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSets([]);
  };

  const handleSetSelection = (setId) => {
    setSelectedSets(prev => 
      prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
    );
  };

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className={styles.title}>セットの管理</h1>
        {isSelectionMode ? (
          <div className={styles.selectionModeButtons}>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={selectedSets.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" /> 削除
            </Button>
            <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
              <X className="h-4 w-4 mr-1" /> キャンセル
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
            選択
          </Button>
        )}
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

        <div className={styles.createButtonsContainer}>
          <h2 className={styles.sectionTitle}>新しいセットを作成</h2>
          <div className={styles.createButtons}>
            {quizTypes.map((type) => (
              <Button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className={styles.createButton}
              >
                <type.icon className={styles.buttonIcon} />
                <span>{type.title}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.manageSetContainer}>
          <h2 className={styles.sectionTitle}>管理するセットを選択</h2>
        </div>

        <div className={styles.cardList}>
          {filteredSets.map((set) => (
            <Card key={set.id} className={styles.quizTypeCard}>
              <CardHeader className={styles.cardHeader}>
                {isSelectionMode && (
                  <Checkbox
                    checked={selectedSets.includes(set.id)}
                    onCheckedChange={() => handleSetSelection(set.id)}
                    className={styles.setCheckbox}
                  />
                )}
                <CardTitle className={styles.cardTitle}>{set.title}</CardTitle>
              </CardHeader>
              <CardContent className={styles.cardContent}>
                <div className={styles.cardFooter}>
                  <p className={styles.cardDescription}>タイプ: {set.type}</p>
                  {!isSelectionMode && (
                    <div className={styles.buttonGroup}>
                      <Button 
                        size="sm"
                        className={styles.button}
                        onClick={() => handleEditSet(set.type, set.id)}
                      >
                        <Edit className={styles.buttonIcon} /> 編集
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateEditSetSelectionScreen;