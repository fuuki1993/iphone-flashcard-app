import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetById, getSets, saveSessionState } from '@/utils/firebase/firestore';
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
 * @param {Function} setTodayStudyTime - 今日の学習時間を設定する数
 * @param {Function} onFinish - クイズ終了時のコールバック関数
 * @param {Function} updateProgress - 進捗を更新する関数
 */
export const useMultipleChoiceQuiz = (setId, title, sessionState, setTodayStudyTime, onFinish, updateProgress) => {
  const { user, shuffleArray } = useBaseQuiz();

  // =============================================
  // 状態変数の定義
  // =============================================
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState(sessionState?.shuffledItems || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(sessionState?.currentIndex || 0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState(sessionState?.results || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const startTimeRef = useRef(new Date());
  const [studiedQuestions, setStudiedQuestions] = useState(new Set(sessionState?.studiedItems || []));
  const [correctAnswersCount, setCorrectAnswersCount] = useState([]);

  /**
   * QAまたはフラッシュカードの項目を統一された形式に変換する
   * @param {Object} set - クイズセット
   * @returns {Array} 統一された形式の問配列
   */
  const convertToUnifiedFormat = useCallback((set) => {
    if (set.type === 'qa' && Array.isArray(set.qaItems)) {
      return set.qaItems.map(item => ({
        question: item.question || '',
        answer: item.answer,
        image: item.image
      }));
    } else if (set.type === 'flashcard' && Array.isArray(set.cards)) {
      return set.cards.map(card => ({
        question: card.front || '',
        answer: card.back,
        image: card.image
      }));
    } else if (Array.isArray(set.questions)) {
      return set.questions.map(question => ({
        question: question.question || '',
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
      return unifiedItems;
    }

    return unifiedItems.map((item, index) => {
      const otherAnswers = unifiedItems
        .filter((_, i) => i !== index)
        .map(otherItem => otherItem.answer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const correctAnswers = Array.isArray(item.answer) ? item.answer : [item.answer];
      const choices = [
        ...correctAnswers.map(answer => ({ text: answer, isCorrect: true })),
        ...otherAnswers.map(answer => ({ text: answer, isCorrect: false }))
      ].sort(() => 0.5 - Math.random());

      return {
        question: item.question || '',
        choices: choices,
        image: item.image,
        correctAnswersCount: correctAnswers.length
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
            setShuffledQuestions(sessionState.shuffledItems);
            setCurrentQuestionIndex(sessionState.currentIndex);
            setResults(sessionState.results);
          } else {
            const shuffledWithChoices = convertedQuestions.map(question => 
              question && (question.question || question.image) && Array.isArray(question.choices) ? shuffleQuestionAndChoices(question) : null
            ).filter(q => q !== null);
            const shuffled = shuffleArray(shuffledWithChoices);
            setShuffledQuestions(shuffled);
            setResults(new Array(shuffled.length).fill(null));
          }
          setCorrectAnswersCount(convertedQuestions.map(q => q.correctAnswersCount));
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
            question && (question.question || question.image) && Array.isArray(question.choices) ? shuffleQuestionAndChoices(question) : null
          ).filter(q => q !== null);
          const shuffled = shuffleArray(shuffledWithChoices);
          setShuffledQuestions(shuffled);
          setResults(new Array(shuffled.length).fill(null));
          setCorrectAnswersCount(convertedQuestions.map(q => q.correctAnswersCount));
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
    if (sessionState) {
      if (sessionState.results) {
        setResults(sessionState.results);
      }
      if (sessionState.studiedItems) {
        setStudiedQuestions(new Set(sessionState.studiedItems));
      }
      if (sessionState.additionalData) {
        setCurrentQuestionIndex(sessionState.currentIndex || 0);
        setShuffledQuestions(sessionState.shuffledItems || []);
        setSelectedAnswers(sessionState.additionalData.selectedAnswers || []);
        setShowResult(sessionState.additionalData.showResult || false);
        setIsLastQuestion(sessionState.additionalData.isLastQuestion || false);
        // stateの中のstudiedQuestionsも設定（必要に応じて）
        if (sessionState.additionalData.studiedItems) {
          setStudiedQuestions(new Set(sessionState.additionalData.studiedItems));
        }
      }
    }
  }, [sessionState]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        const stateToSave = {
          currentIndex: currentQuestionIndex,
          shuffledItems: shuffledQuestions,
          results: results,
          studiedItems: Array.from(studiedQuestions),
          additionalData: {
            selectedAnswers,
            showResult,
          }
        };
        try {
          await saveSessionState(user.uid, setId, 'multiple-choice', stateToSave);
        } catch (error) {
          console.error("Error saving session state:", error);
        }
      }
    };
    saveState();
  }, [setId, user, currentQuestionIndex, shuffledQuestions, results, studiedQuestions, selectedAnswers, showResult]);

  // =============================================
  // クイズ操作関数
  // =============================================

  /**
   * スコアを計算する
   * @returns {number} 計算��れたスコア（0-100）
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
    const currentCorrectCount = correctAnswersCount[currentQuestionIndex];
    setSelectedAnswers(prev => {
      if (currentCorrectCount === 1) {
        // 単一回答の場合、新しい選択に切り替える
        return index;
      } else {
        // 複数回答の場合
        const prevAnswers = Array.isArray(prev) ? prev : [];
        return prevAnswers.includes(index)
          ? prevAnswers.filter(i => i !== index)
          : [...prevAnswers, index];
      }
    });
  }, [correctAnswersCount, currentQuestionIndex]);

  /**
   * 回答を提出する
   */
  const handleSubmit = useCallback(() => {
    if (selectedAnswers.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
      const currentQuestion = shuffledQuestions[currentQuestionIndex];
      const isCorrect = currentQuestion.choices.every((choice, index) => 
        (Array.isArray(selectedAnswers[currentQuestionIndex]) 
          ? selectedAnswers[currentQuestionIndex].includes(index)
          : selectedAnswers[currentQuestionIndex] === index) === choice.isCorrect
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
        }, isCorrect ? 1000 : 2500);
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
    const newQuestionsStudied = studiedQuestions.size - (sessionState?.studiedItems?.length || 0);
    
    const correctItems = results.reduce((acc, result, index) => {
      if (result === true) {
        acc.push({
          questionIndex: index,
          question: shuffledQuestions[index].question,
          correctAnswer: shuffledQuestions[index].choices.filter(c => c.isCorrect).map(c => c.text),
          userAnswer: shuffledQuestions[index].choices
            .filter((_, i) => Array.isArray(selectedAnswers[index]) 
              ? selectedAnswers[index].includes(i)
              : selectedAnswers[index] === i)
            .map(c => c.text)
        });
      }
      return acc;
    }, []);

    const incorrectItems = results.reduce((acc, result, index) => {
      if (result === false) {
        acc.push({
          questionIndex: index,
          question: shuffledQuestions[index].question,
          correctAnswer: shuffledQuestions[index].choices.filter(c => c.isCorrect).map(c => c.text),
          userAnswer: shuffledQuestions[index].choices
            .filter((_, i) => Array.isArray(selectedAnswers[index]) 
              ? selectedAnswers[index].includes(i)
              : selectedAnswers[index] === i)
            .map(c => c.text)
        });
      }
      return acc;
    }, []);

    const score = Math.round((correctItems.length / shuffledQuestions.length) * 100);

    const studyHistoryEntry = {
      setId,
      title,
      type: 'multiple-choice',
      score,
      date: endTime.toISOString(),
      studyDuration,
      itemsStudied: newQuestionsStudied,
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
      const sessionStateRef = doc(db, `users/${user.uid}/sessionStates`, `${setId}_multiple-choice`);
      batch.set(sessionStateRef, {
        results,
        studiedItems: Array.from(studiedQuestions),
        lastStudyDate: endTime
      }, { merge: true });

      // バッチ処理を実行
      await batch.commit();
      
      setTodayStudyTime(prevTime => prevTime + studyDuration);
      onFinish(score, studyDuration, newQuestionsStudied);
      if (typeof updateProgress === 'function') {
        updateProgress(setId, {
          totalItems: shuffledQuestions.length,
          completedItems: studiedQuestions.size,
          correctItems: correctItems.length,
          incorrectItems: incorrectItems.length,
        });
      }
    } catch (error) {
      console.error("Error saving study history:", error);
    }
  }, [setId, title, onFinish, setTodayStudyTime, studiedQuestions, user, sessionState, startTimeRef, shuffledQuestions, updateProgress, results, selectedAnswers]);

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
    handleSubmit,
    studiedQuestions,
    questions,
    correctAnswersCount
  };
};