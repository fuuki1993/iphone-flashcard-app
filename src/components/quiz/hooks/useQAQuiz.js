/**
 * =============================================
 * QAクイズフック
 * =============================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetById, saveStudyHistory, saveSessionState, updateSessionState } from '@/utils/firebase/firestore';
import { useBaseQuiz } from './useBaseQuiz';
import { getFirestore, writeBatch, doc } from "firebase/firestore";

/**
 * @hook useQAQuiz
 * @description QAクイズの状態管理と機能を提供するカスタムフック
 * @param {string} setId - クイズセットのID
 * @param {string} title - クイズのタイトル
 * @param {string} quizType - クイズのタイプ
 * @param {Object} sessionState - セッションの状態
 * @param {Function} setTodayStudyTime - 今日の学習時間を設定する関数
 * @param {Function} onFinish - クズ終了時のコールバック関数
 * @param {Function} updateProgress - プログレスを更新する関数
 */

export const useQAQuiz = (setId, title, quizType, sessionState, setTodayStudyTime, onFinish, updateProgress) => {
  const { user, shuffleArray } = useBaseQuiz();

  // 状態変数の定義
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const startTimeRef = useRef(new Date());
  const [studiedQuestions, setStudiedQuestions] = useState(new Set());
  const [completedItems, setCompletedItems] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);

  // 質問の読み込みと初期化
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (!setId || !user) {
          throw new Error('setId is not provided or user is not authenticated');
        }
        const cachedSet = localStorage.getItem(`qaSet_${setId}`);
        let qaItems;
        if (cachedSet) {
          const parsedSet = JSON.parse(cachedSet);
          qaItems = convertToQAItems(parsedSet);
        } else {
          const set = await getSetById(user.uid, setId);
          if (!set) {
            throw new Error('Invalid set data');
          }
          qaItems = convertToQAItems(set);
          localStorage.setItem(`qaSet_${setId}`, JSON.stringify(set));
        }
        setQuestions(qaItems);

        if (sessionState) {
          // セッション状態がある場合は、その状態を復元
          setShuffledQuestions(sessionState.shuffledItems || shuffleArray([...qaItems]));
          setCurrentQuestionIndex(sessionState.currentIndex || 0);
          setResults(sessionState.results || new Array(qaItems.length).fill(null));
          setStudiedQuestions(new Set(sessionState.studiedItems || []));
          setCompletedItems(sessionState.additionalData?.completedItems || 0);
          setUserAnswers(sessionState.additionalData?.userAnswers || []);
        } else {
          // 新しいセッションの場合は、初期状態を設定
          setShuffledQuestions(shuffleArray([...qaItems]));
          setCurrentQuestionIndex(0);
          setResults(new Array(qaItems.length).fill(null));
          setStudiedQuestions(new Set());
          setCompletedItems(0);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      loadQuestions();
    }
  }, [setId, user, shuffleArray, sessionState]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        const stateToSave = {
          currentIndex: currentQuestionIndex,
          shuffledItems: shuffledQuestions,
          results,
          studiedItems: Array.from(studiedQuestions),
          additionalData: {
            userAnswers
          }
        };
        await saveSessionState(user.uid, setId, 'qa', stateToSave);
      }
    };
    saveState();
  }, [setId, user, currentQuestionIndex, shuffledQuestions, results, studiedQuestions, userAnswers]);

  /**
   * =============================================
   * ヘルパー関数
   * =============================================
   */

  /**
   * @function calculateScore
   * @description 現在のスコアを計算する
   */
  const calculateScore = useCallback(() => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [shuffledQuestions.length, results]);

  /**
   * @function handleShuffle
   * @description 質問をシャッフルし、クイズをリセットする
   */
  const handleShuffle = useCallback(() => {
    setShuffledQuestions(shuffleArray([...questions]));
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setResults(new Array(questions.length).fill(null));
    setIsLastQuestion(false);
  }, [questions, shuffleArray]);

  const handleSubmit = useCallback(() => {
    const isCorrect = userAnswer.toLowerCase() === shuffledQuestions[currentQuestionIndex].answer.toLowerCase();
    const newResults = [...results];
    newResults[currentQuestionIndex] = isCorrect;
    setResults(newResults);
    setShowAnswer(true);

    setStudiedQuestions(prevStudied => {
      const newStudied = new Set(prevStudied);
      newStudied.add(currentQuestionIndex);
      return newStudied;
    });
    setCompletedItems(prevCompleted => prevCompleted + 1);

    setUserAnswers(prevAnswers => {
      const newAnswers = [...prevAnswers];
      newAnswers[currentQuestionIndex] = userAnswer;
      return newAnswers;
    });

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setUserAnswer('');
        setShowAnswer(false);
      }, isCorrect ? 1000 : 2500);
    } else {
      setIsLastQuestion(true);
    }
  }, [userAnswer, shuffledQuestions, currentQuestionIndex, results]);

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !showAnswer) {
      event.preventDefault();
      handleSubmit();
    }
  }, [showAnswer, handleSubmit]);

  /**
   * @function handleFinish
   * @description クイズ終了時の処理を行う
   */
  const handleFinish = useCallback(async () => {
    if (!user) return;
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    const itemsStudied = studiedQuestions.size - (sessionState?.studiedItems?.length || 0);
    
    const correctItems = results.reduce((acc, result, index) => {
      if (result === true) {
        acc.push({
          questionIndex: index,
          question: shuffledQuestions[index].question,
          answer: shuffledQuestions[index].answer,
          userAnswer: userAnswers[index] || ''
        });
      }
      return acc;
    }, []);

    const incorrectItems = results.reduce((acc, result, index) => {
      if (result === false) {
        acc.push({
          questionIndex: index,
          question: shuffledQuestions[index].question,
          correctAnswer: shuffledQuestions[index].answer,
          userAnswer: userAnswers[index] || ''
        });
      }
      return acc;
    }, []);

    const score = Math.round((correctItems.length / shuffledQuestions.length) * 100);

    const studyHistoryEntry = {
      setId,
      title,
      type: 'qa',
      score,
      date: endTime.toISOString(),
      studyDuration,
      itemsStudied,
      correctItems,
      incorrectItems,
      totalItems: shuffledQuestions.length
    };

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // 学習履歴の保存
      const studyHistoryRef = doc(db, `users/${user.uid}/studyHistory`, `${setId}_${Date.now()}`);
      batch.set(studyHistoryRef, studyHistoryEntry);

      // セッション状態の更新
      const sessionStateRef = doc(db, `users/${user.uid}/sessionStates`, `${setId}_qa`);
      batch.set(sessionStateRef, {
        results,
        studiedItems: Array.from(studiedQuestions),
        lastStudyDate: endTime
      }, { merge: true });

      // バッチ処理を実行
      await batch.commit();
      
      setTodayStudyTime(prevTime => prevTime + studyDuration);
      
      // onFinish が関数である場合のみ呼び出す
      const finishCallback = typeof onFinish === 'function' ? onFinish : () => {};
      finishCallback(score, studyDuration, itemsStudied);

      if (typeof updateProgress === 'function') {
        updateProgress(setId, {
          totalItems: shuffledQuestions.length,
          completedItems: studiedQuestions.size,
          correctItems: correctItems.length,
          incorrectItems: incorrectItems.length,
        });
      }

      // 間違えた問題のインデックスを設定
      const incorrectQuestionIndices = results.reduce((acc, result, index) => {
        if (result === false) acc.push(index);
        return acc;
      }, []);
      setIncorrectQuestions(incorrectQuestionIndices);

    } catch (error) {
      console.error("Error saving study history:", error);
    }
  }, [setId, title, onFinish, setTodayStudyTime, studiedQuestions, user, sessionState, startTimeRef, shuffledQuestions, updateProgress, results, userAnswers]);

  const startReview = useCallback(() => {
    setReviewMode(true);
    setShuffledQuestions(shuffledQuestions.filter((_, index) => incorrectQuestions.includes(index)));
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setResults(new Array(incorrectQuestions.length).fill(null));
    setIsLastQuestion(false);
  }, [incorrectQuestions, shuffledQuestions]);

  // Helper function to convert set data to QA items
  const convertToQAItems = (set) => {
    if (set.type === 'qa') {
      return set.qaItems;
    } else if (set.type === 'flashcard') {
      return set.cards.map(card => ({
        question: card.front || '',
        answer: card.back || '',
        image: card.image || null
      }));
    } else {
      throw new Error('Invalid set type');
    }
  };

  // フックから返す値
  return {
    shuffledQuestions,
    currentQuestionIndex,
    userAnswer,
    setUserAnswer,
    showAnswer,
    results,
    isLoading,
    error,
    isLastQuestion,
    calculateScore,
    handleShuffle,
    handleSubmit,
    handleFinish,
    completedItems,
    totalItems: shuffledQuestions.length,
    handleKeyPress,
    reviewMode,
    startReview,
    incorrectQuestions,
  };
};