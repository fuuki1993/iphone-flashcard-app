import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getSetById, saveSessionState, saveStudyHistory } from '@/utils/firestore';
import { shuffleArray } from '@/utils/arrayUtils';
import { useWindowSize } from '@/hooks/useWindowSize';
import {DroppableCategory} from './DroppableCategory';
import { SortableItem } from './SortableItem';

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState }) => {
  const [quizData, setQuizData] = useState({
    question: null,
    categories: [],
    items: [],
    correctClassification: {},
    isFinished: false,
    showResults: false,
    score: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryFeedback, setCategoryFeedback] = useState({});
  const [tempFeedback, setTempFeedback] = useState({});
  const [shuffledItems, setShuffledItems] = useState([]);
  const [classifiedItems, setClassifiedItems] = useState({});
  const [shuffledCategories, setShuffledCategories] = useState([]);
  const startTimeRef = useRef(new Date());
  const { width, height } = useWindowSize();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        setIsLoading(true);
        const set = await getSetById(setId);
        if (set && Array.isArray(set.categories)) {
          if (sessionState) {
            setQuizData(sessionState.quizData);
            setShuffledItems(sessionState.shuffledItems);
            setShuffledCategories(sessionState.shuffledCategories);
            setCurrentItemIndex(sessionState.currentItemIndex);
            setClassifiedItems(sessionState.classifiedItems);
          } else {
            const newItems = set.categories.flatMap(c => 
              c.items.map((item, index) => ({ 
                id: `${c.name}-${index}`, 
                content: item, 
                category: null, 
                isClassified: false 
              }))
            );
            const shuffled = shuffleArray(newItems);
            const newCorrectClassification = set.categories.reduce((acc, cat) => {
              acc[cat.name] = cat.items;
              return acc;
            }, {});
            setQuizData({
              question: null,
              categories: set.categories,
              items: newItems,
              correctClassification: newCorrectClassification,
              isFinished: false,
              showResults: false,
              score: 0,
            });
            setShuffledItems(shuffled);
            setShuffledCategories(shuffleArray(set.categories));
            setCurrentItemIndex(0);
            setClassifiedItems({});
          }
        } else {
          throw new Error('Invalid data structure');
        }
      } catch (error) {
        console.error("Error loading question:", error);
        setError('質問の読み込中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestion();
  }, [setId, sessionState]);

  useEffect(() => {
    const saveState = async () => {
      if (setId) {
        await saveSessionState(setId, 'classification', {
          quizData,
          shuffledItems,
          shuffledCategories,
          currentItemIndex,
          classifiedItems,
        });
      }
    };
    saveState();
  }, [setId, quizData, shuffledItems, shuffledCategories, currentItemIndex, classifiedItems]);

  const handleShuffle = useCallback(() => {
    setShuffledItems(shuffleArray(shuffledItems));
    setShuffledCategories(shuffleArray(shuffledCategories));
    setCurrentItemIndex(0);
  }, [shuffledItems, shuffledCategories]);

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);
  
  const handleDragOver = useCallback((event) => {
    const { over } = event;
    setHoveredCategory(over ? over.id : null);
  }, []);
  
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuizData((prev) => {
        const updatedItems = prev.items.map(item => 
          item.id === active.id 
            ? { ...item, category: over.id, isClassified: true }
            : item
        );

        setClassifiedItems(prevClassified => ({
          ...prevClassified,
          [over.id]: [...(prevClassified[over.id] || []), active.id]
        }));

        const totalClassified = updatedItems.filter(item => item.isClassified).length;
        const correctClassified = updatedItems.filter(item => 
          item.isClassified && prev.correctClassification[item.category]?.includes(item.content)
        ).length;
        const newScore = totalClassified > 0 ? Math.round((correctClassified / totalClassified) * 100) : 0;
        
        const isFinished = updatedItems.every(item => item.isClassified);

        const isCorrect = prev.correctClassification[over.id]?.includes(updatedItems.find(i => i.id === active.id).content);
        setTempFeedback(prevFeedback => ({
          ...prevFeedback,
          [over.id]: isCorrect ? 'bg-green-200' : 'bg-red-200'
        }));

        if (currentItemIndex < shuffledItems.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
        } else {
          setCurrentItemIndex(shuffledItems.length - 1);
        }

        return {
          ...prev,
          items: updatedItems,
          score: newScore,
          isFinished: isFinished,
          showResults: isFinished,
        };
      });
    }

    setActiveId(null);
    setHoveredCategory(null);
  }, [shuffledItems, currentItemIndex]);

  useEffect(() => {
    if (Object.keys(tempFeedback).length > 0) {
      const timer = setTimeout(() => {
        setTempFeedback({});
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [tempFeedback]);

  const handleRestart = useCallback(() => {
    const loadQuestion = async () => {
      try {
        setIsLoading(true);
        const set = await getSetById(setId);
        if (set && Array.isArray(set.categories)) {
          const newItems = set.categories.flatMap(c => 
            c.items.map((item, index) => ({ 
              id: `${c.name}-${index}`, 
              content: item, 
              category: null, 
              isClassified: false 
            }))
          );
          const shuffled = shuffleArray(newItems);
          const newCorrectClassification = set.categories.reduce((acc, cat) => {
            acc[cat.name] = cat.items;
            return acc;
          }, {});
          setQuizData({
            question: null,
            categories: set.categories,
            items: newItems,
            correctClassification: newCorrectClassification,
            isFinished: false,
            showResults: false,
            score: 0,
          });
          setShuffledItems(shuffled);
          setShuffledCategories(shuffleArray(set.categories));
          setCurrentItemIndex(0);
          setClassifiedItems({});
          setTempFeedback({});
          startTimeRef.current = new Date();
        } else {
          throw new Error('Invalid data structure');
        }
      } catch (error) {
        console.error("Error loading question:", error);
        setError('質問の読み込中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestion();
  }, [setId]);

  const handleFinish = useCallback(async () => {
    const score = quizData.score;
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    await saveStudyHistory(setId, title, 'classification', score, endTime, studyDuration);
    onFinish(score);
  }, [onFinish, quizData.score, setId, title]);

  const getGridSizeStyle = useCallback(() => {
    const columns = 3;
    const rows = 4;

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: '0.5rem',
      height: '100%',
    };
  }, []);

  const gridStyle = useMemo(() => getGridSizeStyle(), [getGridSizeStyle]);

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

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>{error}</div>;
  
  return (
    <div className="flex flex-col h-screen w-screen p-2">
      <div className="flex justify-between items-center mb-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-bold">分類クイズ</h2>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish} className="mr-2">
            終了
          </Button>
          <span className="text-lg font-bold">スコア: {quizData.score}%</span>
        </div>
      </div>

      <Card className="flex-grow overflow-hidden">
        <CardContent className="h-full p-2">
          {!quizData.showResults ? (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="h-full" style={gridStyle}>
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
                <div className="col-start-2 row-start-2 row-span-2 flex items-center justify-center">
                  {shuffledItems[currentItemIndex] && (
                    <SortableContext items={[shuffledItems[currentItemIndex]]} strategy={verticalListSortingStrategy}>
                      <SortableItem 
                        id={shuffledItems[currentItemIndex].id} 
                        isDragging={shuffledItems[currentItemIndex].id === activeId}
                        isClassified={false}
                      >
                        {shuffledItems[currentItemIndex].content}
                      </SortableItem>
                    </SortableContext>
                  )}
                </div>
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className="bg-white p-4 rounded border shadow-lg text-2xl font-semibold transform rotate-90">
                    {quizData.items.find(item => item.id === activeId)?.content}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col gap-24">
                <Button onClick={handleRestart} className="transform rotate-90 w-32 h-12">
                  <span className="inline-block text-sm">もう一度挑戦</span>
                </Button>
                <Button onClick={handleFinish} className="transform rotate-90 w-32 h-12">
                  <span className="inline-block text-sm">終了</span>
                </Button>
              </div>
              <h2 className="text-2xl font-bold transform rotate-90 whitespace-nowrap">最終スコア: {quizData.score}%</h2>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassificationQuiz;