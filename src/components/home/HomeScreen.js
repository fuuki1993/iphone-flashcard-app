'use client';

import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/feedback/progress';
import { Settings, PlusCircle, BookOpen, Trophy, BarChart2, Clock, Calendar, Share2 } from 'lucide-react';
import AddEventModal from '../schedule/AddEventModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AdminUpdateForm from '../admin/AdminUpdateForm';
import SignOut from '../auth/SignOut';

import useHomeScreenData from './hooks/useHomeScreenData';
import useRecentActivities from './hooks/useRecentActivities';
import useScheduledEvents from './hooks/useScheduledEvents';
import { useUpdateNotification } from './hooks/useUpdateNotification';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { checkUserRole } from '@/utils/firebase/auth';

import styles from '@/styles/modules/HomeScreen.module.css';

// StatisticsScreenを遅延ロード
const StatisticsScreen = lazy(() => import('../statistics/StatisticsScreen'));

// ======================================
// ホーム画面コンポーネント
// ======================================

// ----------------------------------------
// ヘッダーコンポーネント
// ----------------------------------------
/**
 * アプリのヘッダーを表示する
 * @param {Function} onOpenSettings - 設定を開く関数
 * @param {Function} onOpenShare - 共有画面を開く関数
 */
const Header = ({ onOpenSettings, onOpenShare }) => (
  <div className={styles.header}>
    <h1 className={styles.title}>暗記アプリ</h1>
    <div className={styles.headerButtons}>
      <Button variant="ghost" size="sm" onClick={onOpenShare}>
        <Share2 className="text-gray-600 h-5 w-5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenSettings}>
        <Settings className="text-gray-600 h-5 w-5" />
      </Button>
    </div>
  </div>
);

// ----------------------------------------
// 進捗カードコンポーネント
// ----------------------------------------
/**
 * ユーザーの進捗状況を表示するカード
 * @param {number} streak - 継続日数
 * @param {number} currentProgress - 現在の進捗率
 * @param {Function} handleShowStatistics - 統計画面を表示する関数
 */
const ProgressCard = ({ streak, currentProgress, handleShowStatistics }) => (
  <Card className={styles.progressCard}>
    <CardContent className={styles.progressCardContent}>
      <div className={styles.streakInfo}>
        <div className={styles.streakText}>
          <Trophy className="mr-1 text-gray-300" size={16} />
          <span className={styles.streakCount}>継続: {streak || 0}日</span>
        </div>
        <Button 
          variant="outline" 
          size="xs" 
          onClick={handleShowStatistics}
          className={styles.detailsButton}
        >
          <BarChart2 className="mr-1 h-3 w-3" />
          詳細
        </Button>
      </div>
      <p className={styles.progressLabel}>全体の進捗</p>
      <Progress value={currentProgress || 0} className="w-full h-2 bg-gray-600" indicatorClassName="bg-white" />
      <p className={styles.progressPercentage}>{(currentProgress || 0).toFixed(1)}%</p>
    </CardContent>
  </Card>
);

// ----------------------------------------
// アクションボタンコンポーネント
// ----------------------------------------
/**
 * セット作成と学習開始のボタンを表示する
 * @param {Function} onCreateSet - セット作成画面を開く関数
 * @param {Function} onStartLearning - 学習を開始する関数
 */
const ActionButtons = ({ onCreateSet, onStartLearning }) => (
  <div className={styles.actionButtons}>
    <Button className={styles.actionButton} onClick={onCreateSet}>
      <PlusCircle className="mr-1 h-3 w-3" />
      作成/編集
    </Button>
    <Button className={styles.actionButton} onClick={onStartLearning}>
      <BookOpen className="mr-1 h-3 w-3" />
      学習開始
    </Button>
  </div>
);

// ----------------------------------------
// 最近の学習タブコンテンツ
// ----------------------------------------
/**
 * 最近の学習活動を表示するタブ
 * @param {Array} recentActivities - 最近の学習活動リスト
 * @param {Function} renderActivityItem - 各活動項目をレンダリングする関数
 */
const RecentActivitiesTab = ({ recentActivities, renderActivityItem }) => (
  <TabsContent value="recent">
    <Card>
      <CardContent className="py-2 px-3">
        {recentActivities.length > 0 ? (
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {recentActivities.map(renderActivityItem)}
            </ul>
          </div>
        ) : (
          <p className={styles.emptyMessage}>未完了のセッションはありません</p>
        )}
      </CardContent>
    </Card>
  </TabsContent>
);

// ----------------------------------------
// 予定タブコンテンツ
// ----------------------------------------
/**
 * スケジュールされたイベントを表示するタブ
 * @param {Array} scheduledEvents - スケジュールされたイベントリスト
 * @param {Function} handleEditEvent - イベント編集関数
 * @param {Function} formatEventDate - イベント日付のフォーマット関数
 * @param {Function} handleAddEvent - イベント追加関数
 */
const ScheduledEventsTab = ({ scheduledEvents, handleEditEvent, formatEventDate, handleAddEvent }) => (
  <TabsContent value="scheduled">
    <Card>
      <CardContent className="py-2 px-3">
        <ul className="space-y-2">
          {scheduledEvents.map((event) => (
            <li key={event.id} className={styles.eventList}>
              <Calendar className="mr-3 text-blue-500" size={24} />
              <div className={styles.eventInfo} onClick={() => handleEditEvent(event)}>
                <span className={styles.eventTitle}>{event.title}</span>
                <p className={styles.eventDate}>{formatEventDate(event.date)}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button className={styles.addEventButton} onClick={handleAddEvent}>
          <PlusCircle className="mr-2 h-4 w-4" />
          予定を追加
        </Button>
      </CardContent>
    </Card>
  </TabsContent>
);

// ----------------------------------------
// 日次目標カードコンポーネント
// ----------------------------------------
/**
 * 日々の学習目標と進捗を表示するカード
 * @param {number} todayStudyTime - 今日の学習時間（秒）
 * @param {number} dailyGoal - 1日の目標学習時間（分）
 * @param {Function} convertSecondsToMinutes - 秒を分に変換する関数
 * @param {boolean} isGoalAchieved - 目標達成フラグ
 */
const DailyGoalCard = ({ todayStudyTime, dailyGoal, convertSecondsToMinutes, isGoalAchieved }) => (
  <Card className={styles.dailyGoalCard}>
    <CardHeader className={styles.dailyGoalHeader}>
      <CardTitle className={styles.dailyGoalTitle}>
        <Clock className="mr-2 text-gray-600" size={16} />
        今日の目標
      </CardTitle>
    </CardHeader>
    <CardContent className={styles.dailyGoalContent}>
      <div className={styles.dailyGoalInfo}>
        <span className={styles.dailyGoalText}>
          {convertSecondsToMinutes(todayStudyTime)}分 / {dailyGoal}分
        </span>
      </div>
      <div className={styles.dailyGoalProgressWrapper}>
        <Progress 
          value={(convertSecondsToMinutes(todayStudyTime) / dailyGoal) * 100} 
          className={styles.dailyGoalProgress}
        />
      </div>
      {isGoalAchieved && (
        <p className={styles.goalAchieved}>目標達成！</p>
      )}
    </CardContent>
  </Card>
);

// ======================================
// メインのHomeScreenコンポーネント
// ======================================
/**
 * ホーム画面の全体構造を定義するメインコンポーネント
 */
const HomeScreen = ({ 
  onCreateSet, 
  onStartLearning, 
  onShowStatistics, 
  onOpenSettings,
  onSignOut,
  userId,
  dailyGoal,
  setDailyGoal,
  navigateTo
}) => {
  const [showStatistics, setShowStatistics] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminUpdateDialogOpen, setIsAdminUpdateDialogOpen] = useState(false);
  const [cachedHomeScreenData, setCachedHomeScreenData] = useLocalStorage('homeScreenData', null);
  const [cachedRecentActivities, setCachedRecentActivities] = useLocalStorage('recentActivities', null);
  const [cachedScheduledEvents, setCachedScheduledEvents] = useLocalStorage('scheduledEvents', null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (userId) {
        const userRole = await checkUserRole(userId);
        setIsAdmin(userRole === 'admin');
      }
    };
    checkAdminStatus();
  }, [userId]);

  const { isUpdateDialogOpen, updateContents, closeUpdateDialog } = useUpdateNotification(userId);

  // 並列データ取得
  const recentActivitiesData = useRecentActivities(userId, onStartLearning, cachedRecentActivities, setCachedRecentActivities);
  const homeScreenData = useHomeScreenData(userId, dailyGoal, refreshTrigger, recentActivitiesData.calculateTotalStudiedItems);
  const scheduledEventsData = useScheduledEvents(cachedScheduledEvents, setCachedScheduledEvents);

  // 統計画面の表示を切り替える関数
  const handleShowStatistics = useCallback(() => {
    setShowStatistics(true);
  }, []);

  const handleBackFromStatistics = useCallback(() => {
    setShowStatistics(false);
  }, []);

  const handleOpenShare = useCallback(() => {
    navigateTo('share');
  }, [navigateTo]);

  // 統計画面の表示
  if (showStatistics) {
    return (
      <Suspense fallback={<div>Loading statistics...</div>}>
        <StatisticsScreen
          onBack={handleBackFromStatistics}
          totalStudyTime={homeScreenData.studyHistory.reduce((total, entry) => total + entry.studyDuration, 0)}
          todayStudiedCards={homeScreenData.todayStudyTime}
        />
      </Suspense>
    );
  }

  // スケルトンローディングの実装
  if (homeScreenData.isLoading || recentActivitiesData.isLoading || scheduledEventsData.isLoading) {
    return <SkeletonLoading />;
  }

  return (
    <div className={styles.container}>
      <Header onOpenSettings={onOpenSettings} onOpenShare={handleOpenShare} />
      <ProgressCard 
        streak={homeScreenData.streak} 
        currentProgress={homeScreenData.currentProgress}
        handleShowStatistics={handleShowStatistics} 
      />
      <ActionButtons onCreateSet={onCreateSet} onStartLearning={onStartLearning} />

      <Tabs defaultValue="recent" className={styles.tabs}>
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="recent" className={styles.tabTrigger}>最近の学習</TabsTrigger>
          <TabsTrigger value="scheduled" className={styles.tabTrigger}>予定</TabsTrigger>
        </TabsList>
        <RecentActivitiesTab 
          recentActivities={recentActivitiesData.recentActivities} 
          renderActivityItem={recentActivitiesData.renderActivityItem} 
        />
        <ScheduledEventsTab 
          scheduledEvents={scheduledEventsData.scheduledEvents} 
          handleEditEvent={scheduledEventsData.handleEditEvent} 
          formatEventDate={scheduledEventsData.formatEventDate} 
          handleAddEvent={scheduledEventsData.handleAddEvent} 
        />
      </Tabs>

      <DailyGoalCard 
        todayStudyTime={homeScreenData.todayStudyTime} 
        dailyGoal={homeScreenData.dailyGoal} 
        convertSecondsToMinutes={homeScreenData.convertSecondsToMinutes} 
        isGoalAchieved={homeScreenData.isGoalAchieved} 
      />

      <SignOut onSignOut={onSignOut} />

      <AddEventModal
        isOpen={scheduledEventsData.isAddEventModalOpen}
        onClose={() => scheduledEventsData.setIsAddEventModalOpen(false)}
        onSave={scheduledEventsData.handleSaveEvent}
        onDelete={scheduledEventsData.handleDeleteEvent}
        editingEvent={scheduledEventsData.editingEvent}
      />

      <Dialog open={isUpdateDialogOpen} onOpenChange={closeUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新情報</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {updateContents.map((content, index) => (
              <div key={index} className={index > 0 ? "mt-4" : ""}>
                {content}
              </div>
            ))}
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <>
          <Button 
            onClick={() => setIsAdminUpdateDialogOpen(true)} 
            className={styles.adminUpdateButton}
          >
            管理者用更新フォーム
          </Button>
          <Dialog 
            open={isAdminUpdateDialogOpen} 
            onOpenChange={setIsAdminUpdateDialogOpen}
          >
            <DialogContent className={styles.adminUpdateDialog}>
              <DialogHeader>
                <DialogTitle className={styles.adminUpdateDialogTitle}>
                  管理者用更新フォーム
                </DialogTitle>
                <DialogDescription className={styles.adminUpdateDialogDescription}>
                  更新内容を入力してください。
                </DialogDescription>
              </DialogHeader>
              <AdminUpdateForm onClose={() => setIsAdminUpdateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

// ----------------------------------------
// スケルトンローディングコンポーネント
// ----------------------------------------
/**
 * データ読み込み中に表示するスケルトン画面
 */
const SkeletonLoading = () => (
  <div className={styles.container}>
    <div className={styles.skeletonHeader}></div>
    <div className={styles.skeletonCard}></div>
    <div className={styles.skeletonButtons}></div>
    <div className={styles.skeletonTabs}></div>
    <div className={styles.skeletonCard}></div>
  </div>
);

export default HomeScreen;