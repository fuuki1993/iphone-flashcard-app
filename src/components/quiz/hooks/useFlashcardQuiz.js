import { useState, useEffect, useRef, useCallback } from 'react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, updateSessionState } from '@/utils/firebase/firestore';
import { useBaseQuiz } from './useBaseQuiz';
import { getFirestore, writeBatch, doc } from "firebase/firestore";

/**
 * =============================================
 * フラッシュカードクイズフック
 * =============================================
 */

/**
 * @hook useFlashcardQuiz
 * @description フラッシュカードクイズの状態管理と操作を提供するカスタムフック
 * @param {string} setId - クイズセットのID
 * @param {Object} sessionState - 保存されたセッション状態
 * @param {Function} onFinish - クイズ終了時のコールバック関数
 * @param {Function} setTodayStudyTime - 今日の学習時間を更新する関数
 * @param {Function} updateOverallProgress - 全体の進捗を更新する関数
 */
export const useFlashcardQuiz = (setId, sessionState, onFinish, setTodayStudyTime, updateOverallProgress) => {
  const { user, shuffleArray } = useBaseQuiz();

  // 状態変数の定義
  const [cards, setCards] = useState([]);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const startTimeRef = useRef(new Date());
  const [studiedCards, setStudiedCards] = useState(new Set());
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (cards && cards.length > 0) {
      setShuffledCards(shuffleArray([...cards]));
    }
  }, [cards]);

  /**
   * =============================================
   * データ読み込みと初期化
   * =============================================
   */

  // カードデータの読み込み
  useEffect(() => {
    const loadCards = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const cachedSet = localStorage.getItem(`flashcardSet_${setId}`);
        if (cachedSet) {
          const parsedSet = JSON.parse(cachedSet);
          const cards = convertToFlashcards(parsedSet);
          setCards(cards);
          if (sessionState) {
            setShuffledCards(sessionState.shuffledCards);
            setCurrentCardIndex(sessionState.currentCardIndex);
            setCompleted(sessionState.completed);
          } else {
            setShuffledCards(shuffleArray([...cards]));
            setCompleted(new Array(cards.length).fill(false));
          }
        } else {
          const set = await getSetById(user.uid, setId);
          const cards = convertToFlashcards(set);
          setCards(cards);
          setShuffledCards(shuffleArray([...cards]));
          setCompleted(new Array(cards.length).fill(false));
          localStorage.setItem(`flashcardSet_${setId}`, JSON.stringify(set));
        }
      } catch (error) {
        console.error("Error loading flashcards:", error);
        setError('フラッシュカードの読み込み中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      loadCards();
    }
  }, [setId, sessionState, user, shuffleArray]);

  // セッション状態の復元
  useEffect(() => {
    if (sessionState && sessionState.studiedCards) {
      setStudiedCards(new Set(sessionState.studiedCards));
    }
  }, [sessionState]);

  // セッション状態の保存
  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'flashcard', {
          shuffledCards,
          currentCardIndex,
          completed,
          studiedCards: Array.from(studiedCards)
        });
      }
    };
    saveState();
  }, [setId, shuffledCards, currentCardIndex, completed, studiedCards, user]);

  /**
   * =============================================
   * クイズ操作関数
   * =============================================
   */

  /**
   * @function calculateScore
   * @description 現在のスコアを計算する
   */
  const calculateScore = useCallback(() => {
    const totalCards = shuffledCards.length;
    const completedCards = completed.filter(Boolean).length;
    return Math.round((completedCards / totalCards) * 100);
  }, [shuffledCards.length, completed]);

  /**
   * @function handleShuffle
   * @description カードをシャッフルする
   */
  const handleShuffle = useCallback(() => {
    setShuffledCards(prevCards => shuffleArray([...prevCards]));
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCompleted(prevCompleted => new Array(prevCompleted.length).fill(false));
  }, [shuffleArray]);

  /**
   * @function handleFlip
   * @description カードを裏返す
   */
  const handleFlip = useCallback(() => {
    setIsFlipped(prevFlipped => {
      if (!prevFlipped) {
        setStudiedCards(prevStudied => {
          if (!prevStudied.has(currentCardIndex)) {
            const newStudied = new Set(prevStudied);
            newStudied.add(currentCardIndex);
            return newStudied;
          }
          return prevStudied;
        });
      }
      return !prevFlipped;
    });
  }, [currentCardIndex]);

  /**
   * @function handleNext
   * @description 次のカードへ
   */
  const handleNext = useCallback(() => {
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex, shuffledCards.length]);

  /**
   * @function handlePrevious
   * @description 前のカードへ
   */
  const handlePrevious = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prevIndex => prevIndex - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

  /**
   * @function handleMarkCompleted
   * @description カードを完了としてマーク
   */
  const handleMarkCompleted = useCallback(() => {
    setCompleted(prevCompleted => {
      const newCompleted = [...prevCompleted];
      newCompleted[currentCardIndex] = true;
      return newCompleted;
    });
    setStudiedCards(prevStudied => {
      const newStudied = new Set(prevStudied);
      newStudied.add(currentCardIndex);
      return newStudied;
    });
    handleNext();
  }, [currentCardIndex, handleNext]);

  /**
   * @function handleFinish
   * @description クイズを終了し、結果を保存する
   */
  const handleFinish = useCallback(async () => {
    if (!user) return;
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    const newCardsStudied = studiedCards.size - (sessionState?.studiedCards?.length || 0);
    
    const correctCards = results.filter(Boolean).length;
    const incorrectCards = results.filter(result => result === false).length;
    const score = Math.round((correctCards / shuffledCards.length) * 100);

    const studyHistoryEntry = {
      setId,
      type: 'flashcard',
      score,
      date: endTime.toISOString(),
      studyDuration,
      cardsStudied: newCardsStudied,
      correctCards,
      incorrectCards,
      totalCards: shuffledCards.length
    };

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // 学習履歴の保存
      const studyHistoryRef = doc(db, `users/${user.uid}/studyHistory`, `${setId}_${Date.now()}`);
      batch.set(studyHistoryRef, studyHistoryEntry);

      // セッション状態の更新
      const sessionStateRef = doc(db, `users/${user.uid}/sessionStates`, `${setId}_flashcard`);
      batch.set(sessionStateRef, {
        results,
        studiedCards: Array.from(studiedCards),
        lastStudyDate: endTime
      }, { merge: true });

      // バッチ処理を実行
      await batch.commit();
      
      setTodayStudyTime(prevTime => prevTime + studyDuration);
      onFinish(score, studyDuration, newCardsStudied);
      if (typeof updateOverallProgress === 'function') {
        updateOverallProgress(setId, {
          totalItems: shuffledCards.length,
          completedItems: studiedCards.size,
          correctItems: correctCards,
          incorrectItems: incorrectCards,
        });
      }
    } catch (error) {
      console.error("Error saving study history:", error);
    }
  }, [setId, onFinish, setTodayStudyTime, studiedCards, user, sessionState, startTimeRef, shuffledCards, updateOverallProgress, results]);

  // Helper function to convert set data to flashcards
  const convertToFlashcards = (set) => {
    if (set.type === 'flashcard') {
      return set.cards;
    } else if (set.type === 'qa') {
      return set.qaItems.map(item => ({
        front: item.question || '',
        back: item.answer || '',
        image: item.image || null
      }));
    } else {
      throw new Error('Invalid set type');
    }
  };

  // フックから返す値
  return {
    cards,
    shuffledCards,
    currentCardIndex,
    isFlipped,
    completed,
    isLoading,
    error,
    studiedCards,
    calculateScore,
    handleShuffle,
    handleFlip,
    handleNext,
    handlePrevious,
    handleMarkCompleted,
    handleFinish
  };
};