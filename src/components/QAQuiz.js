import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets } from '@/utils/indexedDB';

const QAQuiz = ({ onFinish, onBack, setId, title, quizType }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const startTimeRef = useRef(new Date());

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        let allQuestions = [];
        if (setId === null) {
          // 全てセットを取得
          const allSets = await getSets('qa');
          allQuestions = allSets.flatMap(set => set.qaItems);
        } else {
          const set = await getSetById(parseInt(setId));
          allQuestions = set.qaItems;
        }
        if (Array.isArray(allQuestions)) {
          setQuestions(allQuestions);
          setShuffledQuestions(shuffleArray([...allQuestions]));
          setResults(new Array(allQuestions.length).fill(null));
        } else {
          throw new Error('Invalid data structure');
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        setError('質問の読み込み中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [setId]);

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleShuffle = () => {
    setShuffledQuestions(shuffleArray([...shuffledQuestions]));
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setResults(new Array(shuffledQuestions.length).fill(null));
  };

  const handleSubmit = useCallback(() => {
    const isCorrect = userAnswer.toLowerCase() === shuffledQuestions[currentQuestionIndex].answer.toLowerCase();
    const newResults = [...results];
    newResults[currentQuestionIndex] = isCorrect;
    setResults(newResults);
    setShowAnswer(true);
    setIsLastQuestion(currentQuestionIndex === shuffledQuestions.length - 1);

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setUserAnswer('');
        setShowAnswer(false);
      }, 1000);
    }
  }, [userAnswer, shuffledQuestions, currentQuestionIndex, results]);

  const handleFinish = async () => {
    const score = calculateScore();
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000); // 秒単位で計算
    await saveStudyHistory(setId, title, 'qa', score, endTime, studyDuration);
    onFinish(score);
  };

  const calculateScore = () => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (shuffledQuestions.length === 0) {
    return <div>質問がありません。</div>;
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  return (
    <div className="mobile-friendly-form">
      <div className="scrollable-content p-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className="text-xl font-bold">一問一答</h2>
          <div className="flex">
            <Button variant="ghost" size="icon" onClick={handleShuffle}>
              <Shuffle />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFinish}>
              終了
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentQuestion.image && (
              <img src={currentQuestion.image} alt="Question" className="w-full mb-4 max-h-48 object-contain" />
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
                  <Check className="text-green-500 mr-2" />
                ) : (
                  <X className="text-red-500 mr-2" />
                )}
                <span>正解: {currentQuestion.answer}</span>
              </div>
            )}
          </CardFooter>
        </Card>

        <div className="text-center">
          <span>{currentQuestionIndex + 1} / {shuffledQuestions.length}</span>
        </div>
      </div>
    </div>
  );
};

export default QAQuiz;