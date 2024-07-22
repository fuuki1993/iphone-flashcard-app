import React, { useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useClassificationQuiz } from './hooks/useClassificationQuiz';
import { SortableItem, DroppableCategory } from './ClassificationQuizComponents';
import styles from '@/styles/modules/ClassificationQuiz.module.css';

// ... 既存のインポート文 ...

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateProgress }) => {
  // カスタムフックuseClassificationQuizを使用してクイズの状態と関数を取得
  const {
    quizData,
    isLoading,
    error,
    activeId,
    hoveredCategory,
    tempFeedback,
    categoryFeedback,
    shuffledCategories,
    currentItemIndex,
    unclassifiedItems,
    handleShuffle,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleRestart,
    handleFinish,
  } = useClassificationQuiz(setId, sessionState, onFinish, setTodayStudyTime, updateProgress);

  // ドラッグ＆ドロップのセンサーを設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // カテゴリーの配置順序を定義
  const gridOrder = useMemo(() => [
    { col: 3, row: 2 },
    { col: 3, row: 3 },
    { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 2, row: 1 },
    { col: 2, row: 4 },
    { col: 3, row: 1 },
    { col: 3, row: 4 },
    { col: 1, row: 1 },
    { col: 1, row: 4 },
  ], []);

  // コンポーネントのマウント時にbodyのoverflowを制御
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ローディング中、エラー時、データなしの場合の表示
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!quizData) return null;
  
  return (
    <div className={styles.container}>
      {/* ヘッダー部分 */}
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>分類クイズ</h2>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish} className="mr-2">
            終了
          </Button>
          <span className={styles.score}>スコア: {quizData.score}%</span>
        </div>
      </div>

      {/* メインのクイズコンテンツ */}
      <Card className="flex-grow overflow-hidden">
        <CardContent className="h-full p-2 overflow-hidden">
          {!quizData.showResults ? (
            // クイズ実行中の表示
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.gridContainer}>
                {/* カテゴリーの表示 */}
                {shuffledCategories.map((category, index) => (
                  <DroppableCategory
                    key={category.name}
                    category={category}
                    isActive={hoveredCategory === category.name}
                    feedbackColor={tempFeedback[category.name] || categoryFeedback[category.name]}
                    style={{
                      gridColumn: gridOrder[index].col,
                      gridRow: gridOrder[index].row,
                    }}
                  />
                ))}
                {/* 分類するアイテムの表示 */}
                <div className={styles.itemContainer}>
                  {unclassifiedItems.length > 0 && (
                    <SortableContext items={[unclassifiedItems[currentItemIndex]]} strategy={verticalListSortingStrategy}>
                      <SortableItem 
                        id={unclassifiedItems[currentItemIndex].id} 
                        isDragging={unclassifiedItems[currentItemIndex].id === activeId}
                        isClassified={false}
                      >
                        {unclassifiedItems[currentItemIndex].content}
                      </SortableItem>
                    </SortableContext>
                  )}
                </div>
              </div>
              {/* ドラッグ中のオーバーレイ */}
              <DragOverlay>
                {activeId ? (
                  <div className={styles.dragOverlay}>
                    {quizData.items.find(item => item.id === activeId)?.content}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            // 結果表示画面
            <div className={styles.resultsContainer}>
              <div className={styles.buttonContainer}>
                <Button onClick={handleRestart} className={styles.rotatedButton}>
                  <span className={styles.rotatedText}>もう一度挑戦</span>
                </Button>
                <Button onClick={handleFinish} className={styles.rotatedButton}>
                  <span className={styles.rotatedText}>終了</span>
                </Button>
              </div>
              <h2 className={styles.finalScore}>最終スコア: {quizData.score}%</h2>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassificationQuiz;