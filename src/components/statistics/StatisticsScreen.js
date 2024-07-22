import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { ArrowLeft, Clock, BookOpen, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getUserStatistics, getStudyHistory } from '@/utils/firebase/firestore';

const formatTotalStudyTime = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds === 0) return '0時間0分';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}時間${minutes}分`;
};

const StatisticsScreen = ({ onBack, userId, refreshTrigger }) => {
  const [statistics, setStatistics] = useState({
    totalStudyTime: 0,
    todayStudiedCards: 0,
    weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
    totalStudyTimeComparison: 0,
    todayStudiedCardsComparison: 0
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      if (userId) {
        try {
          console.log('Fetching statistics for user:', userId);
          
          const userStats = await getUserStatistics(userId);
          console.log('User statistics:', userStats);
          
          const studyHistory = await getStudyHistory(userId);
          console.log('Study history:', studyHistory);
          
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

          setStatistics({
            ...userStats,
            totalStudyTime,
            weeklyStudyTime,
            todayStudiedCards,
            totalStudyTimeComparison,
            todayStudiedCardsComparison
          });

          console.log('Final statistics:', {
            totalStudyTime,
            weeklyStudyTime,
            todayStudiedCards,
            totalStudyTimeComparison,
            todayStudiedCardsComparison
          });
        } catch (error) {
          console.error('Failed to fetch user statistics:', error);
          // エラー処理を追加（例：エラーメッセージを表示）
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
        <div className="flex items-center text-gray-600 text-sm mt-1">
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
      color = 'text-green-600';
    } else if (value < 0) {
      Icon = ArrowDownRight;
      color = 'text-red-600';
    } else {
      Icon = ArrowRight;
      color = 'text-gray-600';
    }
    return (
      <div className={`flex items-center ${color} text-sm mt-1`}>
        <Icon size={16} className="mr-1" />
        <span>{absValue.toFixed(1)}%</span>
        <span className="text-xs ml-1">前週比</span>
      </div>
    );
  };

  return (
    <div className="p-4 w-full bg-gray-100 min-h-screen">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-800">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold ml-2 text-gray-900">統計</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <CardHeader className="bg-gray-800 text-white pb-2 pt-3">
            <CardTitle className="flex items-center text-sm font-semibold">
              <Clock className="mr-1" size={16} />
              総学習時間
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-lg font-bold text-gray-800">{formattedTotalStudyTime}</p>
            {renderComparison(statistics.totalStudyTimeComparison)}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <CardHeader className="bg-gray-800 text-white pb-2 pt-3">
            <CardTitle className="flex items-center text-sm font-semibold">
              <BookOpen className="mr-1" size={16} />
              今日の学習
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-lg font-bold text-gray-800">{statistics.todayStudiedCards}枚</p>
            {renderComparison(statistics.todayStudiedCardsComparison)}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 mb-4">
        <CardHeader className="bg-gray-800 text-white pb-2 pt-3">
          <CardTitle className="flex items-center text-lg font-semibold">
            <TrendingUp className="mr-2" size={20} />
            週間学習時間
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="w-full" style={{ height: '250px' }}>
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