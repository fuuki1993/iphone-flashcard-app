import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSetById, saveStudyHistory } from '@/utils/indexedDB';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  }), [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 mb-2 rounded border ${
        isClassified ? 'bg-gray-100' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : 'shadow'}`}
    >
      {children}
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

const DroppableCategory = memo(({ category, isActive, feedbackColor, isLeftSide }) => {
  const { setNodeRef } = useDroppable({
    id: category,
    data: { category },
  });

  const className = useMemo(() => `
    flex items-center justify-center h-32 px-1 rounded transition-all duration-300
    ${feedbackColor ? feedbackColor : 'bg-gray-100'}
    ${isActive ? 'border-2 border-blue-500' : ''}
    ${isLeftSide
      ? `w-12 ${isActive ? 'w-16 ml-auto' : ''}`
      : `w-12 ${isActive ? 'w-16 mr-0 ml-auto' : ''}`
    }
  `, [feedbackColor, isActive, isLeftSide]);

  return (
    <div ref={setNodeRef} className={className}>
      <h3 className="text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>{category}</h3>
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType }) => {
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
          const set = await getSetById(parseInt(setId));
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
            const categories = set.categories.map(c => c.name);
            setQuizData({
              question: `以下の項目を正しく分類してください。`,
              categories: categories,
              items: newItems,
              correctClassification: newCorrectClassification,
              isFinished: false,
              showResults: false,
              score: 0,
            });
            setShuffledItems(shuffled);
            setShuffledCategories(shuffleArray(categories));
          } else {
            throw new Error('Invalid data structure');
          }
        } catch (error) {
          console.error("Error loading question:", error);
          setError('質問の読み込中にエラーが発生しまた。');
        } finally {
          setIsLoading(false);
        }
      };
      loadQuestion();
    }, [setId]);

    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const handleShuffle = useCallback(() => {
      setShuffledItems(shuffleArray(shuffledItems));
      setShuffledCategories(shuffleArray(shuffledCategories));
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

          // Update classifiedItems
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

          return {
            ...prev,
            items: updatedItems,
            score: newScore,
            isFinished: isFinished,
            showResults: isFinished,
          };
        });

        // Remove the item from shuffledItems
        setShuffledItems(prev => prev.filter(item => item.id !== active.id));
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

    const categories = useMemo(() => {
      const middleIndex = Math.ceil(shuffledCategories.length / 2);
      return {
        left: shuffledCategories.slice(0, middleIndex),
        right: shuffledCategories.slice(middleIndex)
      };
    }, [shuffledCategories]);
  
    const renderCategory = useCallback((category, isLeftSide) => (
      <DroppableCategory 
        key={category} 
        category={category} 
        isActive={hoveredCategory === category}
        feedbackColor={tempFeedback[category] || categoryFeedback[category]}
        isLeftSide={isLeftSide}
      >
        <div className={isLeftSide ? "ml-2 mt-1" : "mr-2 mt-1 text-right"}>
          {classifiedItems[category]?.map(itemId => (
            <div key={itemId} className="text-xs mb-1">
              {quizData.items.find(item => item.id === itemId)?.content}
            </div>
          ))}
        </div>
      </DroppableCategory>
    ), [hoveredCategory, categoryFeedback, tempFeedback, classifiedItems, quizData.items]);
  
    const handleRestart = useCallback(() => {
      setQuizData(prevData => ({
        ...prevData,
        items: prevData.items.map(item => ({ ...item, category: null, isClassified: false })),
        isFinished: false,
        showResults: false,
        score: 0,
      }));
      setCategoryFeedback({});
    }, []);

    const calculateScore = () => {
      const totalItems = quizData.items.length;
      const correctItems = quizData.items.filter(item => 
        quizData.correctClassification[item.category]?.includes(item.content)
      ).length;
      return Math.round((correctItems / totalItems) * 100);
    };

    const handleFinish = async () => {
      const score = calculateScore();
      const endTime = new Date();
      const studyDuration = Math.round((endTime - startTimeRef.current) / 1000); // 秒単位で計算
      await saveStudyHistory(setId, title, 'classification', score, endTime, studyDuration);
      onFinish(score);
    };

    if (isLoading) return <div>読み込み中...</div>;
    if (error) return <div>{error}</div>;
    if (!quizData.question) return <div>質問がありません。</div>;
  
    return (
      <div className="max-w-md mx-auto relative">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className="text-xl font-bold">分類クイズ</h2>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
              <Shuffle />
            </Button>
            <div className="text-lg font-bold">スコア: {quizData.score}%</div>
          </div>
        </div>
  
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{quizData.showResults ? "結果" : quizData.question}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] relative p-0">
            {!quizData.showResults ? (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex justify-between w-full relative">
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
                    {categories.left.map((category, index) => (
                      <div key={category} className={index !== 0 ? "mt-4" : ""}>
                        {renderCategory(category, true)}
                      </div>
                    ))}
                  </div>
                  <div className="w-full px-16">
                    <SortableContext items={shuffledItems} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-2 gap-2">
                        {shuffledItems.map((item) => (
                          <SortableItem 
                            key={item.id} 
                            id={item.id} 
                            isDragging={item.id === activeId}
                            isClassified={false}
                          >
                            {item.content}
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between items-end">
                    {categories.right.map((category, index) => (
                      <div key={category} className={index !== 0 ? "mt-4" : ""}>
                        {renderCategory(category, false)}
                      </div>
                    ))}
                  </div>
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white p-2 rounded border shadow-lg">
                      {quizData.items.find(item => item.id === activeId)?.content}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <h2 className="text-2xl font-bold mb-4">最終スコア: {quizData.score}%</h2>
                <div className="flex gap-4">
                  <Button onClick={handleRestart}>
                    もう一度挑戦する
                  </Button>
                  <Button onClick={handleFinish}>
                    終了する
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  export default ClassificationQuiz;