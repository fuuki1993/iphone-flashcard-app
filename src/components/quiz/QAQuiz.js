import React, { useRef, useEffect } from 'react';
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
    handleFinish,
    handleKeyPress,
  } = useQAQuiz(setId, title, quizType, sessionState, setTodayStudyTime, onFinish);

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && !showAnswer) {
      inputRef.current.focus();
    }
  }, [currentQuestionIndex, showAnswer]);

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
              <Button onClick={handleShuffle} className={styles.finalScoreButton}>もう一度挑戦</Button>
              <Button onClick={handleFinish} className={styles.finalScoreButton}>終了</Button>
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
        <h2 className={styles.title}>一問一答</h2>
        <div className={styles.headerButtons}>
          <Button variant="ghost" size="icon" onClick={handleShuffle} className={styles.shuffleButton}>
            <Shuffle />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFinish}>
            終了
          </Button>
        </div>
      </div>

      <Card className={styles.quizCard}>
        <CardHeader>
          <CardTitle className={styles.questionTitle}>
            <QuestionContent
              question={currentQuestion.question}
              image={currentQuestion.image}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="回答を入力"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={showAnswer}
            className={styles.answerInput}
            ref={inputRef}
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

const QuestionContent = ({ question, image }) => (
  <div className={styles.questionContent}>
    {question && <p className={styles.questionText}>{question}</p>}
    {image && (
      <div className={styles.imageContainer}>
        <img 
          src={image} 
          alt="Question image" 
          className={styles.questionImage}
        />
      </div>
    )}
    {!question && !image && <p className={styles.emptyContent}>質問がありません</p>}
  </div>
);

export default QAQuiz;