import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { useMultipleChoiceQuiz } from './hooks/useMultipleChoiceQuiz';
import styles from '@/styles/modules/quiz/MultipleChoiceQuiz.module.css';

const MultipleChoiceQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, updateProgress }) => {
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

  if (isLoading) {
    return <div className={styles.loadingMessage}>読み込み中...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (shuffledQuestions.length === 0) {
    return <div className={styles.emptyMessage}>質問がありません。</div>;
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  if (isLastQuestion) {
    return (
      <div className={styles.quizEndContainer}>
        <Card className={styles.quizEndCard}>
          <CardHeader>
            <CardTitle className={styles.quizEndTitle}>クイズ終了</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.finalScore}>最終スコア: {calculateScore()}%</p>
            <div className={styles.quizEndButtons}>
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
        <Button variant="ghost" size="icon" onClick={onBack} className={styles.backButton}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>多肢選択問題</h2>
        <div className={styles.buttonGroup}>
          <Button variant="ghost" size="icon" onClick={handleShuffle} className={styles.shuffleButton}>
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish} className={styles.finishButton}>
            終了
          </Button>
        </div>
      </div>

      <Card className={styles.questionCard}>
        <CardHeader>
          <CardTitle className={styles.questionTitle}>{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.image && (
            <img src={currentQuestion.image} alt="Question" className={styles.questionImage} />
          )}
          <div className={styles.choiceGrid}>
            {currentQuestion.choices.map((choice, index) => (
              <Button
                key={index}
                variant={selectedAnswers.includes(index) ? "default" : "outline"}
                className={`${styles.choiceButton} ${showResult && choice.isCorrect ? styles.correctChoice : ''}`}
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
            <Button onClick={handleSubmit} disabled={selectedAnswers.length === 0} className={styles.submitButton}>回答する</Button>
          ) : (
            <div className={styles.resultContainer}>
              {results[currentQuestionIndex] ? (
                <Check className={`${styles.resultIcon} ${styles.correctIcon}`} />
              ) : (
                <X className={`${styles.resultIcon} ${styles.incorrectIcon}`} />
              )}
              <span className={styles.correctAnswer}>正解: {currentQuestion.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</span>
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