import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { useQAQuiz } from './hooks/useQAQuiz';
import styles from '@/styles/modules/quiz/QAQuiz.module.css';

// 一問一答クイズコンポーネント
const QAQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime }) => {
  // カスタムフックを使用してクイズの状態と関数を取得
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

  // ローディング中の表示
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  // エラー時の表示
  if (error) {
    return <div>{error}</div>;
  }

  // 質問がない場合の表示
  if (shuffledQuestions.length === 0) {
    return <div>質問がありません。</div>;
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  // クイズ終了時の表示
  if (isLastQuestion) {
    const finalScore = calculateScore();
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl font-bold">クイズ終了</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">最終スコア: {finalScore}%</p>
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
        <div className={styles.headerContent}>
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className={styles.title}>一問一答</h2>
          <div className="flex">
            <Button variant="ghost" size="icon" onClick={handleShuffle}>
              <Shuffle />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFinish}>
              終了
            </Button>
          </div>
        </div>
      </div>

      <Card className={styles.quizCard}>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
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
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          {!showAnswer ? (
            <Button onClick={handleSubmit}>回答する</Button>
          ) : (
            <div className="flex items-center text-sm">
              {results[currentQuestionIndex] ? (
                <Check className={`text-green-500 ${styles.resultIcon}`} />
              ) : (
                <X className={`text-red-500 ${styles.resultIcon}`} />
              )}
              <span>正解: {currentQuestion.answer}</span>
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