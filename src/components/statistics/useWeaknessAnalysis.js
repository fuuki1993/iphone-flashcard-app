import { useState, useEffect } from 'react';
import { getStudyHistory } from '@/utils/firebase/firestore';

const useWeaknessAnalysis = (userId) => {
  const [weaknesses, setWeaknesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeaknesses = async () => {
      try {
        const studyHistory = await getStudyHistory(userId);
        const analyzedWeaknesses = analyzeWeaknesses(studyHistory);
        setWeaknesses(analyzedWeaknesses);
        setLoading(false);
      } catch (err) {
        setError('弱点分析の取得中にエラーが発生しました。');
        setLoading(false);
      }
    };

    fetchWeaknesses();
  }, [userId]);

  const analyzeWeaknesses = (quizResults) => {
    const weaknesses = {};

    quizResults.forEach(result => {
      if (!weaknesses[result.setId]) {
        weaknesses[result.setId] = {
          title: result.title,
          type: result.type,
          items: {},
          totalItems: result.totalItems,
          totalAttempts: 0,
          totalScore: 0,
          hasAttempts: false  // 新しいフラグを追加
        };
      }

      // correctItemsまたはincorrectItemsが存在し、かつ空でない場合のみ計算に含める
      if ((result.correctItems && result.correctItems.length > 0) || 
          (result.incorrectItems && result.incorrectItems.length > 0)) {
        weaknesses[result.setId].totalAttempts++;
        weaknesses[result.setId].totalScore += result.score;
        weaknesses[result.setId].hasAttempts = true;  // 試行があったことを記録
      }

      if (result.incorrectItems && result.incorrectItems.length > 0) {
        result.incorrectItems.forEach(item => {
          let key, correctAnswer, userAnswer;

          switch (result.type) {
            case 'classification':
              key = item.content;
              correctAnswer = item.correctCategory;
              userAnswer = item.category;
              break;
            case 'multiple-choice':
              key = item.question;
              correctAnswer = item.correctAnswer;
              userAnswer = item.userAnswer;
              break;
            case 'qa':
              key = item.question;
              correctAnswer = item.correctAnswer;
              userAnswer = item.userAnswer;
              break;
            case 'flashcard':
              key = item.front;
              correctAnswer = item.back;
              userAnswer = item.userAnswer;
              break;
            default:
              return;
          }

          if (!weaknesses[result.setId].items[key]) {
            weaknesses[result.setId].items[key] = {
              count: 0,
              correctAnswer,
              userAnswers: {}
            };
          }

          weaknesses[result.setId].items[key].count++;
          weaknesses[result.setId].items[key].userAnswers[userAnswer] = (weaknesses[result.setId].items[key].userAnswers[userAnswer] || 0) + 1;
        });
      }
    });

    return Object.values(weaknesses)
      .filter(set => set.hasAttempts)  // 試行があるセットのみをフィルタリング
      .map(set => ({
        ...set,
        correctRate: set.totalAttempts > 0 ? (set.totalScore / set.totalAttempts) : 0,
        items: Object.entries(set.items)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 5)
          .map(([key, data]) => ({
            key,
            count: data.count,
            correctAnswer: data.correctAnswer,
            userAnswers: Object.entries(data.userAnswers)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([answer, count]) => `${answer} (${count}回)`)
              .join(', ')
          }))
      }));
  };

  return { weaknesses, loading, error };
};

export default useWeaknessAnalysis;