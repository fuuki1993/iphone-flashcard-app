import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { useQAQuiz } from './hooks/useQAQuiz';
import styles from '@/styles/modules/quiz/QAQuiz.module.css';

const QAQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime }) => {
  const {
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
  } = useQAQuiz(setId, title, quizType, sessionState, setTodayStudyTime, onFinish);

  if (isLoading) return <div className={styles.loading}>読み込み中...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (shuffledQuestions.length === 0) return <div className={styles.empty}>質問がありません。</div>;

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  if (isLastQuestion) {
    const finalScore = calculateScore();
    return (
      <div className={styles.finalScoreContainer}>
        <Card className={styles.finalScoreCard}>
          <CardHeader>
            <CardTitle className={styles.finalScoreTitle}>クイズ終了</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.finalScoreText}>最終スコア: {finalScore}%</p>
            <div className={styles.finalScoreButtons}>
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
        <div className={styles.headerContent}>
          <Button variant="ghost" size="icon" onClick={onBack} className={styles.backButton}>
            <ArrowLeft />
          </Button>
          <h2 className={styles.title}>一問一答</h2>
          <div className={styles.headerButtons}>
            <Button variant="ghost" size="icon" onClick={handleShuffle} className={styles.shuffleButton}>
              <Shuffle />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFinish} className={styles.finishButton}>
              終了
            </Button>
          </div>
        </div>
      </div>

      <Card className={styles.quizCard}>
        <CardHeader>
          <CardTitle className={styles.questionTitle}>{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.image && (
            <img src={currentQuestion.image} alt="Question" className={styles.questionImage} />
          )}
          <Input
            type="text"
            placeholder="回答を入力"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={showAnswer}
            className={styles.answerInput}
          />
        </CardContent>
        <CardFooter className={styles.cardFooter}>
          {!showAnswer ? (
            <Button onClick={handleSubmit} className={styles.submitButton}>回答する</Button>
          ) : (
            <div className={styles.resultContainer}>
              {results[currentQuestionIndex] ? (
                <Check className={`${styles.resultIcon} ${styles.correctIcon}`} />
              ) : (
                <X className={`${styles.resultIcon} ${styles.incorrectIcon}`} />
              )}
              <span className={styles.correctAnswer}>正解: {currentQuestion.answer}</span>
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

export default QAQuiz;