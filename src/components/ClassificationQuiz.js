import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSetById } from '@/utils/indexedDB';
import { ArrowLeft } from 'lucide-react';
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

const DroppableCategory = memo(({ category, children, isActive, feedbackColor, isLeftSide }) => {
  const { setNodeRef } = useDroppable({
    id: category,
    data: { category },
  });

  const className = useMemo(() => `flex items-center h-32 px-2 rounded transition-colors duration-300 ${
    feedbackColor ? feedbackColor : 'bg-gray-100'
  } ${isActive ? 'border-2 border-blue-500' : ''}`, [feedbackColor, isActive]);

  return (
    <div ref={setNodeRef} className={className}>
      {isLeftSide && isActive && <div className="mr-2 overflow-y-auto max-h-full">{children}</div>}
      <h3 className="text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>{category}</h3>
      {!isLeftSide && isActive && <div className="ml-2 overflow-y-auto max-h-full">{children}</div>}
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';

const ClassificationQuiz = ({ onFinish, onBack, setId, title, quizType }) => {
    const [quizData, setQuizData] = useState({
      question: null,
      userClassification: {},
      unclassifiedItems: [],
      correctClassification: {},
      isFinished: false,
      showResults: false,
      score: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [hoveredCategory, setHoveredCategory] = useState(null);
    const hoveredCategoryRef = useRef(null);
    const [categoryFeedback, setCategoryFeedback] = useState({});
  
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );
  
    const calculateScore = () => {
        return quizData.score;
      };

    const handleDragStart = useCallback((event) => {
      setActiveId(event.active.id);
    }, []);
  
    const handleDragOver = useCallback((event) => {
      const newHoveredCategory = event.over ? event.over.id : null;
      if (newHoveredCategory !== hoveredCategory) {
        setHoveredCategory(newHoveredCategory);
      }
    }, [hoveredCategory]);
  
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
      
        if (over && active.id !== over.id) {
          setQuizData((prev) => {
            const activeItem = prev.unclassifiedItems.find(item => item.id === active.id);
            
            if (activeItem) {
              const toCategory = over.id;
              const isCorrect = prev.correctClassification[toCategory]?.includes(activeItem.content) ?? false;
      
              const newUserClassification = {
                ...prev.userClassification,
                [toCategory]: [...(prev.userClassification[toCategory] || []), { ...activeItem, category: toCategory }]
              };
              const newUnclassifiedItems = prev.unclassifiedItems.filter(item => item.id !== active.id);
              
              const totalClassified = Object.values(newUserClassification).flat().length;
              const correctClassified = Object.values(newUserClassification).flat().filter(item => 
                prev.correctClassification[item.category]?.includes(item.content) ?? false
              ).length;
              const newScore = totalClassified > 0 ? Math.round((correctClassified / totalClassified) * 100) : 0;
              
              const isFinished = newUnclassifiedItems.length === 0;
      
              // カテゴリーフィードバックの更新をここで行う
              setCategoryFeedback(prevFeedback => ({
                ...prevFeedback,
                [toCategory]: isCorrect ? 'bg-green-200' : 'bg-red-200'
              }));
      
              return {
                ...prev,
                userClassification: newUserClassification,
                unclassifiedItems: newUnclassifiedItems,
                score: newScore,
                isFinished: isFinished,
                showResults: isFinished,
              };
            }
            return prev;
          });
        }
      
        setActiveId(null);
        setHoveredCategory(null);
      }, []);
  
    useEffect(() => {
      const loadQuestion = async () => {
        try {
          setIsLoading(true);
          const set = await getSetById(parseInt(setId));
          if (set && Array.isArray(set.categories)) {
            const newQuestion = {
              question: `以下の項目を正しく分類してください。`,
              categories: set.categories.map(c => c.name),
              items: set.categories.flatMap(c => c.items.map((item, index) => ({ id: `${c.name}-${index}`, content: item, category: c.name }))),
            };
            const newCorrectClassification = set.categories.reduce((acc, cat) => {
              acc[cat.name] = cat.items;
              return acc;
            }, {});
            const newUserClassification = Object.fromEntries(newQuestion.categories.map(category => [category, []]));
  
            setQuizData({
              question: newQuestion,
              userClassification: newUserClassification,
              unclassifiedItems: newQuestion.items,
              correctClassification: newCorrectClassification,
              isFinished: false,
              showResults: false,
              score: 0,
            });
          } else {
            throw new Error('Invalid data structure');
          }
        } catch (error) {
          console.error("Error loading question:", error);
          setError('質問の読み込み中にエラーが発生しました。');
        } finally {
          setIsLoading(false);
        }
      };
      loadQuestion();
    }, [setId]);
  
    useEffect(() => {
        if (Object.keys(categoryFeedback).length > 0) {
          const timer = setTimeout(() => {
            setCategoryFeedback({});
          }, 500);
          return () => clearTimeout(timer);
        }
      }, [categoryFeedback]);
  
    const handleRestart = useCallback(() => {
      setQuizData(prev => ({
        ...prev,
        userClassification: Object.fromEntries(prev.question.categories.map(category => [category, []])),
        unclassifiedItems: prev.question.items,
        isFinished: false,
        showResults: false,
        score: 0,
      }));
    }, []);
  
    const renderCategory = useCallback((category, isLeftSide) => (
      <DroppableCategory 
        key={category} 
        category={category} 
        isActive={hoveredCategory === category}
        feedbackColor={categoryFeedback[category]}
        isLeftSide={isLeftSide}
      >
        <SortableContext items={quizData.userClassification[category] || []} strategy={verticalListSortingStrategy}>
          <div className="flex flex-row-reverse">
            {(quizData.userClassification[category] || []).map((item) => (
              <SortableItem 
                key={item.id} 
                id={item.id} 
                isDragging={item.id === activeId}
                isClassified={true}
              >
                {item.content}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DroppableCategory>
    ), [quizData.userClassification, hoveredCategory, activeId, categoryFeedback]);
  
    const categories = useMemo(() => {
      if (!quizData.question) return { left: [], right: [] };
      const middleIndex = Math.ceil(quizData.question.categories.length / 2);
      return {
        left: quizData.question.categories.slice(0, middleIndex),
        right: quizData.question.categories.slice(middleIndex)
      };
    }, [quizData.question]);
  
    const handleFinish = async () => {
        const score = calculateScore();
        const endTime = new Date();
        await saveStudyHistory(setId, setTitle, 'classification', score, endTime);
        onFinish(score);
      };
  
    if (isLoading) return <div>読み込み中...</div>;
    if (error) return <div>{error}</div>;
    if (!quizData.question) return <div>質問がありません。</div>;
  
    return (
      <div className="p-4 max-w-md mx-auto relative">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className="text-xl font-bold">分類クイズ</h2>
          <div className="text-lg font-bold">スコア: {quizData.score}%</div>
        </div>
  
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{quizData.showResults ? "結果" : quizData.question.question}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] relative">
            {!quizData.showResults ? (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-start pt-4 gap-2">
                  {categories.left.map(category => renderCategory(category, true))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-start pt-4 gap-2">
                  {categories.right.map(category => renderCategory(category, false))}
                </div>
                <div className="flex justify-center items-center h-full">
                  <SortableContext items={quizData.unclassifiedItems} strategy={verticalListSortingStrategy}>
                    <div className="w-2/3 max-h-[250px] overflow-y-auto grid grid-cols-2 gap-2">
                      {quizData.unclassifiedItems.map((item) => (
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
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white p-2 rounded border shadow-lg">
                      {quizData.unclassifiedItems.find(item => item.id === activeId)?.content ||
                       Object.values(quizData.userClassification).flat().find(item => item.id === activeId)?.content}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
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