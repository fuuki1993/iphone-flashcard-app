import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, getSessionState, updateSessionState } from '@/utils/firestore';
import styles from '@/app/FlashcardQuiz.module.css';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const FlashcardQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateOverallProgress }) => {
  const [cards, setCards] = useState([]);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const startTimeRef = useRef(new Date());
  const [user, setUser] = useState(null);
  const [studiedCards, setStudiedCards] = useState(new Set());

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionState && sessionState.studiedCards) {
      setStudiedCards(new Set(sessionState.studiedCards));
    }
  }, [sessionState]);

  const calculateScore = useCallback(() => {
    const totalCards = shuffledCards.length;
    const completedCards = completed.filter(Boolean).length;
    return Math.round((completedCards / totalCards) * 100);
  }, [shuffledCards.length, completed]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  useEffect(() => {
    const loadCards = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        let allCards = [];
        if (setId === null) {
          const allSets = await getSets(user.uid, 'flashcard');
          allCards = allSets.flatMap(set => set.cards);
        } else {
          const set = await getSetById(user.uid, setId);
          allCards = set.cards;
        }
        if (Array.isArray(allCards)) {
          setCards(allCards);
          if (sessionState) {
            setShuffledCards(sessionState.shuffledCards);
            setCurrentCardIndex(sessionState.currentCardIndex);
            setCompleted(sessionState.completed);
          } else {
            setShuffledCards(shuffleArray([...allCards]));
            setCompleted(new Array(allCards.length).fill(false));
          }
        } else {
          throw new Error('Invalid data structure');
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
  }, [setId, sessionState, shuffleArray, user]);

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

  const handleShuffle = useCallback(() => {
    setShuffledCards(prevCards => shuffleArray([...prevCards]));
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCompleted(prevCompleted => new Array(prevCompleted.length).fill(false));
  }, [shuffleArray]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prevFlipped => {
      if (!prevFlipped) {
        // カードを裏返すときに、まだ学習していないカードであれば studiedCards に追加
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

  const handleNext = useCallback(() => {
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex, shuffledCards.length]);

  const handlePrevious = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prevIndex => prevIndex - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

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

  const handleFinish = useCallback(async () => {
    if (user) {
      const endTime = new Date();
      const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
      const newCardsStudied = studiedCards.size - (sessionState?.studiedCards?.length || 0);
      const isNewSession = !sessionState;
      
      const studyHistoryEntry = {
        setId,
        type: 'flashcard',
        date: endTime.toISOString(),
        studyDuration,
        cardsStudied: studiedCards.size,
        totalCards: shuffledCards.length,
        isNewSession
      };
      
      try {
        await saveStudyHistory(user.uid, studyHistoryEntry);
        await updateSessionState(user.uid, setId, 'flashcard', {
          completedItems: studiedCards.size,
          lastStudyDate: endTime
        });
        
        setTodayStudyTime(prevTime => prevTime + studyDuration);
        onFinish(studiedCards.size, studyDuration, newCardsStudied);
        if (typeof updateOverallProgress === 'function') {
          updateOverallProgress(studiedCards.size, shuffledCards.length);
        } else {
          console.error('updateOverallProgress is not a function');
        }
      } catch (error) {
        console.error("Error saving study history:", error);
      }
    }
  }, [setId, onFinish, setTodayStudyTime, studiedCards, user, sessionState, startTimeRef, shuffledCards, updateOverallProgress]);
  
  const currentCard = useMemo(() => shuffledCards[currentCardIndex], [shuffledCards, currentCardIndex]);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (shuffledCards.length === 0) {
    return <div>フラッシュカードがありません。</div>;
  }

  return (
    <div className="p-2 w-full max-w-[390px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-bold">フラッシュカード</h2>
        <div className="flex">
          <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish}>
            終了
          </Button>
        </div>
      </div>

      <div className={styles.flashcardContainer} onClick={handleFlip}>
        <div className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`}>
          <div className={styles.front}>
            <FlashcardContent
              content={currentCard.front}
              image={currentCard.image}
              isFront={true}
            />
          </div>
          <div className={styles.back}>
            <FlashcardContent
              content={currentCard.back}
              isFront={false}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button onClick={handlePrevious} disabled={currentCardIndex === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 前へ
        </Button>
        <span>{currentCardIndex + 1} / {shuffledCards.length}</span>
        <Button onClick={handleNext} disabled={currentCardIndex === shuffledCards.length - 1}>
          次へ <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex justify-center">
        <Button onClick={handleMarkCompleted} className="mr-2">
          <RotateCw className="mr-2 h-4 w-4" /> 覚えた
        </Button>
      </div>
    </div>
  );
};

const FlashcardContent = ({ content, image, isFront }) => (
  <div className={`${styles.flashcardContent} ${isFront ? styles.frontContent : styles.backContent}`}>
    <p className={styles.contentText}>{content}</p>
    {image && isFront && (
      <div className={styles.imageContainer}>
        <img 
          src={image} 
          alt="Flashcard image" 
          className={styles.contentImage}
        />
      </div>
    )}
  </div>
);

export default FlashcardQuiz;