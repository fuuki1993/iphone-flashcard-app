import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSetById, saveSessionState, getSessionState, saveStudyHistory } from '@/utils/firestore';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWindowSize } from '@/hooks/useWindowSize';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const SortableItem = memo(({ id, children, isDragging, isClassified }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  }), [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`inline-block p-4 m-2 rounded border text-2xl font-semibold ${
        isClassified ? 'bg-gray-100' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : 'shadow'} transform rotate-90`}
    >
      {children}
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

const DroppableCategory = memo(({ category, isActive, feedbackColor, style }) => {
  const { setNodeRef } = useDroppable({
    id: category.name,
    data: { category: category.name },
  });

  const className = useMemo(() => `
    flex flex-col items-center justify-center rounded transition-all duration-300
    ${feedbackColor ? feedbackColor : 'bg-gray-100'}
    ${isActive ? 'border-2 border-blue-500' : ''}
    w-full h-full
  `, [feedbackColor, isActive]);

  return (
    <div ref={setNodeRef} className={className} style={style}>
      {category.image && (
        <img src={category.image} alt={category.name} className="w-full h-24 object-cover mb-2 transform rotate-90" />
      )}
      <h3 className="text-center transform rotate-90">{category.name}</h3>
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime }) => {
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
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [unclassifiedItems, setUnclassifiedItems] = useState([]);
  const startTimeRef = useRef(new Date());
  const { width, height } = useWindowSize();
  const [user, setUser] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log('setId:', setId);
    const loadQuestion = async () => {
      try {
        setIsLoading(true);
        if (!setId || !user) {
          throw new Error('setIdが提供されていないか、ユーザーが認証されていません');
        }
        const set = await getSetById(user.uid, setId);
        if (set && Array.isArray(set.categories)) {
          if (sessionState) {
            setQuizData(sessionState.quizData);
            setShuffledItems(sessionState.shuffledItems);
            setShuffledCategories(sessionState.shuffledCategories);
            setClassifiedItems(sessionState.classifiedItems);
            setCurrentItemIndex(sessionState.currentItemIndex);
            setUnclassifiedItems(sessionState.unclassifiedItems);
          } else {
            const newItems = set.categories.flatMap(c => 
              c.items.map((item, index) => ({ 
                id: `${c.name}-${index}`, 
                content: item, 
                category: null, 
                isClassified: false 
              }))
            );
            const shuffledItems = shuffleArray(newItems);
            const shuffledCategories = shuffleArray([...set.categories]);
            const newCorrectClassification = set.categories.reduce((acc, cat) => {
              acc[cat.name] = cat.items;
              return acc;
            }, {});
            setQuizData({
              question: null,
              categories: shuffledCategories,
              items: shuffledItems,
              correctClassification: newCorrectClassification,
              isFinished: false,
              showResults: false,
              score: 0,
            });
            setShuffledItems(shuffledItems);
            setShuffledCategories(shuffledCategories);
            setClassifiedItems({});
            setCurrentItemIndex(0);
            setUnclassifiedItems(shuffledItems);
          }
        } else {
          throw new Error('無効なデータ構造です');
        }
      } catch (error) {
        console.error("質問の読み込み中にエラーが発生しました:", error);
        setError(`質問の読み込み中にエラーが発生しました: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      loadQuestion();
    }
  }, [setId, sessionState, shuffleArray, user]);

  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'classification', {
          quizData,
          shuffledItems,
          shuffledCategories,
          classifiedItems,
          currentItemIndex,
          unclassifiedItems,
        });
      }
    };
    saveState();
  }, [setId, quizData, shuffledItems, shuffledCategories, classifiedItems, currentItemIndex, unclassifiedItems, user]);

  useEffect(() => {
    if (quizData.items.length > 0) {
      const newUnclassifiedItems = quizData.items.filter(item => !item.isClassified);
      setUnclassifiedItems(newUnclassifiedItems);
      if (newUnclassifiedItems.length > 0 && currentItemIndex >= newUnclassifiedItems.length) {
        setCurrentItemIndex(0);
      }
    }
  }, [quizData.items, currentItemIndex]);

  const handleShuffle = useCallback(() => {
    setUnclassifiedItems(prevItems => shuffleArray(prevItems));
    setShuffledCategories(shuffleArray(shuffledCategories));
    setCurrentItemIndex(0);
  }, [shuffleArray, shuffledCategories]);

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

        // Update unclassified items
        const newUnclassifiedItems = updatedItems.filter(item => !item.isClassified);
        setUnclassifiedItems(newUnclassifiedItems);

        // Move to the next unclassified item or reset to 0 if all items are classified
        setCurrentItemIndex(prevIndex => {
          if (newUnclassifiedItems.length > 0) {
            return (prevIndex + 1) % newUnclassifiedItems.length;
          }
          return 0;
        });

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
  }, []);

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
        if (!setId || !user) {
          throw new Error('setIdが提供されていないか、ユーザーが認証されていません');
        }
        const set = await getSetById(user.uid, setId);
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
          const shuffledCategories = shuffleArray([...set.categories]);
          const newCorrectClassification = set.categories.reduce((acc, cat) => {
            acc[cat.name] = cat.items;
            return acc;
          }, {});
          setQuizData({
            question: null,
            categories: shuffledCategories,
            items: newItems,
            correctClassification: newCorrectClassification,
            isFinished: false,
            showResults: false,
            score: 0,
          });
          setShuffledItems(shuffled);
          setShuffledCategories(shuffledCategories);
          setClassifiedItems({});
          setCurrentItemIndex(0);
          setUnclassifiedItems(shuffled);
          setTempFeedback({});
          startTimeRef.current = new Date();
        } else {
          throw new Error('無効なデータ構造です');
        }
      } catch (error) {
        console.error("質問の読み込み中にエラーが発生しました:", error);
        setError(`質問の読み込み中にエラーが発生しました: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestion();
  }, [setId, shuffleArray, user]);

  const handleFinish = useCallback(async () => {
    if (!user) return;
    const score = quizData.score;
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    const cardsStudied = quizData.items.filter(item => item.isClassified).length;
    await saveStudyHistory(user.uid, setId, title, 'classification', score, endTime, studyDuration, cardsStudied);
    setTodayStudyTime(prevTime => prevTime + studyDuration);
    onFinish(score, studyDuration, cardsStudied);
  }, [setId, title, quizData, onFinish, setTodayStudyTime, user]);
  
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!quizData) return null;
  
  return (
    <div className="flex flex-col h-screen w-screen p-2 overflow-hidden">
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
        <CardContent className="h-full p-2 overflow-hidden">
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