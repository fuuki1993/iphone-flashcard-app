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

/**
 * @hook useHomeScreenData
 * @description ホーム画面のデータを管理するカスタムフック
 * @param {string} userId - ユーザーID
 * @param {number} externalDailyGoal - 外部から設定される日次目標
 * @param {Array} recentActivities - useRecentActivitiesから取得した最近の活動データ
 * @param {function} calculateTotalStudiedItems - useRecentActivitiesから取得した勉強済みの問題数の合計を計算する関数
 * @param {object} cachedData - キャッシュされたデータ
 * @param {function} setCachedData - キャッシュデータを更新する関数
 */
const useHomeScreenData = (userId, externalDailyGoal, recentActivities, calculateTotalStudiedItems, cachedData, setCachedData) => {
  // ----------------------------------------
  // ステート管理
  // ----------------------------------------
  const [currentProgress, setCurrentProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studyHistory, setStudyHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(externalDailyGoal);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prevTodayStudyTimeRef = useRef(0);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // ----------------------------------------
  // メモ化されたユーティリティ関数
  // ----------------------------------------
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

    console.log('After first pass:');
    console.log('- Flashcard items:', flashcardItems);
    console.log('- QA items:', qaItems);
    console.log('- Multiple-choice items:', multipleChoiceItems);

    // Second pass: Adjust counts based on set title presence
    sets.forEach(set => {
      if (set.type === 'flashcard' && !qaSets.has(set.title)) {
        // フラッシュカードにあって一問一答にないセット
        const itemsToAdd = set.cards ? set.cards.length : 0;
        qaItems += itemsToAdd;
        console.log(`Adding ${itemsToAdd} items from flashcard set "${set.title}" to QA items`);
      } else if (set.type === 'qa' && !flashcardSets.has(set.title)) {
        // 一問一答にあってフラッシュカードにないセット
        const itemsToAdd = set.qaItems ? set.qaItems.length : 0;
        flashcardItems += itemsToAdd;
        console.log(`Adding ${itemsToAdd} items from QA set "${set.title}" to flashcard items`);
      }
    });

    console.log('After second pass:');
    console.log('- Flashcard items:', flashcardItems);
    console.log('- QA items:', qaItems);
    console.log('- Multiple-choice items:', multipleChoiceItems);

    // Count other types
    sets.forEach(set => {
      if (set.type === 'multiple-choice') {
        const itemsToAdd = set.questions ? set.questions.length : 0;
        multipleChoiceItems += itemsToAdd;
        console.log(`Adding ${itemsToAdd} multiple-choice items from set "${set.title}"`);
      } else if (set.type === 'classification') {
        const classificationSetItems = set.categories ? set.categories.reduce((sum, category) => sum + (category.items ? category.items.length : 0), 0) : 0;
        classificationItems += classificationSetItems;
        console.log(`Adding ${classificationSetItems} classification items from set "${set.title}"`);
      }
    });

    const totalItems = flashcardItems + qaItems + multipleChoiceItems + classificationItems;

    console.log('Final total items breakdown:');
    console.log('- Flashcard items:', flashcardItems);
    console.log('- QA items:', qaItems);
    console.log('- Multiple choice items:', multipleChoiceItems);
    console.log('- Classification items:', classificationItems);
    console.log('Total items:', totalItems);

    return totalItems;
  }, []);

  const calculateCompletedItems = useMemo(() => () => {
    if (typeof calculateTotalStudiedItems !== 'function') {
      console.error('calculateTotalStudiedItems is not a function');
      return 0;
    }
    const completedItems = calculateTotalStudiedItems();
    console.log('完了した問題数:', completedItems);
    return completedItems;
  }, [calculateTotalStudiedItems]);

  const calculateStreak = useCallback(async () => {
    if (!userId) {
      console.log('No userId, returning 0 streak');
      return 0;
    }
  
    const studyHistory = await getStudyHistory(userId);
    console.log('Study history for streak calculation:', studyHistory);
  
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
  
    const todayAchieved = convertSecondsToMinutes(todayStudyTime) >= dailyGoal;
    console.log('Today achieved:', todayAchieved, 'Today study time:', todayStudyTime, 'Daily goal:', dailyGoal);
  
    if (todayAchieved) {
      currentStreak = 1;
      console.log('Today goal achieved, starting streak at 1');
    } else {
      console.log('Today goal not achieved, starting streak at 0');
    }
  
    for (let i = 0; i < studyHistory.length; i++) {
      const entry = studyHistory[i];
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
  
      console.log(`Checking entry: ${entryDate.toISOString()}, study duration: ${entry.studyDuration}`);
  
      if (entryDate.getTime() === currentDate.getTime()) {
        console.log('Skipping today\'s entry');
        continue;
      }
  
      const dayDifference = (currentDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      console.log(`Day difference: ${dayDifference}`);
  
      if (dayDifference === 1 && (entry.studyDuration >= dailyGoal * 60)) {
        currentStreak++;
        currentDate = entryDate;
        console.log(`Streak increased to ${currentStreak}`);
      } else {
        console.log('Streak chain broken');
        break;
      }
    }
  
    console.log('Final calculated streak:', currentStreak);
    return currentStreak;
  }, [userId, dailyGoal, todayStudyTime, convertSecondsToMinutes]);

  // ----------------------------------------
  // データ読み込み
  // ----------------------------------------
  const loadData = useCallback(async () => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTimestamp < 60000) { // 1分以内の更新は行わない
      return;
    }
  
    setIsLoading(true);
    try {
      console.log('Starting loadData function');
      // キャッシュされたデータがある場合はそれを使用
      if (cachedData) {
        setCurrentProgress(cachedData.currentProgress);
        setStreak(cachedData.streak);
        setTodayStudyTime(cachedData.todayStudyTime);
        setIsGoalAchieved(cachedData.isGoalAchieved);
        setIsLoading(false);
        return;
      }

      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }
      
      // すべてのセットを取得
      const allSets = await getAllSets(userId);
      
      // 総問題数を計算
      const totalItems = calculateTotalItems(allSets);
      console.log('総問題数:', totalItems);
      
      // 完了したアイテム数を計算
      const completedItems = calculateCompletedItems();
      console.log('完了した問題数:', completedItems);
      
      // 現在の進捗を計算
      const newCurrentProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      console.log('現在の進捗:', newCurrentProgress.toFixed(2) + '%');
      
      // 現在の進捗を更新
      await updateCurrentProgress(userId, newCurrentProgress);
      
      setCurrentProgress(newCurrentProgress);
      
      const studyHistoryData = await getStudyHistory(userId);
      console.log('Raw Study History Data:', studyHistoryData);
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 最新のセッションデータを取得
      let latestSessionDuration = 0;
      for (const set of allSets) {
        const sessionState = await getSessionState(userId, set.id, set.type);
        if (sessionState && sessionState.date && new Date(sessionState.date) >= today) {
          latestSessionDuration += sessionState.studyDuration || 0;
        }
      }

      console.log('Latest Session Duration:', latestSessionDuration);

      let totalStudyTimeToday = studyHistoryData
        .filter(entry => {
          const entryDate = new Date(entry.date);
          console.log('Entry date:', entryDate, 'Today:', today, 'Is same day:', entryDate.toDateString() === today.toDateString());
          return entryDate.toDateString() === today.toDateString();
        })
        .reduce((total, entry) => {
          console.log('Adding study duration:', entry.studyDuration);
          return total + (entry.studyDuration || 0);
        }, 0);

      console.log('Total Study Time Today (from history):', totalStudyTimeToday);

      // 最新のセッションデータを含めた今日の総学習時間を設定
      const finalTotalStudyTime = totalStudyTimeToday + latestSessionDuration;
      console.log('Final Total Study Time:', finalTotalStudyTime);
      setTodayStudyTime(finalTotalStudyTime);

      // 今日の学習時間を取得
      const newTodayStudyTime = await calculateTodayStudyTime(userId);
      console.log('New today study time:', newTodayStudyTime);  // デバッグ用ログ
      setTodayStudyTime(newTodayStudyTime);

      // 新しいstreakを計算
      const newStreak = await calculateStreak();
      console.log('New streak calculated:', newStreak);

      // キャッシュを更新
      setCachedData({
        currentProgress: newCurrentProgress,
        streak: newStreak,
        todayStudyTime: newTodayStudyTime,
        isGoalAchieved: convertSecondsToMinutes(newTodayStudyTime) >= dailyGoal,
      });

      setLastUpdateTimestamp(currentTime);
    } catch (error) {
      console.error("データの読み込み中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, calculateStreak, dailyGoal, convertSecondsToMinutes]);

  // ----------------------------------------
  // 副作用
  // ----------------------------------------
  // データ読み込み
  useEffect(() => {
    loadData();
  }, [loadData, recentActivities]);

  // 目標達成の判定
  useEffect(() => {
    setIsGoalAchieved(convertSecondsToMinutes(todayStudyTime) >= dailyGoal);
  }, [todayStudyTime, dailyGoal, convertSecondsToMinutes]);

  // 日次目標の更新
  useEffect(() => {
    setDailyGoal(externalDailyGoal);
  }, [externalDailyGoal]);

  // todayStudyTimeが変更されたときにstreakを更新
  useEffect(() => {
    console.log('Today study time updated:', todayStudyTime);
    if (convertSecondsToMinutes(todayStudyTime) >= dailyGoal && 
        convertSecondsToMinutes(prevTodayStudyTimeRef.current) < dailyGoal) {
      console.log('Daily goal newly achieved. Triggering data reload...');
      loadData();
    }
    prevTodayStudyTimeRef.current = todayStudyTime;
  }, [todayStudyTime, dailyGoal, loadData, convertSecondsToMinutes]);

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
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