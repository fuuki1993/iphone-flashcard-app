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
 * @param {Function} onFinish - クイズ終了時のコールバック関数
 */

export const useQAQuiz = (setId, title, quizType, sessionState, setTodayStudyTime, onFinish) => {
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

  /**
   * =============================================
   * 副作用
   * =============================================
   */

  // 質問の読み込み
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (!setId || !user) {
          throw new Error('setId is not provided or user is not authenticated');
        }
        const cachedSet = localStorage.getItem(`qaSet_${setId}`);
        if (cachedSet) {
          const parsedSet = JSON.parse(cachedSet);
          setQuestions(parsedSet.qaItems || parsedSet.cards);
          setShuffledQuestions(shuffleArray([...parsedSet.qaItems || parsedSet.cards]));
        } else {
          const set = await getSetById(user.uid, setId);
          if (!set) {
            throw new Error('Invalid set data');
          }
          let qaItems;
          if (set.type === 'qa') {
            qaItems = set.qaItems;
          } else if (set.type === 'flashcard') {
            qaItems = set.cards.map(card => ({
              question: card.front,
              answer: card.back,
              image: card.image
            }));
          } else {
            throw new Error('Invalid set type');
          }
          setQuestions(qaItems);
          setShuffledQuestions(shuffleArray([...qaItems]));
          localStorage.setItem(`qaSet_${setId}`, JSON.stringify(set));
        }
        setCurrentQuestionIndex(0);
        setResults([]);
        setStudiedQuestions(new Set());
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
  }, [setId, user, shuffleArray]);

  // セッション状態の復元
  useEffect(() => {
    if (sessionState) {
      setShuffledQuestions(sessionState.shuffledQuestions || []);
      setCurrentQuestionIndex(sessionState.currentQuestionIndex || 0);
      setResults(sessionState.results || []);
      setStudiedQuestions(new Set(sessionState.studiedQuestions || []));
    }
  }, [sessionState]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'qa', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
          studiedQuestions: Array.from(studiedQuestions)
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results, user, studiedQuestions]);

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

  /**
   * @function handleSubmit
   * @description ユーザーの回答を処理し、結果を更新する
   */
  const handleSubmit = useCallback(() => {
    const isCorrect = userAnswer.toLowerCase() === shuffledQuestions[currentQuestionIndex].answer.toLowerCase();
    const newResults = [...results];
    newResults[currentQuestionIndex] = isCorrect;
    setResults(newResults);
    setShowAnswer(true);

    setStudiedQuestions(prevStudied => new Set(prevStudied).add(currentQuestionIndex));

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setUserAnswer('');
        setShowAnswer(false);
      }, 1000);
    } else {
      setIsLastQuestion(true);
    }
  }, [userAnswer, shuffledQuestions, currentQuestionIndex, results]);

  /**
   * @function handleFinish
   * @description クイズ終了時の処理を行う
   */
  const handleFinish = useCallback(async () => {
    if (user) {
      const score = calculateScore();
      const endTime = new Date();
      const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
      const newQuestionsStudied = studiedQuestions.size - (sessionState?.studiedQuestions?.length || 0);
      const isNewSession = !sessionState;
      
      const correctQuestions = shuffledQuestions.filter((_, index) => results[index] === true);
      const incorrectQuestions = shuffledQuestions.filter((_, index) => results[index] === false);
      
      const studyHistoryEntry = {
        setId,
        title,
        type: 'qa',
        score,
        date: endTime.toISOString(),
        studyDuration,
        questionsStudied: newQuestionsStudied,
        isNewSession,
        correctQuestions,
        incorrectQuestions
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
          completedItems: studiedQuestions.size,
          lastStudyDate: endTime
        }, { merge: true });

        // バッチ処理を実行
        await batch.commit();
        
        setTodayStudyTime(prevTime => prevTime + studyDuration);
        onFinish(score, studyDuration, newQuestionsStudied);
      } catch (error) {
        console.error("Error saving study history:", error);
      }
    }
  }, [setId, title, calculateScore, onFinish, setTodayStudyTime, studiedQuestions, user, sessionState, startTimeRef, shuffledQuestions, results]);

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
    handleFinish
  };
};