import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, BookOpen, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const formatTotalStudyTime = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds === 0) return '0時間0分';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}時間${minutes}分`;
};

const StatisticsScreen = ({ 
  onBack, 
  totalStudyTime, 
  todayStudiedCards, 
  weeklyStudyTime,
  totalStudyTimeComparison,
  todayStudiedCardsComparison
}) => {
  const formattedTotalStudyTime = formatTotalStudyTime(totalStudyTime);

  const transformedWeeklyData = ['日', '月', '火', '水', '木', '金', '土'].map((day, index) => ({
    day,
    time: Math.floor(weeklyStudyTime[index] / 60) // 秒から分に変換
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
            {renderComparison(totalStudyTimeComparison)}
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
            <p className="text-lg font-bold text-gray-800">{todayStudiedCards}枚</p>
            {renderComparison(todayStudiedCardsComparison)}
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