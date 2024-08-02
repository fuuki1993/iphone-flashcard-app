import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/feedback/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import styles from '@/styles/modules/StatisticsScreen.module.css';
import useWeaknessAnalysis from './useWeaknessAnalysis';

// この関数を追加
const getQuizTypeLabel = (type) => {
  switch (type) {
    case 'flashcard':
      return 'フラッシュカード';
    case 'qa':
      return '一問一答';
    case 'multiple-choice':
      return '多肢選択';
    case 'classification':
      return '分類';
    default:
      return type;
  }
};

const StatisticsScreen = ({ onBack }) => {
  const [statistics, setStatistics] = useState({
    flashcard: { total: 0, completed: 0, correct: 0, lastStudyDate: null },
    qa: { total: 0, completed: 0, correct: 0, lastStudyDate: null },
    'multiple-choice': { total: 0, completed: 0, correct: 0, lastStudyDate: null },
    classification: { total: 0, completed: 0, correct: 0, lastStudyDate: null },
  });

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const { weaknesses, loading, error } = useWeaknessAnalysis(userId);

  const [selectedSet, setSelectedSet] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const sessionStatesRef = collection(db, `users/${user.uid}/sessionStates`);
      const snapshot = await getDocs(sessionStatesRef);

      const newStatistics = { ...statistics };

      snapshot.forEach((doc) => {
        const data = doc.data();
        const quizType = data.quizType;
        if (quizType && newStatistics[quizType]) {
          newStatistics[quizType].total += data.shuffledItems?.length || 0;
          newStatistics[quizType].completed += data.studiedItems?.length || 0;
          newStatistics[quizType].correct += data.results?.filter(Boolean).length || 0;
          if (data.lastStudyDate && (!newStatistics[quizType].lastStudyDate || data.lastStudyDate > newStatistics[quizType].lastStudyDate)) {
            newStatistics[quizType].lastStudyDate = data.lastStudyDate.toDate();
          }
        }
      });

      setStatistics(newStatistics);
    };

    fetchStatistics();
  }, []);

  const renderQuizTypeStatistics = (type, label) => {
    const data = statistics[type];
    const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    const correctRate = data.completed > 0 ? (data.correct / data.completed) * 100 : 0;

    return (
      <Card className={styles.statisticsCard}>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.statisticsRow}>
            <span>完了率:</span>
            <div className={styles.progressWrapper}>
              <Progress value={completionRate} className={styles.progressBar} />
              <span className={styles.statisticsValue}>{completionRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className={styles.statisticsRow}>
            <span>正答率:</span>
            <div className={styles.progressWrapper}>
              <Progress value={correctRate} className={styles.progressBar} />
              <span className={styles.statisticsValue}>{correctRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className={styles.statisticsDetails}>
            <p>総問題数: <span>{data.total}</span></p>
            <p>完了問題数: <span>{data.completed}</span></p>
            <p>正解数: <span>{data.correct}</span></p>
            <p>最終学習日: <span>{data.lastStudyDate ? data.lastStudyDate.toLocaleDateString() : '未学習'}</span></p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOverallStatistics = () => {
    const totalQuestions = Object.values(statistics).reduce((sum, stat) => sum + stat.total, 0);
    const totalCompleted = Object.values(statistics).reduce((sum, stat) => sum + stat.completed, 0);
    const totalCorrect = Object.values(statistics).reduce((sum, stat) => sum + stat.correct, 0);
    const overallCompletionRate = totalQuestions > 0 ? (totalCompleted / totalQuestions) * 100 : 0;
    const overallCorrectRate = totalCompleted > 0 ? (totalCorrect / totalCompleted) * 100 : 0;

    return (
      <Card className={styles.statisticsCard}>
        <CardHeader>
          <CardTitle>全体の統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.statisticsRow}>
            <span>全体の完了率:</span>
            <div className={styles.progressWrapper}>
              <Progress value={overallCompletionRate} className={styles.progressBar} />
              <span className={styles.statisticsValue}>{overallCompletionRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className={styles.statisticsRow}>
            <span>全体の正答率:</span>
            <div className={styles.progressWrapper}>
              <Progress value={overallCorrectRate} className={styles.progressBar} />
              <span className={styles.statisticsValue}>{overallCorrectRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className={styles.statisticsDetails}>
            <p>総問題数: <span>{totalQuestions}</span></p>
            <p>完了問題数: <span>{totalCompleted}</span></p>
            <p>正解数: <span>{totalCorrect}</span></p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWeakPoints = (quizType) => {
    let filteredWeaknesses;
    
    if (quizType === 'overall') {
      // 全体の弱点分析の場合、全てのクイズタイプの弱点を含める
      filteredWeaknesses = weaknesses
        .filter(w => w.type === 'qa' || w.type === 'multiple-choice' || w.type === 'classification')
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, 5);
    } else {
      // 特定のクイズタイプの弱点分析の場合
      filteredWeaknesses = weaknesses
        .filter(w => w.type === quizType)
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, 5);
    }

    return (
      <Card className={styles.statisticsCard}>
        <CardHeader>
          <CardTitle>弱点分析 - {getQuizTypeLabel(quizType)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>弱点を分析中...</p>}
          {error && <p>エラー: {error}</p>}
          {!loading && !error && filteredWeaknesses.length === 0 && (
            <p className={styles.emptyMessage}>弱点が見つかりませんでした。まだ十分な学習データがない可能性があります。</p>
          )}
          {!loading && !error && filteredWeaknesses.length > 0 && (
            <div className={styles.weakPointsList}>
              {filteredWeaknesses.map((set, index) => (
                <Dialog key={`${set.title}_${index}`}>
                  <DialogTrigger asChild>
                    <div className={styles.weakPointItem}>
                      <div className={styles.weakPointInfo}>
                        <h4 className={styles.weakPointTitle}>
                          {quizType === 'overall' ? `${getQuizTypeLabel(set.type)}: ` : ''}
                          {set.title}
                        </h4>
                        <p className={styles.weakPointRate}>正解率: {set.correctRate.toFixed(2)}%</p>
                      </div>
                      <Progress value={set.correctRate * 100} className={styles.weakPointProgress} />
                    </div>
                  </DialogTrigger>
                  <DialogContent className={styles.weakPointDialogContent}>
                    <DialogHeader>
                      <DialogTitle className={styles.weakPointDialogTitle}>
                        {quizType === 'overall' ? `${getQuizTypeLabel(set.type)}: ` : ''}
                        {set.title} の弱点詳細
                      </DialogTitle>
                    </DialogHeader>
                    <div className={styles.weakPointDialogContent}>
                      {set.items.map((item, itemIndex) => (
                        <div key={`${item.key}_${itemIndex}`} className={styles.weakPointDialogItem}>
                          <p className={styles.weakPointItemQuestion}>{item.key} ({item.count}回間違え)</p>
                          <Progress value={(1 - item.count / set.items[0].count) * 100} className={styles.weakPointItemProgress} />
                          <p className={styles.weakPointItemAnswer}>正解: {item.correctAnswer}</p>
                          <p className={styles.weakPointItemUserAnswer}>ユーザーの回答: {item.userAnswers}</p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className={styles.title}>学習統計</h2>
        <BarChart2 className={styles.chartIcon} />
      </div>
      <div className={styles.content}>
        <Tabs defaultValue="overall" className={styles.tabs}>
          <TabsList className={styles.tabsList}>
            <TabsTrigger value="overall">全体</TabsTrigger>
            <TabsTrigger value="flashcard">暗記</TabsTrigger>
            <TabsTrigger value="qa">一問一答</TabsTrigger>
            <TabsTrigger value="multiple-choice">多肢選択</TabsTrigger>
            <TabsTrigger value="classification">分類</TabsTrigger>
          </TabsList>
          <TabsContent value="overall" className={styles.tabContent}>
            {renderOverallStatistics()}
            {renderWeakPoints('overall')}
          </TabsContent>
          <TabsContent value="flashcard" className={styles.tabContent}>
            {renderQuizTypeStatistics('flashcard', 'フラッシュカード')}
            {/* 暗記タブでは弱点分析を表示しない */}
          </TabsContent>
          <TabsContent value="qa" className={styles.tabContent}>
            {renderQuizTypeStatistics('qa', '一問一答')}
            {renderWeakPoints('qa')}
          </TabsContent>
          <TabsContent value="multiple-choice" className={styles.tabContent}>
            {renderQuizTypeStatistics('multiple-choice', '多肢選択')}
            {renderWeakPoints('multiple-choice')}
          </TabsContent>
          <TabsContent value="classification" className={styles.tabContent}>
            {renderQuizTypeStatistics('classification', '分類')}
            {renderWeakPoints('classification')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StatisticsScreen;