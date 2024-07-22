import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from 'lucide-react';
import styles from '@/styles/modules/FlashcardQuiz.module.css';
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
    <div className="p-2 w-full max-w-[390px] mx-auto">
      {/* ヘッダー部分 */}
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

      {/* フラッシュカード表示部分 */}
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

      {/* ナビゲーションボタン */}
      <div className="flex justify-between items-center mt-4">
        <Button onClick={handlePrevious} disabled={currentCardIndex === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 前へ
        </Button>
        <span>{currentCardIndex + 1} / {shuffledCards.length}</span>
        <Button onClick={handleNext} disabled={currentCardIndex === shuffledCards.length - 1}>
          次へ <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* 「覚えた」ボタン */}
      <div className="mt-4 flex justify-center">
        <Button onClick={handleMarkCompleted} className="mr-2">
          <RotateCw className="mr-2 h-4 w-4" /> 覚えた
        </Button>
      </div>
    </div>
  );
};

// フラッシュカードの内容を表示するコンポーネント
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