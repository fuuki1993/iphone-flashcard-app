import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets, saveSessionState } from '@/utils/firestore';

const QAQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState }) => {
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
          const allSets = await getSets('qa');
          console.log('All sets:', allSets);
          if (Array.isArray(allSets)) {
            allQuestions = allSets.flatMap(set => {
              console.log('Set:', set);
              return Array.isArray(set.qaItems) ? set.qaItems : [];
            });
          } else {
            throw new Error('Invalid data structure: allSets is not an array');
          }
        } else {
          const set = await getSetById(parseInt(setId));
          console.log('Set:', set);
          if (set && Array.isArray(set.qaItems)) {
            allQuestions = set.qaItems;
          } else {
            throw new Error('Invalid data structure: set.qaItems is not an array');
          }
        }
        console.log('All questions:', allQuestions);
        if (Array.isArray(allQuestions)) {
          setQuestions(allQuestions);
          if (sessionState) {
            console.log('Session state:', sessionState);
            setShuffledQuestions(sessionState.shuffledQuestions);
            setCurrentQuestionIndex(sessionState.currentQuestionIndex);
            setResults(sessionState.results);
          } else {
            const shuffled = shuffleArray([...allQuestions]);
            console.log('Shuffled questions:', shuffled);
            setShuffledQuestions(shuffled);
            setResults(new Array(shuffled.length).fill(null));
          }
        } else {
          throw new Error('Invalid data structure: allQuestions is not an array');
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        setError('質問の読み込み中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [setId, sessionState, shuffleArray]);

  useEffect(() => {
    const saveState = async () => {
      if (setId) {
        await saveSessionState(setId, 'qa', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const handleShuffle = useCallback(() => {
    setShuffledQuestions(shuffleArray([...questions]));
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setResults(new Array(questions.length).fill(null));
    setIsLastQuestion(false);
  }, [questions, shuffleArray]);

  const handleSubmit = useCallback(() => {
    const isCorrect = userAnswer.toLowerCase() === shuffledQuestions[currentQuestionIndex].answer.toLowerCase();
    const newResults = [...results];
    newResults[currentQuestionIndex] = isCorrect;
    setResults(newResults);
    setShowAnswer(true);

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setUserAnswer('');
        setShowAnswer(false);
      }, 1000);
    } else {
      setIsLastQuestion(true);
    }
  }, [userAnswer, shuffledQuestions, currentQuestionIndex, results]);

  const handleFinish = useCallback(async () => {
    const score = calculateScore();
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    await saveStudyHistory(setId, title, 'qa', score, endTime, studyDuration);
    onFinish(score);
  }, [setId, title, onFinish]);

  const calculateScore = useCallback(() => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [shuffledQuestions.length, results]);

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
              <Button onClick={() => onFinish(finalScore)}>終了</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="mb-4">
        <div className="flex justify-between items-center">
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
      </div>

      <Card className="w-full mb-4">
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
  );
};

export default QAQuiz;