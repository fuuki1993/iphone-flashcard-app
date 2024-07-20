import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, getSessionState } from '@/utils/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const MultipleChoiceQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime }) => {
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
  const [user, setUser] = useState(null);
  const [cardsStudied, setCardsStudied] = useState(new Set([0])); // 最初の問題は表示されているとみなす

  const calculateScore = useCallback(() => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [shuffledQuestions.length, results]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const shuffleQuestionAndChoices = useCallback((question) => {
    return {
      ...question,
      choices: shuffleArray(question.choices)
    };
  }, [shuffleArray]);

  const loadQuestions = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let allQuestions = [];
      if (setId === null) {
        const allSets = await getSets(user.uid, 'multiple-choice');
        if (Array.isArray(allSets)) {
          allQuestions = allSets.flatMap(set => Array.isArray(set.questions) ? set.questions : []);
        } else {
          throw new Error('Invalid data structure: allSets is not an array');
        }
      } else {
        const set = await getSetById(user.uid, setId);
        if (set && Array.isArray(set.questions)) {
          allQuestions = set.questions;
        } else {
          throw new Error(`Invalid set data for ID ${setId}`);
        }
      }
      if (allQuestions.length === 0) {
        throw new Error('No questions found');
      }
      if (Array.isArray(allQuestions)) {
        setQuestions(allQuestions);
        if (sessionState) {
          setShuffledQuestions(sessionState.shuffledQuestions);
          setCurrentQuestionIndex(sessionState.currentQuestionIndex);
          setResults(sessionState.results);
        } else {
          const shuffledWithChoices = allQuestions.map(question => 
            question && Array.isArray(question.choices) ? shuffleQuestionAndChoices(question) : null
          ).filter(q => q !== null);
          const shuffled = shuffleArray(shuffledWithChoices);
          setShuffledQuestions(shuffled);
          setResults(new Array(shuffled.length).fill(null));
        }
      } else {
        throw new Error('Invalid data structure: allQuestions is not an array');
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      setError(`質問の読み込み中にエラーが発生しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, setId, sessionState, shuffleArray, shuffleQuestionAndChoices]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user, loadQuestions]);

  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'multiple-choice', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results, user]);

  const handleShuffle = useCallback(() => {
    const shuffledWithChoices = questions.map(shuffleQuestionAndChoices);
    const shuffled = shuffleArray(shuffledWithChoices);
    setShuffledQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setResults(new Array(shuffled.length).fill(null));
    setIsLastQuestion(false);
  }, [questions, shuffleArray, shuffleQuestionAndChoices]);

  const handleSelect = useCallback((index) => {
    setSelectedAnswers(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

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

      if (currentQuestionIndex === shuffledQuestions.length - 1) {
        setIsLastQuestion(true);
        handleFinish();
      } else {
        setTimeout(() => {
          setCurrentQuestionIndex(prevIndex => {
            const newIndex = prevIndex + 1;
            setCardsStudied(prevStudied => new Set(prevStudied).add(newIndex));
            return newIndex;
          });
          setSelectedAnswers([]);
          setShowResult(false);
        }, 1000);
      }
    }
  }, [selectedAnswers, currentQuestionIndex, shuffledQuestions, results, handleFinish]);

  const handleFinish = useCallback(async () => {
    if (!user) return;
    const score = calculateScore();
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
    const actualCardsStudied = cardsStudied.size;
    await saveStudyHistory(user.uid, setId, title, 'multiple-choice', score, endTime, studyDuration, actualCardsStudied);
    setTodayStudyTime(prevTime => prevTime + studyDuration);
    onFinish(score, studyDuration, actualCardsStudied);
  }, [user, setId, title, calculateScore, onFinish, setTodayStudyTime, cardsStudied]);

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