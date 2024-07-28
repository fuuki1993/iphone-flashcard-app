import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from 'lucide-react';
import styles from '@/styles/modules/quiz/FlashcardQuiz.module.css';
import { useFlashcardQuiz } from './hooks/useFlashcardQuiz';

// フラッシュカードクイズコンポーネント
const FlashcardQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateOverallProgress }) => {
  // カスタムフックを使用してクイズの状態と関数を取得
  const {
    shuffledCards,
    currentCardIndex,
    isFlipped,
    isLoading,
    error,
    handleShuffle,
    handleFlip,
    handleNext,
    handlePrevious,
    handleMarkCompleted,
    handleFinish
  } = useFlashcardQuiz(setId, sessionState, onFinish, setTodayStudyTime, updateOverallProgress);

  // 現在のカードをメモ化
  const currentCard = useMemo(() => shuffledCards[currentCardIndex], [shuffledCards, currentCardIndex]);

  // ローディング中の表示
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  // エラー時の表示
  if (error) {
    return <div>{error}</div>;
  }

  // カードがない場合の表示
  if (shuffledCards.length === 0) {
    return <div>フラッシュカードがありません。</div>;
  }

  return (
    <div className={styles.quizContainer}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>フラッシュカード</h2>
        <div className={styles.headerButtons}>
          <Button variant="ghost" size="icon" onClick={handleShuffle} className={styles.shuffleButton}>
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

      <div className={styles.navigation}>
        <Button onClick={handlePrevious} disabled={currentCardIndex === 0}>
          <ArrowLeft className={styles.navigationIcon} /> 前へ
        </Button>
        <span className={styles.cardCount}>{currentCardIndex + 1} / {shuffledCards.length}</span>
        <Button onClick={handleNext} disabled={currentCardIndex === shuffledCards.length - 1}>
          次へ <ArrowRight className={styles.navigationIcon} />
        </Button>
      </div>

      <div className={styles.completedButtonContainer}>
        <Button onClick={handleMarkCompleted} className={styles.completedButton}>
          <RotateCw className={styles.completedIcon} /> 覚えた
        </Button>
      </div>
    </div>
  );
};

// フラッシュカードの内容を表示するコンポーネント
const FlashcardContent = ({ content, image, isFront }) => (
  <div className={`${styles.flashcardContent} ${isFront ? styles.frontContent : styles.backContent}`}>
    {(content || image) ? (
      <>
        {content && <p className={styles.contentText}>{content}</p>}
        {image && isFront && (
          <div className={styles.imageContainer}>
            <img 
              src={image} 
              alt="Flashcard image" 
              className={styles.contentImage}
            />
          </div>
        )}
      </>
    ) : (
      <p className={styles.emptyContent}>コンテンツがありません</p>
    )}
  </div>
);

export default FlashcardQuiz;