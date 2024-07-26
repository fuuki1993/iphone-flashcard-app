import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetById, saveSessionState, saveStudyHistory, updateSessionState } from '@/utils/firebase/firestore';
import { useBaseQuiz } from './useBaseQuiz';
import { getFirestore, writeBatch, doc } from "firebase/firestore";

/**
 * =============================================
 * 分類クイズフック
 * =============================================
 */

/**
 * @hook useClassificationQuiz
 * @description 分類クイズの状態と機能を管理するカスタムフック
 * @param {string} setId - クイズセットのID
 * @param {Object} sessionState - 現在のセッション状態
 * @param {Function} onFinish - クイズ終了時のコールバック関数
 * @param {Function} setTodayStudyTime - 今日の学習時間を設定する関数
 * @param {Function} updateProgress - 進捗を更新する関数
 */
export const useClassificationQuiz = (setId, sessionState, onFinish, setTodayStudyTime, updateProgress) => {
  const { user, shuffleArray } = useBaseQuiz();

  // 状態変数の定義
  const [quizData, setQuizData] = useState(() => {
    if (sessionState && sessionState.quizData) {
      return sessionState.quizData;
    }
    return {
      question: null,
      categories: [],
      items: [],
      correctClassification: {},
      isFinished: false,
      showResults: false,
      score: 0,
    };
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
  const [studiedItems, setStudiedItems] = useState(new Set());
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [incorrectAnswers, setIncorrectAnswers] = useState({});
  const [categoryImages, setCategoryImages] = useState({});

  /**
   * =============================================
   * データ読み込みと初期化
   * =============================================
   */

  // クイズデータの読み込み
  useEffect(() => {
    const loadQuestion = async () => {
      try {
        setIsLoading(true);
        if (!setId || !user) {
          throw new Error('setIdが提供されていないか、ユーザーが認証されていません');
        }
        const cachedSet = localStorage.getItem(`classificationSet_${setId}`);
        if (cachedSet) {
          const parsedSet = JSON.parse(cachedSet);
          initializeQuizData(parsedSet);
        } else {
          const set = await getSetById(user.uid, setId);
          if (set && Array.isArray(set.categories)) {
            initializeQuizData(set);
            localStorage.setItem(`classificationSet_${setId}`, JSON.stringify(set));
          } else {
            throw new Error('無効なデータ構造です');
          }
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
  }, [setId, sessionState, user, shuffleArray]);

  /**
   * @function initializeQuizData
   * @description クイズデータを初期化する
   * @param {Object} set - クイズセットデータ
   */  
  const initializeQuizData = useCallback((set) => {
    if (sessionState && sessionState.quizData) {
      setQuizData(sessionState.quizData);
      setShuffledItems(sessionState.shuffledItems || []);
      setShuffledCategories(sessionState.shuffledCategories || []);
      setClassifiedItems(sessionState.classifiedItems || {});
      setCurrentItemIndex(sessionState.currentItemIndex || 0);
      setUnclassifiedItems(sessionState.unclassifiedItems || []);
      setStudiedItems(new Set(sessionState.studiedItems || []));
      setCorrectAnswers(sessionState.correctAnswers || {});
      setIncorrectAnswers(sessionState.incorrectAnswers || {});
      setCategoryImages(sessionState.categoryImages || {});
      startTimeRef.current = new Date(sessionState.startTime || new Date());
    } else if (set && set.categories) {
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

      // カテゴリーの画像URLを保存
      const newCategoryImages = set.categories.reduce((acc, cat) => {
        if (cat.image) {
          acc[cat.name] = cat.image;
        }
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
      setCategoryImages(newCategoryImages);
      startTimeRef.current = new Date();
      setStudiedItems(new Set());
      setCorrectAnswers({});
      setIncorrectAnswers({});
    }
  }, [sessionState, shuffleArray]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (user && quizData.items.length > 0) {
        try {
          const stateToSave = {
            quizData,
            shuffledItems,
            shuffledCategories,
            classifiedItems,
            currentItemIndex,
            unclassifiedItems,
            studiedItems: Array.from(studiedItems),
            correctAnswers,
            incorrectAnswers,
            categoryImages,
            startTime: startTimeRef.current.toISOString(),
          };

          await saveSessionState(user.uid, setId, 'classification', stateToSave);
        } catch (error) {
          console.error("セッション状態の保存中にエラーが発生しました:", error);
        }
      }
    };
    saveState();
  }, [user, setId, quizData, shuffledItems, shuffledCategories, classifiedItems, currentItemIndex, unclassifiedItems, studiedItems, correctAnswers, incorrectAnswers, categoryImages]);

  /**
   * =============================================
   * クイズ操作関連の関数
   * =============================================
   */

  /**
   * @function handleShuffle
   * @description アイテムとカテゴリーをシャッフルする
   */
  const handleShuffle = useCallback(() => {
    setUnclassifiedItems(prevItems => shuffleArray(prevItems));
    setShuffledCategories(shuffleArray(shuffledCategories));
    setCurrentItemIndex(0);
  }, [shuffleArray, shuffledCategories]);

  /**
   * @function handleDragStart
   * @description ドラッグ開始時の処理
   */
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);

  /**
   * @function handleDragOver
   * @description ドラッグ中の処理
   */
  const handleDragOver = useCallback((event) => {
    const { over } = event;
    setHoveredCategory(over ? over.id : null);
  }, []);

  /**
   * @function handleDragEnd
   * @description ドラッグ終了時の処理
   */
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

        const newUnclassifiedItems = updatedItems.filter(item => !item.isClassified);
        setUnclassifiedItems(newUnclassifiedItems);

        setCurrentItemIndex(prevIndex => {
          if (newUnclassifiedItems.length > 0) {
            return (prevIndex + 1) % newUnclassifiedItems.length;
          }
          return 0;
        });

        setStudiedItems(prevStudied => new Set(prevStudied).add(active.id));

        if (isCorrect) {
          setCorrectAnswers(prevCorrect => ({
            ...prevCorrect,
            [over.id]: [...(prevCorrect[over.id] || []), active.id]
          }));
        } else {
          setIncorrectAnswers(prevIncorrect => ({
            ...prevIncorrect,
            [over.id]: [...(prevIncorrect[over.id] || []), active.id]
          }));
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
  }, []);

  /**
   * @function handleRestart
   * @description クイズを再開する
   */
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

          // カテゴリーの画像URLを保存
          const newCategoryImages = set.categories.reduce((acc, cat) => {
            if (cat.image) {
              acc[cat.name] = cat.image;
            }
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
          setStudiedItems(new Set());
          setCorrectAnswers({});
          setIncorrectAnswers({});
          setCategoryImages(newCategoryImages);
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

  /**
   * @function handleFinish
   * @description クイズを終了し、結果を保存する
   */
  const handleFinish = useCallback(async () => {
    if (!user) return;
    const score = quizData.score;
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    const newItemsStudied = studiedItems.size - (sessionState?.studiedItems?.length || 0);
    const isNewSession = !sessionState;
    
    const studyHistoryEntry = {
      setId,
      title: quizData.title || 'Untitled Quiz',
      type: 'classification',
      score,
      date: endTime.toISOString(),
      studyDuration,
      itemsStudied: newItemsStudied,
      isNewSession,
      correctAnswers: Object.fromEntries(Object.entries(correctAnswers).map(([k, v]) => [k, Array.from(v)])),
      incorrectAnswers: Object.fromEntries(Object.entries(incorrectAnswers).map(([k, v]) => [k, Array.from(v)]))
    };

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // 学習履歴の保存
      const studyHistoryRef = doc(db, `users/${user.uid}/studyHistory`, `${setId}_${Date.now()}`);
      batch.set(studyHistoryRef, studyHistoryEntry);

      // セッション状態の更新
      const sessionStateRef = doc(db, `users/${user.uid}/sessionStates`, `${setId}_classification`);
      batch.set(sessionStateRef, {
        completedItems: studiedItems.size,
        lastStudyDate: endTime
      }, { merge: true });

      // バッチ処理を実行
      await batch.commit();

      setTodayStudyTime(prevTime => prevTime + studyDuration);
      onFinish(score, studyDuration, newItemsStudied);
      if (typeof updateProgress === 'function') {
        updateProgress(setId, {
          totalItems: quizData.items.length,
          completedItems: studiedItems.size,
          correctItems: Object.values(correctAnswers).flat().length,
          incorrectItems: Object.values(incorrectAnswers).flat().length,
        });
      }
    } catch (error) {
      console.error("学習履歴の保存中にエラーが発生しました:", error);
      setError("学習履歴の保存中にエラーが発生しました。後でもう一度お試しください。");
    }
  }, [user, setId, quizData, onFinish, setTodayStudyTime, studiedItems, sessionState, startTimeRef, updateProgress, correctAnswers, incorrectAnswers]);

  /**
   * =============================================
   * 副作用
   * =============================================
   */
   
  // 一時的なフィードバックの管理
  useEffect(() => {
    if (Object.keys(tempFeedback).length > 0) {
      const timer = setTimeout(() => {
        setTempFeedback({});
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [tempFeedback]);

  // その他の副作用
  useEffect(() => {
    if (quizData.items.length > 0) {
      const newUnclassifiedItems = quizData.items.filter(item => !item.isClassified);
      setUnclassifiedItems(newUnclassifiedItems);
      if (newUnclassifiedItems.length > 0 && currentItemIndex >= newUnclassifiedItems.length) {
        setCurrentItemIndex(0);
      }
    }
  }, [quizData.items, currentItemIndex]);

  // フックから返す値
  return {
    quizData,
    isLoading,
    error,
    activeId,
    hoveredCategory,
    tempFeedback,
    categoryFeedback,
    shuffledItems,
    classifiedItems,
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
  };
};