import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, getSessionState } from '@/utils/indexedDB';

const MultipleChoiceQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState }) => {
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const startTimeRef = useRef(new Date());

  const calculateScore = () => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffleQuestionAndChoices = (question) => {
    return {
      ...question,
      choices: shuffleArray(question.choices)
    };
  };

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        let allQuestions = [];
        if (setId === null) {
          const allSets = await getSets('multiple-choice');
          allQuestions = allSets.flatMap(set => set.questions);
        } else {
          const set = await getSetById(parseInt(setId));
          allQuestions = set.questions;
        }
        if (Array.isArray(allQuestions)) {
          setQuestions(allQuestions);
          if (sessionState) {
            setShuffledQuestions(sessionState.shuffledQuestions);
            setCurrentQuestionIndex(sessionState.currentQuestionIndex);
            setResults(sessionState.results);
          } else {
            const shuffledWithChoices = allQuestions.map(shuffleQuestionAndChoices);
            const shuffled = shuffleArray(shuffledWithChoices);
            setShuffledQuestions(shuffled);
            setResults(new Array(shuffled.length).fill(null));
          }
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
  }, [setId, sessionState]);

  useEffect(() => {
    const saveState = async () => {
      if (setId) {
        await saveSessionState(setId, 'multiple-choice', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results]);

  const handleShuffle = () => {
    const shuffledWithChoices = questions.map(shuffleQuestionAndChoices);
    const shuffled = shuffleArray(shuffledWithChoices);
    setShuffledQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setResults(new Array(shuffled.length).fill(null));
    setIsLastQuestion(false);
  };

  const handleSelect = (index) => {
    setSelectedAnswers(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSubmit = useCallback(() => {
    if (selectedAnswers.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
      const currentQuestion = shuffledQuestions[currentQuestionIndex];
      const isCorrect = currentQuestion.choices.every((choice, index) => 
        (selectedAnswers.includes(index) === choice.isCorrect)
      );
      const newResults = [...results];
      newResults[currentQuestionIndex] = isCorrect;
      setResults(newResults);
      setShowResult(true);

      if (currentQuestionIndex < shuffledQuestions.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setSelectedAnswers([]);
          setShowResult(false);
        }, 1000);
      } else {
        setIsLastQuestion(true);
      }
    }
  }, [selectedAnswers, currentQuestionIndex, shuffledQuestions, results]);

  const handleFinish = async () => {
    const score = calculateScore();
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000); // 秒単位で計算
    await saveStudyHistory(setId, title, 'multiple-choice', score, endTime, studyDuration);
    onFinish(score);
  };

  if (isLoading) {
    return <div className="w-full max-w-md mx-auto px-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="w-full max-w-md mx-auto px-4">{error}</div>;
  }

  if (shuffledQuestions.length === 0) {
    return <div className="w-full max-w-md mx-auto px-4">質問がありません。</div>;
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  if (isLastQuestion) {
    const finalScore = calculateScore();
    return (
      <div className="w-full max-w-md mx-auto px-4">
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
          <h2 className="text-xl font-bold">多肢選択問題</h2>
          <div className="flex">
            <Button variant="ghost" size="icon" onClick={handleShuffle} className="mr-2">
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
          <CardTitle>{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.image && (
            <img src={currentQuestion.image} alt="Question" className="w-full mb-4" />
          )}
          <div className="grid grid-cols-2 gap-2">
            {currentQuestion.choices.map((choice, index) => (
              <Button
                key={index}
                variant={selectedAnswers.includes(index) ? "default" : "outline"}
                className={`justify-start ${showResult && choice.isCorrect ? 'bg-green-100' : ''}`}
                onClick={() => !showResult && handleSelect(index)}
                disabled={showResult}
              >
                {choice.text}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {!showResult ? (
            <Button onClick={handleSubmit} disabled={selectedAnswers.length === 0}>回答する</Button>
          ) : (
            <div className="flex items-center">
              {results[currentQuestionIndex] ? (
                <Check className="text-green-500 mr-2" />
              ) : (
                <X className="text-red-500 mr-2" />
              )}
              <span>正解: {currentQuestion.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</span>
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

export default MultipleChoiceQuiz;