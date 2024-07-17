import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSetById, saveStudyHistory } from '@/utils/indexedDB';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWindowSize } from '@/hooks/useWindowSize';

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
      className={`inline-block p-2 m-1 rounded border ${
        isClassified ? 'bg-gray-100' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : 'shadow'}`}
    >
      {children}
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

const DroppableCategory = memo(({ category, isActive, feedbackColor }) => {
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
    <div ref={setNodeRef} className={className}>
      {category.image && (
        <img src={category.image} alt={category.name} className="w-full h-24 object-cover mb-2" />
      )}
      <h3 className="text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>{category.name}</h3>
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
    const [remainingItems, setRemainingItems] = useState([]);
    const [shuffledCategories, setShuffledCategories] = useState([]);
    const startTimeRef = useRef(new Date());
    const { width, height } = useWindowSize();

    useEffect(() => {
      if (shuffledItems.length > 0) {
        setRemainingItems(shuffledItems);
      }
    }, [shuffledItems]);

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

          // 次のアイテムに進む（正誤に関わらず）
          setRemainingItems(prevItems => {
            const nextItems = prevItems.filter(item => item.id !== active.id);
            return nextItems;
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

    const ScoreDisplay = () => (
      <div className="flex flex-col items-center justify-center h-32">
        <div className="writing-vertical-rl text-lg font-bold mb-2 whitespace-nowrap">スコア</div>
        <div className="flex items-center">
          <span className="text-lg font-bold mr-1">:</span>
          <span className="text-lg font-bold">{quizData.score}%</span>
        </div>
      </div>
    );

    const handleRestart = useCallback(() => {
      setQuizData(prevData => ({
        ...prevData,
        isFinished: false,
        showResults: false,
        score: 0,
      }));
      setRemainingItems(shuffledItems);
      setClassifiedItems({});
      setTempFeedback({});
    }, [shuffledItems]);

    const handleFinish = useCallback(() => {
      onFinish(quizData.score);
    }, [onFinish, quizData.score]);

    const getGridSizeStyle = useCallback(() => {
      const maxWidth = width - 180; // 左側のメニューの幅を考慮
      const maxHeight = height - 150; // 上下のマージンを考慮

      const columns = 4;
      const rows = 2;

      const cellWidth = Math.floor(maxWidth / columns);
      const cellHeight = Math.floor(maxHeight / rows);

      return {
        gridTemplateColumns: `repeat(${columns}, ${cellWidth}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
        gap: '1rem',
      };
    }, [width, height]);

    const gridStyle = useMemo(() => getGridSizeStyle(), [getGridSizeStyle]);

    if (isLoading) return <div>読み込み中...</div>;
    if (error) return <div>{error}</div>;
  
    return (
      <div className="flex" style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100vw', maxHeight: '100vh' }}>
        <div className="flex flex-col justify-between p-4 w-20">
          <div className="flex flex-col items-center justify-between h-full">
            <div className="flex flex-col items-center justify-center h-32">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <span className="text-xl font-bold whitespace-nowrap">分類</span>
              <span className="text-xl font-bold whitespace-nowrap">クイズ</span>
            </div>
            <div className="flex flex-col items-center justify-center h-32">
              <Button variant="ghost" size="icon" onClick={handleShuffle}>
                <Shuffle />
              </Button>
            </div>
            <ScoreDisplay />
            {quizData.showResults
            }
          </div>
        </div>

        <div className="flex-grow p-4">
          <Card className="h-full">
            <CardContent className="h-full relative p-4">
              {!quizData.showResults ? (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex flex-col h-full">
                    <div className="grid mb-4" style={gridStyle}>
                      {shuffledCategories.map((category) => (
                        <DroppableCategory
                          key={category.name}
                          category={category}
                          isActive={hoveredCategory === category.name}
                          feedbackColor={tempFeedback[category.name] || categoryFeedback[category.name]}
                        />
                      ))}
                    </div>
                    <div className="flex-grow" />
                    <div className="flex justify-center">
                      {remainingItems.length > 0 && (
                        <SortableContext items={[remainingItems[0]]} strategy={verticalListSortingStrategy}>
                          <SortableItem 
                            key={remainingItems[0].id} 
                            id={remainingItems[0].id} 
                            isDragging={remainingItems[0].id === activeId}
                            isClassified={false}
                          >
                            {remainingItems[0].content}
                          </SortableItem>
                        </SortableContext>
                      )}
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
                <div className="flex flex-col items-center justify-center h-full">
                  <h2 className="text-2xl font-bold mb-4">最終スコア: {quizData.score}%</h2>
                  <div className="flex gap-4">
                    <Button onClick={handleRestart}>もう一度挑戦</Button>
                    <Button onClick={handleFinish}>終了</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
  
  export default ClassificationQuiz;