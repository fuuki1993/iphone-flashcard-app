import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart2, Trophy, Clock, BookOpen, ChevronRight } from 'lucide-react';

const StatisticsScreen = ({ onBack, overallProgress, streak, dailyGoal, todayStudyTime, onShowStudyHistory }) => {
  const maxStreak = 10; // この値は実際のデータから計算する必要があります

  return (
    <div className="p-4 w-full max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">統計</h1>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart2 className="mr-2 text-blue-500" size={24} />
            全体の進捗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="w-full" />
          <p className="text-center mt-2 font-bold">{overallProgress.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 text-yellow-500" size={24} />
            学習継続日数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-bold">現在のストリーク: {streak}日</p>
          <p>過去最高ストリーク: {maxStreak}日</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 text-green-500" size={24} />
            今日の学習時間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(todayStudyTime / dailyGoal) * 100} className="w-full mb-2" />
          <p>{todayStudyTime}分 / {dailyGoal}分</p>
        </CardContent>
      </Card>

      <Card className="mb-4 w-full cursor-pointer" onClick={onShowStudyHistory}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="mr-2 text-purple-500" size={24} />
              学習履歴
            </div>
            <ChevronRight size={24} />
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};

export default StatisticsScreen;