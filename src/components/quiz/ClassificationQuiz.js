import React, { useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useClassificationQuiz } from './hooks/useClassificationQuiz';
import { SortableItem, DroppableCategory } from './ClassificationQuizComponents';
import styles from '@/styles/modules/quiz/ClassificationQuiz.module.css';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateProgress }) => {
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
    categoryImages,
    handleShuffle,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleRestart,
    handleFinish,
  } = useClassificationQuiz(setId, sessionState, onFinish, setTodayStudyTime, updateProgress);

  const isWideScreen = useMediaQuery('(min-width: 601px)');

  // useMemoを使用してgridOrderを計算
  const gridOrder = useMemo(() => {
    if (isWideScreen) {
      return [
        { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 2, row: 3 }, { col: 3, row: 3 },
        { col: 1, row: 2 }, { col: 4, row: 2 }, { col: 1, row: 1 }, { col: 1, row: 4 },
        { col: 1, row: 3 }, { col: 4, row: 3 },
      ];
    } else {
      return [
        { col: 3, row: 2 }, { col: 3, row: 3 }, { col: 1, row: 2 }, { col: 1, row: 3 },
        { col: 2, row: 1 }, { col: 2, row: 4 }, { col: 3, row: 1 }, { col: 3, row: 4 },
        { col: 1, row: 1 }, { col: 1, row: 4 },
      ];
    }
  }, [isWideScreen]);

  // ドラッグ＆ドロップのセンサーを設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // コンポーネントのマウント時にbodyのoverflowを制御
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>エラー: {error}</div>;
  }

  if (!quizData || !quizData.items) {
    return <div>データが利用できません。</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>分類クイズ</h2>
        <div className={styles.headerButtons}>
          <Button variant="ghost" size="icon" onClick={handleShuffle} className={styles.shuffleButton}>
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish} className={styles.finishButton}>
            終了
          </Button>
          <span className={styles.score}>スコア: {quizData.score}%</span>
        </div>
      </div>

      <Card className={styles.quizCard}>
        <CardContent className={styles.quizCardContent}>
          {!quizData.showResults ? (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.gridContainer}>
                {shuffledCategories.map((category, index) => (
                  <DroppableCategory
                    key={category.name || `category-${index}`}
                    category={category}
                    isActive={hoveredCategory === category.name}
                    feedbackColor={tempFeedback[category.name] || categoryFeedback[category.name]}
                    style={{
                      gridColumn: gridOrder[index].col,
                      gridRow: gridOrder[index].row,
                    }}
                    isWideScreen={isWideScreen}
                  >
                    <h3>{category.name}</h3>
                    {categoryImages[category.name] && (
                      <img 
                        src={categoryImages[category.name]} 
                        alt={`Category ${category.name}`} 
                        className={styles.categoryImage}
                      />
                    )}
                  </DroppableCategory>
                ))}
                <div className={styles.itemContainer}>
                  {unclassifiedItems[currentItemIndex] && (
                    <SortableContext items={unclassifiedItems[currentItemIndex] ? [unclassifiedItems[currentItemIndex]] : []} strategy={verticalListSortingStrategy}>
                      <SortableItem 
                        id={unclassifiedItems[currentItemIndex].id || `item-${currentItemIndex}`}
                        isDragging={unclassifiedItems[currentItemIndex].id === activeId}
                        isClassified={false}
                        isWideScreen={isWideScreen}
                      >
                        {unclassifiedItems[currentItemIndex].content}
                      </SortableItem>
                    </SortableContext>
                  )}
                </div>
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className={`${styles.dragOverlay} ${isWideScreen ? styles.wideScreenDragOverlay : ''}`}>
                    {quizData.items.find(item => item.id === activeId)?.content}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className={styles.resultsContainer}>
              <div className={styles.buttonContainer}>
                <Button onClick={handleRestart} className={isWideScreen ? '' : styles.rotatedButton}>
                  <span className={isWideScreen ? '' : styles.rotatedText}>もう一度挑戦</span>
                </Button>
                <Button onClick={handleFinish} className={isWideScreen ? '' : styles.rotatedButton}>
                  <span className={isWideScreen ? '' : styles.rotatedText}>終了</span>
                </Button>
              </div>
              <h2 className={isWideScreen ? '' : styles.finalScore}>最終スコア: {quizData.score}%</h2>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassificationQuiz;