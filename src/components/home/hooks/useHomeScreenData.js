/**
 * =============================================
 * ホーム画面データフック
 * =============================================
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getAllSets, 
  getSessionState, 
  getStudyHistory, 
  getUserMaxProgress, 
  updateUserMaxProgress, 
  getCurrentProgress, 
  updateCurrentProgress,
  calculateCurrentProgress
} from '../../../utils/firebase/firestore';

/**
 * @hook useHomeScreenData
 * @description ホーム画面のデータを管理するカスタムフック
 * @param {string} userId - ユーザーID
 * @param {number} externalDailyGoal - 外部から設定される日次目標
 */
const useHomeScreenData = (userId, externalDailyGoal) => {
  // ----------------------------------------
  // ステート管理
  // ----------------------------------------
  const [currentProgress, setCurrentProgress] = useState(0);
  const [maxProgress, setMaxProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studyHistory, setStudyHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(externalDailyGoal);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ----------------------------------------
  // ユーティリティ関数
  // ----------------------------------------
  /**
   * @function convertSecondsToMinutes
   * @description 秒を分に変換する
   */
  const convertSecondsToMinutes = useCallback((seconds) => {
    return Math.floor(seconds / 60);
  }, []);

  /**
   * @function calculateTotalItems
   * @description 全アイテム数を計算する
   */
  const calculateTotalItems = useCallback((sets) => {
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
        flashcardItems += set.cards ? set.cards.length : 0;
      } else if (set.type === 'qa') {
        qaSets.add(set.title);
        qaItems += set.qaItems ? set.qaItems.length : 0;
      }
    });

    console.log('After first pass:');
    console.log('- Flashcard items:', flashcardItems);
    console.log('- QA items:', qaItems);

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

  /**
   * @function calculateCompletedItems
   * @description 完了したアイテム数を計算する
   */
  const calculateCompletedItems = useCallback(async (userId, sets) => {
    let completedItems = 0;
    for (const set of sets) {
      const sessionState = await getSessionState(userId, set.id, set.type);
      if (sessionState) {
        switch (set.type) {
          case 'flashcard':
            completedItems += sessionState.studiedCards ? sessionState.studiedCards.length : 0;
            console.log(`Flashcard set "${set.title}": ${sessionState.studiedCards ? sessionState.studiedCards.length : 0} completed items`);
            break;
          case 'qa':
          case 'multiple-choice':
            completedItems += sessionState.studiedQuestions ? sessionState.studiedQuestions.length : 0;
            console.log(`${set.type === 'qa' ? 'QA' : 'Multiple-choice'} set "${set.title}": ${sessionState.studiedQuestions ? sessionState.studiedQuestions.length : 0} completed items`);
            break;
          case 'classification':
            completedItems += sessionState.studiedItems ? sessionState.studiedItems.length : 0;
            console.log(`Classification set "${set.title}": ${sessionState.studiedItems ? sessionState.studiedItems.length : 0} completed items`);
            break;
          default:
            console.log(`Unknown set type for "${set.title}"`);
        }
      }
    }
    console.log('Total completed items:', completedItems);
    return completedItems;
  }, []);

  /**
   * @function calculateStreak
   * @description 学習の連続日数を計算する
   */
  const calculateStreak = useCallback(async (userId) => {
    const studyHistory = await getStudyHistory(userId);
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < studyHistory.length; i++) {
      const entry = studyHistory[i];
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      if (currentDate.getTime() - entryDate.getTime() > 24 * 60 * 60 * 1000) {
        break;
      }
      
      if (entryDate.getTime() === currentDate.getTime() && entry.studyDuration >= dailyGoal * 60) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    return streak;
  }, [dailyGoal]);

  // ----------------------------------------
  // データ読み込み
  // ----------------------------------------
  /**
   * @function loadData
   * @description ホーム画面に必要なデータを読み込む
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }
      
      // 現在の進捗を計算
      const newCurrentProgress = await calculateCurrentProgress(userId);
      
      // 最大進捗を取得
      const userMaxProgress = await getUserMaxProgress(userId);
      
      console.log('Current progress:', newCurrentProgress.toFixed(2) + '%');
      console.log('Max progress:', userMaxProgress.toFixed(2) + '%');
      
      // 現在の進捗を更新
      await updateCurrentProgress(userId, newCurrentProgress);
      
      // 最大進捗を更新（必要な場合）
      if (newCurrentProgress > userMaxProgress) {
        await updateUserMaxProgress(userId, newCurrentProgress);
      }
      
      setCurrentProgress(newCurrentProgress);
      setMaxProgress(Math.max(newCurrentProgress, userMaxProgress));
      
      const studyHistoryData = await getStudyHistory(userId);
      setStudyHistory(studyHistoryData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const totalStudyTimeToday = studyHistoryData
        .filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getFullYear() === today.getFullYear() &&
                 entryDate.getMonth() === today.getMonth() &&
                 entryDate.getDate() === today.getDate();
        })
        .reduce((total, entry) => total + entry.studyDuration, 0);

      setTodayStudyTime(totalStudyTimeToday);

      const newStreak = await calculateStreak(userId);
      setStreak(newStreak);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // ----------------------------------------
  // 副作用
  // ----------------------------------------
  // データ読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 目標達成の判定
  useEffect(() => {
    setIsGoalAchieved(convertSecondsToMinutes(todayStudyTime) >= dailyGoal);
  }, [todayStudyTime, dailyGoal, convertSecondsToMinutes]);

  // 日次目標の更新
  useEffect(() => {
    setDailyGoal(externalDailyGoal);
  }, [externalDailyGoal]);

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
  return {
    currentProgress,
    maxProgress,
    streak,
    studyHistory,
    dailyGoal,
    todayStudyTime,
    isGoalAchieved,
    convertSecondsToMinutes,
    isLoading
  };
};

export default useHomeScreenData;