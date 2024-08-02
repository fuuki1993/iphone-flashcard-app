/**
 * =============================================
 * ホーム画面データフック
 * =============================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  getAllSets, 
  getSessionState, 
  getStudyHistory, 
  getCurrentProgress, 
  updateCurrentProgress,
  calculateCurrentProgress,
  calculateTodayStudyTime,
} from '../../../utils/firebase/firestore';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

/**
 * @hook useHomeScreenData
 * @description ホーム画面のデータを管理するカスタムフック
 * @param {string} userId - ユーザーID
 * @param {number} externalDailyGoal - 外部から設定される日次目標
 * @param {Array} recentActivities - useRecentActivitiesから取得した最近の活動データ
 * @param {function} calculateTotalStudiedItems - useRecentActivitiesから取得した勉強済みの問題数の合計を計算する関数
 */
const useHomeScreenData = (userId, externalDailyGoal, recentActivities, calculateTotalStudiedItems) => {
  // ステート管理
  const [currentProgress, setCurrentProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studyHistory, setStudyHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(externalDailyGoal);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prevTodayStudyTimeRef = useRef(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [allSets, setAllSets] = useState([]);

  // メモ化されたユーティリティ関数
  const convertSecondsToMinutes = useMemo(() => (seconds) => {
    return Math.floor(seconds / 60);
  }, []);

  const calculateTotalItems = useMemo(() => (sets) => {
    let flashcardItems = 0;
    let qaItems = 0;
    let multipleChoiceItems = 0;
    let classificationItems = 0;
    const flashcardSets = new Set();
    const qaSets = new Set();

    // First pass: Collect set titles and count items
    sets.forEach(set => {
      if (set.type === 'flashcard') {
        flashcardSets.add(set.title);
        const itemCount = set.cards ? set.cards.length : 0;
        flashcardItems += itemCount;
        if (itemCount >= 4) {
          multipleChoiceItems += itemCount;
        }
      } else if (set.type === 'qa') {
        qaSets.add(set.title);
        const itemCount = set.qaItems ? set.qaItems.length : 0;
        qaItems += itemCount;
        if (itemCount >= 4) {
          multipleChoiceItems += itemCount;
        }
      }
    });

    // Second pass: Adjust counts based on set title presence
    sets.forEach(set => {
      if (set.type === 'flashcard' && !qaSets.has(set.title)) {
        // フラッシュカードにあって一問一答にないセット
        const itemsToAdd = set.cards ? set.cards.length : 0;
        qaItems += itemsToAdd;
      } else if (set.type === 'qa' && !flashcardSets.has(set.title)) {
        // 一問一答にあってフラッシュカードにないセット
        const itemsToAdd = set.qaItems ? set.qaItems.length : 0;
        flashcardItems += itemsToAdd;
      }
    });

    // Count other types
    sets.forEach(set => {
      if (set.type === 'multiple-choice') {
        const itemsToAdd = set.questions ? set.questions.length : 0;
        multipleChoiceItems += itemsToAdd;
      } else if (set.type === 'classification') {
        const classificationSetItems = set.categories ? set.categories.reduce((sum, category) => sum + (category.items ? category.items.length : 0), 0) : 0;
        classificationItems += classificationSetItems;
      }
    });

    const totalItems = flashcardItems + qaItems + multipleChoiceItems + classificationItems;

    return totalItems;
  }, []);

  const calculateCompletedItems = useMemo(() => () => {
    if (typeof calculateTotalStudiedItems !== 'function') {
      return 0;
    }
    return calculateTotalStudiedItems();
  }, [calculateTotalStudiedItems]);

  const calculateStreak = useCallback(async () => {
    if (!userId) {
      return 0;
    }
  
    const studyHistory = await getStudyHistory(userId);
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
  
    const todayAchieved = convertSecondsToMinutes(todayStudyTime) >= dailyGoal;
  
    if (todayAchieved) {
      currentStreak = 1;
    }
  
    for (let i = 0; i < studyHistory.length; i++) {
      const entry = studyHistory[i];
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
  
      if (entryDate.getTime() === currentDate.getTime()) {
        continue;
      }
  
      const dayDifference = (currentDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
  
      if (dayDifference === 1 && (entry.studyDuration >= dailyGoal * 60)) {
        currentStreak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
  
    return currentStreak;
  }, [userId, dailyGoal, todayStudyTime, convertSecondsToMinutes]);

  // データ読み込み
  const loadData = useCallback(async () => {
    const now = Date.now();
    if (now - lastUpdateTime < 60000) {
      return;
    }

    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }
      
      const db = getFirestore();
      const sessionStatesRef = collection(db, `users/${userId}/sessionStates`);
      const snapshot = await getDocs(sessionStatesRef);

      let totalQuestions = 0;
      let totalCompleted = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalQuestions += data.shuffledItems?.length || 0;
        totalCompleted += data.studiedItems?.length || 0;
      });

      const newCurrentProgress = totalQuestions > 0 ? (totalCompleted / totalQuestions) * 100 : 0;
      
      await updateCurrentProgress(userId, newCurrentProgress);
      setCurrentProgress(newCurrentProgress);
      
      const studyHistoryData = await getStudyHistory(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let latestSessionDuration = 0;
      for (const set of allSets) {
        const sessionState = await getSessionState(userId, set.id, set.type);
        if (sessionState && sessionState.date && new Date(sessionState.date) >= today) {
          latestSessionDuration += sessionState.studyDuration || 0;
        }
      }

      let totalStudyTimeToday = studyHistoryData
        .filter(entry => new Date(entry.date).toDateString() === today.toDateString())
        .reduce((total, entry) => total + (entry.studyDuration || 0), 0);

      const finalTotalStudyTime = totalStudyTimeToday + latestSessionDuration;
      setTodayStudyTime(finalTotalStudyTime);

      const newTodayStudyTime = await calculateTodayStudyTime(userId);
      setTodayStudyTime(newTodayStudyTime);

      const newStreak = await calculateStreak();
      setStreak(newStreak);

      setLastUpdateTime(now);

    } catch (error) {
      console.error("データの読み込み中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, calculateStreak, dailyGoal, convertSecondsToMinutes, lastUpdateTime, allSets]);

  // 副作用
  useEffect(() => {
    const fetchAllSets = async () => {
      const fetchedSets = await getAllSets(userId);
      setAllSets(fetchedSets);
    };
    fetchAllSets();
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData, recentActivities]);

  useEffect(() => {
    setIsGoalAchieved(convertSecondsToMinutes(todayStudyTime) >= dailyGoal);
  }, [todayStudyTime, dailyGoal, convertSecondsToMinutes]);

  useEffect(() => {
    setDailyGoal(externalDailyGoal);
  }, [externalDailyGoal]);

  useEffect(() => {
    if (convertSecondsToMinutes(todayStudyTime) >= dailyGoal && 
        convertSecondsToMinutes(prevTodayStudyTimeRef.current) < dailyGoal) {
      loadData();
    }
    prevTodayStudyTimeRef.current = todayStudyTime;
  }, [todayStudyTime, dailyGoal, loadData, convertSecondsToMinutes]);

  return {
    currentProgress,
    streak,
    studyHistory,
    dailyGoal,
    todayStudyTime,
    isGoalAchieved,
    convertSecondsToMinutes,
    isLoading,
  };
};

export default useHomeScreenData;