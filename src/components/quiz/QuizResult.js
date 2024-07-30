import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import styles from '@/styles/modules/quiz/QuizResult.module.css';

const QuizResult = ({ score, totalQuestions, onRetry, onFinish, questions, results, quizType }) => {
  const [showQuestions, setShowQuestions] = useState(false);
  const percentage = Math.round((score / totalQuestions) * 100);

  const toggleShowQuestions = () => {
    setShowQuestions(prev => !prev);
  };

  const renderAnswer = (question) => {
    if (quizType === 'multiple-choice') {
      return question.choices.filter(choice => choice.isCorrect).map(choice => choice.text).join(', ');
    } else {
      return question.answer;
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.resultCard}>
        <CardHeader>
          <CardTitle className={styles.resultTitle}>クイズ結果</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.scoreText}>
            スコア: {score} / {totalQuestions}
          </p>
          <p className={styles.percentageText}>
            正答率: {percentage}%
          </p>
          <Button 
            onClick={toggleShowQuestions} 
            className={styles.toggleQuestionsButton}
          >
            {showQuestions ? '問題を隠す' : '問題を表示'}
            {showQuestions ? <ChevronUp className={styles.toggleIcon} /> : <ChevronDown className={styles.toggleIcon} />}
          </Button>
          {showQuestions && (
            <div className={styles.questionResults}>
              {questions.map((question, index) => (
                <div key={index} className={styles.questionResult}>
                  <div className={styles.questionResultHeader}>
                    <div className={styles.questionNumber}>
                      問題 {index + 1}
                    </div>
                    <div className={styles.questionResultIcon}>
                      {results[index] ? (
                        <Check className={styles.correctIcon} />
                      ) : (
                        <X className={styles.incorrectIcon} />
                      )}
                    </div>
                    <div className={styles.questionResultContent}>
                      <p className={styles.questionText}>{question.question}</p>
                      <p className={styles.answerText}>
                        正解: {renderAnswer(question)}
                      </p>
                      {question.image && (
                        <img src={question.image} alt="問題画像" className={styles.questionImage} />
                      )}
                      {question.explanation && (
                        <p className={styles.explanationText}>説明: {question.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={styles.buttonContainer}>
            <Button onClick={onRetry} className={styles.retryButton}>
              もう一度挑戦
            </Button>
            <Button onClick={onFinish} className={styles.finishButton}>
              終了
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizResult;