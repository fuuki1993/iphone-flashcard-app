import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, updateSessionState } from '@/utils/firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useBaseQuiz } from './useBaseQuiz';
import { getFirestore, writeBatch, doc } from "firebase/firestore";

/**
 * =============================================
 * 多肢選択クイズフック
 * =============================================
 */

/**
 * @hook useMultipleChoiceQuiz
 * @description 多肢選択クイズの状態管理と機能を提供するカスタムフック
 * @param {string} setId - クイズセットのID
 * @param {string} title - クイズセットのタイトル
 * @param {Object} sessionState - 保存されたセッション状態
 * @param {Function} onFinish - クイズ終了時のコールバック関数
 * @param {Function} setTodayStudyTime - 今日の学習時間を設定する関数
 * @param {Function} updateProgress - 進捗を更新する関数
 */
export const useMultipleChoiceQuiz = (setId, title, sessionState, onFinish, setTodayStudyTime, updateProgress) => {
  const { user, shuffleArray } = useBaseQuiz();

  // =============================================
  // 状態変数の定義
  // =============================================
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const startTimeRef = useRef(new Date());
  const [studiedQuestions, setStudiedQuestions] = useState(new Set());

  /**
   * QAまたはフラッシュカードの項目を統一された形式に変換する
   * @param {Object} set - クイズセット
   * @returns {Array} 統一された形式の問題配列
   */
  const convertToUnifiedFormat = useCallback((set) => {
    if (set.type === 'qa' && Array.isArray(set.qaItems)) {
      return set.qaItems.map(item => ({
        question: item.question,
        answer: item.answer,
        image: item.image
      }));
    } else if (set.type === 'flashcard' && Array.isArray(set.cards)) {
      return set.cards.map(card => ({
        question: card.front,
        answer: card.back,
        image: card.image
      }));
    } else if (Array.isArray(set.questions)) {
      // 'multiple-choice' タイプまたは他の未知のタイプの場合
      return set.questions.map(question => ({
        question: question.question,
        answer: question.answer || (question.choices && question.choices.find(c => c.isCorrect)?.text),
        image: question.image,
        choices: question.choices
      }));
    } else {
      console.error('Unknown set type or structure:', set);
      return [];
    }
  }, []);

  /**
   * 統一された形式の問題を多肢選択クイズの形式に変換する関数
   * @param {Array} unifiedItems - 統一された形式の問題配列
   * @returns {Array} 多肢選択クイズの形式に変換された問題配列
   */
  const convertToMultipleChoice = useCallback((unifiedItems) => {
    if (unifiedItems.length < 4) {
      return unifiedItems; // 4問未満の場合は変換せずに返す
    }

    return unifiedItems.map((item, index) => {
      // 現在の問題の答え以外から3つの選択肢をランダムに選ぶ
      const otherAnswers = unifiedItems
        .filter((_, i) => i !== index)
        .map(otherItem => otherItem.answer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      // 正解を含む4つの選択肢を作成し、シャッフル
      const choices = [
        { text: item.answer, isCorrect: true },
        ...otherAnswers.map(answer => ({ text: answer, isCorrect: false }))
      ].sort(() => 0.5 - Math.random());

      return {
        question: item.question,
        choices: choices,
        image: item.image
      };
    });
  }, []);

  /**
   * 質問と選択肢をシャッフルする
   * @param {Object} question - シャッフルする質問オブジェクト
   * @returns {Object} シャッフルされた質問オブジェクト
   */
  const shuffleQuestionAndChoices = useCallback((question) => {
    return {
      ...question,
      choices: shuffleArray(question.choices),
      image: question.image // 画像プロパティを保持
    };
  }, [shuffleArray]);

  // =============================================
  // 副作用
  // =============================================

  // 質問の読み込み
  useEffect(() => {
    const loadQuestions = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const cachedSet = localStorage.getItem(`multipleChoiceSet_${setId}`);
        if (cachedSet) {
          const parsedSet = JSON.parse(cachedSet);
          const unifiedItems = convertToUnifiedFormat(parsedSet);
          const convertedQuestions = convertToMultipleChoice(unifiedItems);
          setQuestions(convertedQuestions);
          if (sessionState) {
            setShuffledQuestions(sessionState.shuffledQuestions);
            setCurrentQuestionIndex(sessionState.currentQuestionIndex);
            setResults(sessionState.results);
          } else {
            const shuffledWithChoices = convertedQuestions.map(question => 
              question && Array.isArray(question.choices) ? shuffleQuestionAndChoices(question) : null
            ).filter(q => q !== null);
            const shuffled = shuffleArray(shuffledWithChoices);
            setShuffledQuestions(shuffled);
            setResults(new Array(shuffled.length).fill(null));
          }
        } else {
          let set;
          if (setId === null) {
            const allSets = await getSets(user.uid, 'multiple-choice');
            if (!Array.isArray(allSets) || allSets.length === 0) {
              throw new Error('No sets found');
            }
            set = allSets[Math.floor(Math.random() * allSets.length)];
          } else {
            set = await getSetById(user.uid, setId);
          }
          if (!set) {
            throw new Error(`Invalid set data for ID ${setId}`);
          }
          const unifiedItems = convertToUnifiedFormat(set);
          if (unifiedItems.length === 0) {
            throw new Error('No questions found');
          }
          const convertedQuestions = convertToMultipleChoice(unifiedItems);
          setQuestions(convertedQuestions);
          const shuffledWithChoices = convertedQuestions.map(question => 
            question && Array.isArray(question.choices) ? shuffleQuestionAndChoices(question) : null
          ).filter(q => q !== null);
          const shuffled = shuffleArray(shuffledWithChoices);
          setShuffledQuestions(shuffled);
          setResults(new Array(shuffled.length).fill(null));
          localStorage.setItem(`multipleChoiceSet_${setId}`, JSON.stringify(set));
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        setError(`質問の読み込み中にエラーが発生しました: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [user, setId, sessionState, convertToUnifiedFormat, convertToMultipleChoice, shuffleQuestionAndChoices, shuffleArray]);

  // セッション状態の復元
  useEffect(() => {
    if (sessionState && sessionState.studiedQuestions) {
      setStudiedQuestions(new Set(sessionState.studiedQuestions));
    }
  }, [sessionState]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'multiple-choice', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
          studiedQuestions: Array.from(studiedQuestions)
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results, user, studiedQuestions]);

  // =============================================
  // クイズ操作関数
  // =============================================

  /**
   * スコアを計算する
   * @returns {number} 計算されたスコア（0-100）
   */
  const calculateScore = useCallback(() => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [shuffledQuestions.length, results]);

  /**
   * 質問をシャッフルする
   */
  const handleShuffle = useCallback(() => {
    const shuffledWithChoices = questions.map(shuffleQuestionAndChoices);
    const shuffled = shuffleArray(shuffledWithChoices);
    setShuffledQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setResults(new Array(shuffled.length).fill(null));
    setIsLastQuestion(false);
  }, [questions, shuffleArray, shuffleQuestionAndChoices]);

  /**
   * 回答を選択する
   * @param {number} index - 選択された回答のインデックス
   */
  const handleSelect = useCallback((index) => {
    setSelectedAnswers(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

  /**
   * 回答を提出する
   */
  const handleSubmit = useCallback(() => {
    if (selectedAnswers.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
      const currentQuestion = shuffledQuestions[currentQuestionIndex];
      const isCorrect = currentQuestion.choices.every((choice, index) => 
        (selectedAnswers.includes(index) === choice.isCorrect)
      );
      const newResults = [...results];
      newResults[currentQuestionIndex] = isCorrect;
      setResults(newResults);
      setShowResult(true);
  
      // 現在の問題を studiedQuestions に追加
      setStudiedQuestions(prevStudied => new Set(prevStudied).add(currentQuestionIndex));
  
      if (currentQuestionIndex === shuffledQuestions.length - 1) {
        setIsLastQuestion(true);
      } else {
        setTimeout(() => {
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setSelectedAnswers([]);
          setShowResult(false);
        }, 1000);
      }
    }
  }, [selectedAnswers, currentQuestionIndex, shuffledQuestions, results]);

  /**
   * クイズを終了する
   */
const handleFinish = useCallback(async () => {
  if (!user) return;
  const endTime = new Date();
  const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
  const newQuestionsStudied = studiedQuestions.size - (sessionState?.studiedQuestions?.length || 0);
  const isNewSession = !sessionState;
  
  const finalScore = calculateScore();
  
  const correctQuestions = shuffledQuestions.filter((_, index) => results[index] === true);
  const incorrectQuestions = shuffledQuestions.filter((_, index) => results[index] === false);
  
  const studyHistoryEntry = {
    setId,
    title,
    type: 'multiple-choice',
    score: finalScore,
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
    const sessionStateRef = doc(db, `users/${user.uid}/sessionStates`, `${setId}_multiple-choice`);
    batch.set(sessionStateRef, {
      shuffledQuestions,
      currentQuestionIndex,
      results,
      studiedQuestions: Array.from(studiedQuestions),
      completedItems: studiedQuestions.size,
      lastStudyDate: endTime
    }, { merge: true });

    // バッチ処理を実行
    await batch.commit();
    
    setTodayStudyTime(prevTime => prevTime + studyDuration);
    onFinish(finalScore, studyDuration, newQuestionsStudied);
  } catch (error) {
    console.error("Error saving study history:", error);
  }
}, [user, setId, title, onFinish, setTodayStudyTime, sessionState, startTimeRef, calculateScore, studiedQuestions, shuffledQuestions, results, currentQuestionIndex]);

  // =============================================
  // フックの戻り値
  // =============================================
  return {
    shuffledQuestions,
    currentQuestionIndex,
    selectedAnswers,
    showResult,
    results,
    isLoading,
    error,
    isLastQuestion,
    calculateScore,
    handleFinish,
    handleShuffle,
    handleSelect,
    handleSubmit
  };
};