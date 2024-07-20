import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check, X, Shuffle } from 'lucide-react';
import { getSetById, saveStudyHistory, getSets, saveSessionState, updateSessionState } from '@/utils/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const QAQuiz = ({ onFinish, onBack, setId, title, quizType, sessionState, setTodayStudyTime, onFinishQuiz }) => {
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
  const [user, setUser] = useState(null);
  const [studiedQuestions, setStudiedQuestions] = useState(new Set());

  useEffect(() => {
    if (sessionState) {
      setShuffledQuestions(sessionState.shuffledQuestions || []);
      setCurrentQuestionIndex(sessionState.currentQuestionIndex || 0);
      setResults(sessionState.results || []);
      setStudiedQuestions(new Set(sessionState.studiedQuestions || []));
    }
  }, [sessionState]);

  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const calculateScore = useCallback(() => {
    const totalQuestions = shuffledQuestions.length;
    const correctAnswers = results.filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [shuffledQuestions.length, results]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const loadQuestions = async () => {
    try {
      if (!setId || !user) {
        throw new Error('setId is not provided or user is not authenticated');
      }
      console.log('Loading questions for setId:', setId);
      const set = await getSetById(user.uid, setId);
      console.log('Loaded set:', set); // デバッグ用ログ
      if (!set) {
        throw new Error('Invalid set data');
      }
      const qaItems = set.qaItems || [];
      if (qaItems.length === 0) {
        console.warn('No qaItems found in the set');
      }
      if (!sessionState) {
        setQuestions(qaItems);
        setShuffledQuestions(shuffleArray([...qaItems]));
        setCurrentQuestionIndex(0);
        setResults([]);
        setStudiedQuestions(new Set());
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [setId, user]);

  useEffect(() => {
    const saveState = async () => {
      if (setId && user) {
        await saveSessionState(user.uid, setId, 'qa', {
          shuffledQuestions,
          currentQuestionIndex,
          results,
          studiedQuestions: Array.from(studiedQuestions)
        });
      }
    };
    saveState();
  }, [setId, shuffledQuestions, currentQuestionIndex, results, user, studiedQuestions]);

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

    setStudiedQuestions(prevStudied => new Set(prevStudied).add(currentQuestionIndex));

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prevIndex => {
          const newIndex = prevIndex + 1;
          return newIndex;
        });
        setUserAnswer('');
        setShowAnswer(false);
      }, 1000);
    } else {
      setIsLastQuestion(true);
    }
  }, [userAnswer, shuffledQuestions, currentQuestionIndex, results]);

  const handleFinish = useCallback(async () => {
    if (user) {
      const score = calculateScore();
      const endTime = new Date();
      const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
      const newQuestionsStudied = studiedQuestions.size - (sessionState?.studiedQuestions?.length || 0);
      const isNewSession = !sessionState;
      
      const correctQuestions = shuffledQuestions.filter((_, index) => results[index] === true);
      const incorrectQuestions = shuffledQuestions.filter((_, index) => results[index] === false);
      
      const studyHistoryEntry = {
        setId,
        title,
        type: 'qa',
        score,
        date: endTime.toISOString(),
        studyDuration,
        questionsStudied: newQuestionsStudied,
        isNewSession,
        correctQuestions,
        incorrectQuestions
      };

      try {
        await saveStudyHistory(user.uid, studyHistoryEntry);
        await updateSessionState(user.uid, setId, 'qa', {
          completedItems: studiedQuestions.size,
          lastStudyDate: endTime
        });
        
        setTodayStudyTime(prevTime => prevTime + studyDuration);
        onFinish(score, studyDuration, newQuestionsStudied);
      } catch (error) {
        console.error("Error saving study history:", error);
      }
    }
  }, [setId, title, calculateScore, onFinish, setTodayStudyTime, studiedQuestions, user, sessionState, startTimeRef, shuffledQuestions, results]);

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
    const endTime = new Date();
    const studyDuration = Math.round((endTime - startTimeRef.current) / 1000);
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