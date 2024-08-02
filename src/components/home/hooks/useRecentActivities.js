// ======================================
// 最近の学習活動フック
// ======================================

import { useState, useEffect, useCallback } from 'react';
import { getAllSets, getSessionState, getStudyHistory } from '../../../utils/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { FlipHorizontal, MessageCircleQuestion, ListChecks, Combine } from 'lucide-react';
import { Progress } from '../../ui/feedback/progress';
import styles from '../../../styles/modules/recentActivities.module.css';

/**
 * 最近の学習活動を管理するカスタムフック
 * @param {string} userId - ユーザーID
 * @param {Function} onStartLearning - 学習開始時のコールバック関数
 */
const useRecentActivities = (userId, onStartLearning) => {
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ----------------------------------------
  // ユーティリティ関数
  // ----------------------------------------
  /**
   * セットタイプに応じたアイコンを取得
   */
  const getIconForSetType = useCallback((type) => {
    switch (type) {
      case 'flashcard':
        return <FlipHorizontal className="mr-3 text-gray-700" size={24} />;
      case 'qa':
        return <MessageCircleQuestion className="mr-3 text-gray-700" size={24} />;
      case 'multiple-choice':
        return <ListChecks className="mr-3 text-gray-700" size={24} />;
      case 'classification':
        return <Combine className="mr-3 text-gray-700" size={24} />;
      default:
        return <FlipHorizontal className="mr-3 text-gray-700" size={24} />;
    }
  }, []);

  /**
   * タイムスタンプを相対時間に変換
   */
  const formatRelativeTime = useCallback((timestamp) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return '今さっき';
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
    setIsLoading(true);
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
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB - dateA;
      });

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error("最近の学習活動の読み込み中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * 学習活動アイテムを作成
   */
  const createActivityItem = async (set, type, sessionState, studyHistory) => {
    const setStudyHistory = studyHistory
      .filter(entry => entry.setId === set.id && entry.type === type)
      .sort((a, b) => b.lastStudyDate - a.lastStudyDate);

    let totalItemsStudied = 0;
    let totalItems = 0;

    // セッションステートから総問題数と学習済み問題数を計算
    if (sessionState) {
      totalItems = sessionState.shuffledItems ? sessionState.shuffledItems.length : 0;
      totalItemsStudied = sessionState.studiedItems ? sessionState.studiedItems.length : 0;
    }

    let lastStudyDate;
    if (sessionState.lastStudyDate) {
      lastStudyDate = sessionState.lastStudyDate instanceof Timestamp
        ? sessionState.lastStudyDate.toDate()
        : new Date(sessionState.lastStudyDate);
    } else if (sessionState.updatedAt) {
      lastStudyDate = sessionState.updatedAt instanceof Timestamp
        ? sessionState.updatedAt.toDate()
        : new Date(sessionState.updatedAt);
    } else {
      const latestActivity = setStudyHistory[0];
      lastStudyDate = latestActivity ? new Date(latestActivity.lastStudyDate) : new Date();
    }
    
    const isCompleted = totalItems > 0 && totalItems === totalItemsStudied;

    return { 
      ...set, 
      sessionState: sessionState, 
      timestamp: lastStudyDate,
      type: sessionState ? sessionState.quizType : type,
      isCompleted,
      itemsStudied: totalItemsStudied,
      totalItems: totalItems,
      uniqueId: `${set.id}-${type}`
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
        key={activity.uniqueId}
        className={styles.activityItem}
        onClick={() => !activity.isCompleted && onStartLearning(activity.id, activity.type, activity.sessionState, false)}
      >
        {getIconForSetType(activity.type)}
        <div className={styles.activityContent}>
          <span className={styles.activityTitle}>{activity.title}</span>
          <div className={styles.activityDetails}>
            <p className={styles.activityTime}>
              {relativeTime} 
            </p>
            <div className={styles.progressWrapper}>
              <div 
                className={styles.activityProgress}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <span className={styles.activityCount}>
              {activity.itemsStudied}/{activity.totalItems}
            </span>
          </div>
        </div>
        <span className={`${styles.activityStatus} ${activity.isCompleted ? styles.completed : styles.inProgress}`}>
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
        if (activity.id === setId && activity.type === newSessionState.quizType) {
          const newItemsStudied = newSessionState.studiedItems ? newSessionState.studiedItems.length : 0;
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

  // 時間を定期的に更新する
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分ごとに更新

    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
  const calculateTotalStudiedItems = useCallback(() => {
    return recentActivities.reduce((total, activity) => {
      return total + (activity.itemsStudied || 0);
    }, 0);
  }, [recentActivities]);

  return {
    recentActivities,
    renderActivityItem,
    onFinishQuiz,
    calculateTotalStudiedItems,
    isLoading,
    loadRecentActivities // 新しく追加：データを再読み込みするための関数
  };
};

export default useRecentActivities;