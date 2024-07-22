// ======================================
// 最近の学習活動フック
// ======================================

import { useState, useEffect, useCallback } from 'react';
import { getAllSets, getSessionState, getStudyHistory } from '../../../utils/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { Book, Globe, Code, Calendar } from 'lucide-react';
import { Progress } from '../../ui/feedback/progress';

/**
 * 最近の学習活動を管理するカスタムフック
 * @param {string} userId - ユーザーID
 * @param {Function} onStartLearning - 学習開始時のコールバック関数
 */
const useRecentActivities = (userId, onStartLearning) => {
  const [recentActivities, setRecentActivities] = useState([]);

  // ----------------------------------------
  // ユーティリティ関数
  // ----------------------------------------
  /**
   * セットタイプに応じたアイコンを取得
   */
  const getIconForSetType = useCallback((type) => {
    switch (type) {
      case 'flashcard':
        return <Book className="mr-3 text-blue-500" size={24} />;
      case 'qa':
        return <Globe className="mr-3 text-green-500" size={24} />;
      case 'multiple-choice':
        return <Code className="mr-3 text-purple-500" size={24} />;
      case 'classification':
        return <Calendar className="mr-3 text-red-500" size={24} />;
      default:
        return <Book className="mr-3 text-blue-500" size={24} />;
    }
  }, []);

  /**
   * タイムスタンプを相対時間に変換
   */
  const formatRelativeTime = useCallback((timestamp) => {
    const now = new Date();
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return '今さっき';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}週間前`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}ヶ月前`;
    return `${Math.floor(diffInSeconds / 31536000)}年前`;
  }, []);

  // ----------------------------------------
  // データ処理関数
  // ----------------------------------------
  /**
   * 最近の学習活動を読み込む
   */
  const loadRecentActivities = useCallback(async () => {
    try {
      const allSets = await getAllSets(userId);
      const studyHistory = await getStudyHistory(userId);

      const recentActivities = await Promise.all(
        allSets.flatMap(async (set) => {
          const activities = [];

          for (const type of ['flashcard', 'qa', 'multiple-choice', 'classification']) {
            const sessionState = await getSessionState(userId, set.id, type);
            if (sessionState) {
              const activity = await createActivityItem(set, type, sessionState, studyHistory);
              activities.push(activity);
            }
          }

          return activities;
        })
      );

      const flattenedActivities = recentActivities.flat().filter(Boolean);

      const sortedActivities = flattenedActivities.sort((a, b) => {
        const dateA = a.timestamp instanceof Timestamp ? a.timestamp.toDate() : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Timestamp ? b.timestamp.toDate() : new Date(b.timestamp);
        return dateB - dateA;
      });

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error("最近の学習活動の読み込み中にエラーが発生しました:", error);
    }
  }, [userId]);

  /**
   * 学習活動アイテムを作成
   */
  const createActivityItem = async (set, type, sessionState, studyHistory) => {
    const setStudyHistory = studyHistory
      .filter(entry => entry.setId === set.id && entry.type === type)
      .sort((a, b) => b.createdAt - a.createdAt);

    let totalItemsStudied = 0;
    let totalItems = 0;

    // セッションステートから総問題数と学習済み問題数を計算
    if (type === 'flashcard') {
      totalItems = sessionState.shuffledCards ? sessionState.shuffledCards.length : 0;
      totalItemsStudied = sessionState.studiedCards ? sessionState.studiedCards.length : 0;
    } else if (type === 'qa' || type === 'multiple-choice') {
      totalItems = sessionState.shuffledQuestions ? sessionState.shuffledQuestions.length : 0;
      totalItemsStudied = sessionState.studiedQuestions ? sessionState.studiedQuestions.length : 0;
      // resultsの長さも考慮する
      if (sessionState.results) {
        totalItemsStudied = Math.max(totalItemsStudied, sessionState.results.length);
      }
    } else if (type === 'classification') {
      totalItems = sessionState.shuffledItems ? sessionState.shuffledItems.length : 0;
      totalItemsStudied = sessionState.studiedItems ? sessionState.studiedItems.length : 0;
    }

    // セッションステートに情報がない場合のフォールバック
    if (totalItems === 0) {
      if (type === 'flashcard') {
        totalItems = set.cards ? set.cards.length : 0;
      } else if (type === 'qa') {
        totalItems = set.qaItems ? set.qaItems.length : 0;
      } else if (type === 'multiple-choice') {
        totalItems = set.questions ? set.questions.length : 0;
      } else if (type === 'classification') {
        totalItems = set.categories ? set.categories.reduce((sum, category) => sum + category.items.length, 0) : 0;
      }
    }
  
    let latestActivity = setStudyHistory[0] || null;
  
    const isCompleted = totalItems > 0 && totalItems === totalItemsStudied;
    
    return { 
      ...set, 
      sessionState: sessionState, 
      timestamp: latestActivity ? latestActivity.createdAt : new Date(),
      type: type,
      isCompleted,
      itemsStudied: totalItemsStudied,
      totalItems: totalItems,
      uniqueId: `${set.id}-${type}` // 一意のIDを追加
    };
  };

  // ----------------------------------------
  // レンダリング関数
  // ----------------------------------------
  /**
   * 学習活動アイテムをレンダリング
   */
  const renderActivityItem = useCallback((activity) => {
    const progressPercentage = activity.totalItems > 0
      ? (activity.itemsStudied / activity.totalItems) * 100
      : 0;

    const relativeTime = formatRelativeTime(activity.timestamp);

    return (
      <li 
        key={activity.uniqueId} // Use uniqueId as key
        className="flex items-center p-2 rounded-md hover:bg-gray-200 cursor-pointer transition-colors duration-200"
        onClick={() => !activity.isCompleted && onStartLearning(activity.id, activity.type, activity.sessionState, false)}
      >
        {getIconForSetType(activity.type)}
        <div className="flex-1 ml-2">
          <span className="font-medium text-xs">{activity.title}</span>
          <div className="flex items-center mt-1">
            <p className="text-[10px] text-gray-500 mr-2">
              {relativeTime}
            </p>
            <Progress 
              value={progressPercentage} 
              className="w-24 h-2 mr-2" 
            />
            <span className="text-[10px] text-gray-500">
              {activity.itemsStudied}/{activity.totalItems}
            </span>
          </div>
        </div>
        <span className={`text-xs ${activity.isCompleted ? 'text-green-500' : 'text-blue-500'}`}>
          {activity.isCompleted ? '完了' : '再開'}
        </span>
      </li>
    );
  }, [onStartLearning, getIconForSetType, formatRelativeTime]);

  // ----------------------------------------
  // イベントハンドラ
  // ----------------------------------------
  /**
   * クイズ終了時の処理
   */
  const onFinishQuiz = useCallback((setId, type, score, newSessionState, isNewSession) => {
    setRecentActivities(prevActivities => 
      prevActivities.map(activity => {
        if (activity.id === setId && activity.type === type) {
          let newItemsStudied = 0;
          if (type === 'qa' || type === 'multiple-choice') {
            newItemsStudied = newSessionState.studiedQuestions ? newSessionState.studiedQuestions.length : 0;
            if (newSessionState.results) {
              newItemsStudied = Math.max(newItemsStudied, newSessionState.results.length);
            }
          } else {
            newItemsStudied = newSessionState.studiedItems || 0;
          }
          return {
            ...activity,
            sessionState: newSessionState,
            itemsStudied: newItemsStudied,
            isCompleted: newItemsStudied >= activity.totalItems
          };
        }
        return activity;
      })
    );
  }, []);

  // ----------------------------------------
  // 副作用
  // ----------------------------------------
  useEffect(() => {
    loadRecentActivities();
  }, [loadRecentActivities]);

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
  return {
    recentActivities,
    renderActivityItem,
    onFinishQuiz
  };
};

export default useRecentActivities;