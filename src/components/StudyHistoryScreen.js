import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const StudyHistoryScreen = ({ studyHistory, onDeleteEntry, onBack }) => {
  const [period, setPeriod] = useState('all');
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    const filterHistory = () => {
      const now = new Date();
      return studyHistory.filter(entry => {
        if (period === 'all') return true;
        const entryDate = new Date(entry.date);
        switch (period) {
          case 'week':
            return now - entryDate <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return now - entryDate <= 30 * 24 * 60 * 60 * 1000;
          case 'year':
            return now.getFullYear() === entryDate.getFullYear();
          default:
            return true;
        }
      });
    };
    setFilteredHistory(filterHistory());
  }, [studyHistory, period]);

  return (
    <div className="p-4 w-full max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold ml-2">学習履歴</h1>
      </div>

      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-full mb-4">
          <SelectValue placeholder="期間を選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全期間</SelectItem>
          <SelectItem value="week">過去1週間</SelectItem>
          <SelectItem value="month">過去1ヶ月</SelectItem>
          <SelectItem value="year">今年</SelectItem>
        </SelectContent>
      </Select>

      {filteredHistory.map((entry, index) => (
        <Card key={index} className="mb-4 w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>{entry.setTitle}</div>
              <Button variant="ghost" size="icon" onClick={() => onDeleteEntry(entry.id)}>
                <Trash2 className="text-red-500" size={20} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>日付: {new Date(entry.date).toLocaleDateString()}</p>
            <p>スコア: {entry.score}%</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StudyHistoryScreen;