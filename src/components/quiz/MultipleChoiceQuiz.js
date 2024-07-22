import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { useMultipleChoiceQuiz } from './hooks/useMultipleChoiceQuiz';
import styles from '@/styles/modules/MultipleChoiceQuiz.module.css';

// 多肢選択問題クイズコンポーネント
const MultipleChoiceQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateProgress }) => {
  // カスタムフックを使用してクイズの状態と関数を取得
  const {
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
  } = useMultipleChoiceQuiz(setId, title, sessionState, onFinish, setTodayStudyTime, updateProgress);

  // ローディング中の表示
  if (isLoading) {
    return <div className="w-full max-w-md mx-auto px-4">読み込み中...</div>;
  }

  // エラー時の表示
  if (error) {
    return <div className="w-full max-w-md mx-auto px-4">{error}</div>;
  }

  // 質問がない場合の表示
  if (shuffledQuestions.length === 0) {
    return <div className="w-full max-w-md mx-auto px-4">質問がありません。</div>;
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  // クイズ終了時の表示
  if (isLastQuestion) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl font-bold">クイズ終了</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">最終スコア: {calculateScore()}%</p>
            <div className="flex justify-between">
              <Button onClick={handleShuffle}>もう一度挑戦</Button>
              <Button onClick={handleFinish}>終了</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>多肢選択問題</h2>
        <div className={styles.buttonGroup}>
          <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish}>
            終了
          </Button>
        </div>
      </div>

      <Card className="w-full mb-4">
        <CardHeader>
          <CardTitle>{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.image && (
            <img src={currentQuestion.image} alt="Question" className="w-full mb-4" />
          )}
          <div className={styles.choiceGrid}>
            {currentQuestion.choices.map((choice, index) => (
              <Button
                key={index}
                variant={selectedAnswers.includes(index) ? "default" : "outline"}
                className={`justify-start ${showResult && choice.isCorrect ? styles.correctChoice : ''}`}
                onClick={() => !showResult && handleSelect(index)}
                disabled={showResult}
              >
                {choice.text}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className={styles.footer}>
          {!showResult ? (
            <Button onClick={handleSubmit} disabled={selectedAnswers.length === 0}>回答する</Button>
          ) : (
            <div className="flex items-center">
              {results[currentQuestionIndex] ? (
                <Check className={`text-green-500 ${styles.resultIcon}`} />
              ) : (
                <X className={`text-red-500 ${styles.resultIcon}`} />
              )}
              <span>正解: {currentQuestion.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</span>
            </div>
          )}
        </CardFooter>
      </Card>

      <div className={styles.pagination}>
        <span>{currentQuestionIndex + 1} / {shuffledQuestions.length}</span>
      </div>
    </div>
  );
};

export default MultipleChoiceQuiz;