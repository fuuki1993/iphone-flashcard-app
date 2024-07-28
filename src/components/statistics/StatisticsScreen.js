import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { ArrowLeft, Clock, BookOpen, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getUserStatistics, getStudyHistory } from '@/utils/firebase/firestore';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import styles from '@/styles/modules/StatisticsScreen.module.css';

const formatTotalStudyTime = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds === 0) return '0時間0分';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}時間${minutes}分`;
};

const StatisticsScreen = ({ onBack, userId, refreshTrigger }) => {
  const [cachedStatistics, setCachedStatistics] = useLocalStorage('userStatistics', null);
  const [statistics, setStatistics] = useState(cachedStatistics?.data || {
    totalStudyTime: 0,
    todayStudiedCards: 0,
    weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
    totalStudyTimeComparison: 0,
    todayStudiedCardsComparison: 0
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      if (userId) {
        if (cachedStatistics && Date.now() - cachedStatistics.timestamp < 5 * 60 * 1000) {
          setStatistics(cachedStatistics.data);
        } else {
          try {
            const userStats = await getUserStatistics(userId);
            if (userStats) {
              // ユーザー統計情報が取得できた場合の処理
              const studyHistory = await getStudyHistory(userId);
              
              // 総学習時間の計算
              const totalStudyTime = studyHistory.reduce((total, entry) => {
                console.log('Entry study duration:', entry.studyDuration);
                return total + (entry.studyDuration || 0);
              }, 0);
              console.log('Total study time:', totalStudyTime);
              
              // 週間学習時間の計算
              const weeklyStudyTime = calculateWeeklyStudyTime(studyHistory);
              console.log('Weekly study time:', weeklyStudyTime);
              
              // 今日の学習カード数の計算
              const today = new Date().toDateString();
              const todayStudiedCards = studyHistory
                .filter(entry => new Date(entry.date).toDateString() === today)
                .reduce((total, entry) => {
                  console.log('Today\'s entry cards studied:', entry.cardsStudied);
                  return total + (entry.cardsStudied || 0);
                }, 0);
              console.log('Today\'s studied cards:', todayStudiedCards);

              // 前週比の計算
              const totalStudyTimeComparison = calculateComparison(studyHistory, 'studyDuration');
              console.log('Total study time comparison:', totalStudyTimeComparison);
              
              const todayStudiedCardsComparison = calculateComparison(studyHistory, 'cardsStudied');
              console.log('Today\'s studied cards comparison:', todayStudiedCardsComparison);

              const newStatistics = {
                ...userStats,
                totalStudyTime,
                weeklyStudyTime,
                todayStudiedCards,
                totalStudyTimeComparison,
                todayStudiedCardsComparison
              };

              setStatistics(newStatistics);
              setCachedStatistics({ data: newStatistics, timestamp: Date.now() });
            } else {
              // ユーザー統計情報が取得できなかった場合の処理
              console.log('ユーザー統計情報が利用できません');
              setStatistics({
                ...statistics,
                error: '統計情報を取得できませんでした。'
              });
            }
          } catch (error) {
            console.error('Failed to fetch user statistics:', error);
            setStatistics({
              ...statistics,
              error: '統計情報の取得に失敗しました。しばらくしてからもう一度お試しください。'
            });
          }
        }
      }
    };

    fetchStatistics();
  }, [userId, refreshTrigger]);

  const calculateWeeklyStudyTime = (studyHistory) => {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyData = studyHistory
      .filter(entry => {
        const entryDate = new Date(entry.date);
        console.log('Entry date:', entryDate, 'Is within last week:', entryDate >= oneWeekAgo);
        return entryDate >= oneWeekAgo;
      })
      .reduce((acc, entry) => {
        const dayOfWeek = new Date(entry.date).getDay();
        acc[dayOfWeek] += entry.studyDuration;
        console.log('Day of week:', dayOfWeek, 'Study duration:', entry.studyDuration);
        return acc;
      }, Array(7).fill(0));

    console.log('Calculated weekly study time:', weeklyData);
    return weeklyData;
  };

  const calculateComparison = (studyHistory, field) => {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekTotal = studyHistory
      .filter(entry => new Date(entry.date) >= oneWeekAgo)
      .reduce((total, entry) => total + (entry[field] || 0), 0);

    const lastWeekTotal = studyHistory
      .filter(entry => new Date(entry.date) >= twoWeeksAgo && new Date(entry.date) < oneWeekAgo)
      .reduce((total, entry) => total + (entry[field] || 0), 0);

    console.log(`Comparison for ${field}:`, { thisWeekTotal, lastWeekTotal });

    if (lastWeekTotal === 0) return 0;
    const comparison = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    console.log(`${field} comparison result:`, comparison);
    return comparison;
  };

  const formattedTotalStudyTime = formatTotalStudyTime(statistics.totalStudyTime);

  const transformedWeeklyData = ['日', '月', '火', '水', '木', '金', '土'].map((day, index) => ({
    day,
    time: Math.floor(statistics.weeklyStudyTime[index] / 60) // 秒から分に変換
  }));

  const renderComparison = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      // 比較データが存在しない場合
      return (
        <div className={`${styles.comparison} ${styles.comparisonNeutral}`}>
          <ArrowRight size={16} className="mr-1" />
          <span>0.0%</span>
          <span className="text-xs ml-1">前週比</span>
        </div>
      );
    }
    const absValue = Math.abs(value);
    let Icon, color;
    if (value > 0) {
      Icon = ArrowUpRight;
      color = styles.comparisonPositive;
    } else if (value < 0) {
      Icon = ArrowDownRight;
      color = styles.comparisonNegative;
    } else {
      Icon = ArrowRight;
      color = styles.comparisonNeutral;
    }
    return (
      <div className={`${styles.comparison} ${color}`}>
        <Icon size={16} className="mr-1" />
        <span>{absValue.toFixed(1)}%</span>
        <span className="text-xs ml-1">前週比</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-800">
          <ArrowLeft size={24} />
        </Button>
        <h1 className={styles.title}>統計</h1>
      </div>

      <div className={styles.gridContainer}>
        <Card className={styles.card}>
          <CardHeader className={styles.cardHeader}>
            <CardTitle className={styles.cardTitle}>
              <Clock className="mr-1" size={16} />
              総学習時間
            </CardTitle>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            <p className={styles.statValue}>{formattedTotalStudyTime}</p>
            {renderComparison(statistics.totalStudyTimeComparison)}
          </CardContent>
        </Card>

        <Card className={styles.card}>
          <CardHeader className={styles.cardHeader}>
            <CardTitle className={styles.cardTitle}>
              <BookOpen className="mr-1" size={16} />
              今日の学習
            </CardTitle>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            <p className={styles.statValue}>{statistics.todayStudiedCards}枚</p>
            {renderComparison(statistics.todayStudiedCardsComparison)}
          </CardContent>
        </Card>
      </div>

      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <CardTitle className={styles.cardTitle}>
            <TrendingUp className="mr-2" size={20} />
            週間学習時間
          </CardTitle>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={transformedWeeklyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#4b5563', fontSize: 12 }}
                />
                <YAxis
                  tickCount={5}
                  domain={[0, 'dataMax + 10']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#4b5563', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#4b5563" 
                  strokeWidth={2}
                  dot={{ fill: '#4b5563', r: 4 }}
                  activeDot={{ r: 6, fill: '#111827' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsScreen;