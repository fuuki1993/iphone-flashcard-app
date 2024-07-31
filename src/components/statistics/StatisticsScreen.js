import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/feedback/progress';
import { ArrowLeft, BarChart2, Clock, Target, Activity, Award } from 'lucide-react';
import { getStudyHistory, getCurrentProgress, calculateTodayStudyTime, getAllSets } from '@/utils/firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from '@/styles/modules/StatisticsScreen.module.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatisticsScreen = ({ onBack, userId }) => {
  const [stats, setStats] = useState({
    overallProgress: 0,
    todayStudyTime: 0,
    streak: 0,
    totalStudyTime: 0,
    averageScore: 0,
    weeklyStudyTime: [],
    quizTypeDistribution: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [progress, today, history, sets] = await Promise.all([
        getCurrentProgress(userId),
        calculateTodayStudyTime(userId),
        getStudyHistory(userId),
        getAllSets(userId)
      ]);

      const weeklyData = calculateWeeklyStudyTime(history);
      const distribution = calculateQuizTypeDistribution(sets);
      const streak = calculateStreak(history);
      const totalStudyTime = history.reduce((total, entry) => total + (entry.studyDuration || 0), 0);
      const averageScore = calculateAverageScore(history);

      setStats({
        overallProgress: progress,
        todayStudyTime: today,
        streak,
        totalStudyTime,
        averageScore,
        weeklyStudyTime: weeklyData,
        quizTypeDistribution: distribution
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateWeeklyStudyTime = (history) => {
    const now = new Date();
    const weeklyData = Array(7).fill().map((_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      return {
        date: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
        minutes: 0
      };
    }).reverse();

    history.forEach(entry => {
      const entryDate = new Date(entry.date);
      const dayIndex = weeklyData.findIndex(day => 
        new Date(day.date).toDateString() === entryDate.toDateString()
      );
      if (dayIndex !== -1) {
        weeklyData[dayIndex].minutes += Math.round(entry.studyDuration / 60);
      }
    });

    return weeklyData;
  };

  const calculateQuizTypeDistribution = (sets) => {
    const distribution = {
      flashcard: 0,
      qa: 0,
      'multiple-choice': 0,
      classification: 0
    };

    sets.forEach(set => {
      distribution[set.type] += 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const calculateStreak = (history) => {
    let currentStreak = 0;
    let lastDate = new Date();

    for (let i = 0; i < history.length; i++) {
      const entryDate = new Date(history[i].date);
      const diffDays = Math.floor((lastDate - entryDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        currentStreak++;
        lastDate = entryDate;
      } else {
        break;
      }
    }

    return currentStreak;
  };

  const calculateAverageScore = (history) => {
    const scores = history.filter(entry => entry.score !== undefined);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, entry) => sum + entry.score, 0) / scores.length;
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className={styles.title}>統計情報</h1>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statsCard}>
          <CardContent>
            <BarChart2 className={styles.statsIcon} />
            <h2>全体の進捗</h2>
            <Progress value={stats.overallProgress} className="w-full" />
            <p>{stats.overallProgress.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className={styles.statsCard}>
          <CardContent>
            <Clock className={styles.statsIcon} />
            <h2>今日の学習時間</h2>
            <p>{Math.round(stats.todayStudyTime / 60)} 分</p>
          </CardContent>
        </Card>

        <Card className={styles.statsCard}>
          <CardContent>
            <Target className={styles.statsIcon} />
            <h2>連続学習日数</h2>
            <p>{stats.streak} 日</p>
          </CardContent>
        </Card>

        <Card className={styles.statsCard}>
          <CardContent>
            <Activity className={styles.statsIcon} />
            <h2>総学習時間</h2>
            <p>{Math.round(stats.totalStudyTime / 3600)} 時間</p>
          </CardContent>
        </Card>

        <Card className={styles.statsCard}>
          <CardContent>
            <Award className={styles.statsIcon} />
            <h2>平均スコア</h2>
            <p>{stats.averageScore.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className={styles.chartsContainer}>
        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>週間学習時間</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={stats.weeklyStudyTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>クイズタイプ分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={stats.quizTypeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.quizTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatisticsScreen;