'use client';

import React, { useState, useCallback, useMemo, Suspense, lazy, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/feedback/progress';
import { Settings, PlusCircle, BookOpen, Trophy, BarChart2, Clock, Calendar, Share2, LogOut, FileText } from 'lucide-react';
import AddEventModal from '../schedule/AddEventModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AdminUpdateForm from '../admin/AdminUpdateForm';
import SignOut from '../auth/SignOut';
import FlickButton from '../ui/FlickButton';
import { Book } from 'lucide-react';

import useHomeScreenData from './hooks/useHomeScreenData';
import useRecentActivities from './hooks/useRecentActivities';
import useScheduledEvents from './hooks/useScheduledEvents';
import { useUpdateNotification } from './hooks/useUpdateNotification';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { checkUserRole } from '@/utils/firebase/auth';
import { calculateTodayStudyTime } from '@/utils/firebase/firestore';

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
 * @param {Function} onSignOut - サインアウト関数
 * @param {boolean} isAdmin - 管理者権限フラグ
 * @param {Function} onOpenAdminUpdate - 管理者用更新フォームを開く関数
 */
const Header = ({ onOpenSettings, onOpenShare, onSignOut, isAdmin, onOpenAdminUpdate }) => (
  <div className={styles.header}>
    <h1 className={styles.title}>暗記アプリ</h1>
    <div className={styles.headerButtons}>
      <Button variant="ghost" size="sm" onClick={onOpenShare}>
        <Share2 className="text-gray-600 h-5 w-5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenSettings}>
        <Settings className="text-gray-600 h-5 w-5" />
      </Button>
      {isAdmin && (
        <Button variant="ghost" size="sm" onClick={onOpenAdminUpdate}>
          <FileText className="text-gray-600 h-5 w-5" />
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onSignOut}>
        <LogOut className="text-gray-600 h-5 w-5" />
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
const ProgressCard = ({ streak, currentProgress, handleShowStatistics }) => {
  return (
    <Card className={styles.progressCard}>
      <CardContent className={styles.progressCardContent}>
        <div className={styles.streakInfo}>
          <div className={styles.streakText}>
            <Trophy className="mr-1 text-gray-300" size={16} />
            <span className={styles.streakCount}>
              継続: {streak || 0}日
            </span>
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
};

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
          <p className={styles.emptyMessage}>未完���のセッションはありません</p>
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
 * @param {Function} formatEventDate - イント日付のフォーマット関数
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
 * 日々の学習目標と進捗を表るカード
 * @param {number} todayStudyTimeMinutes - 今日の学習時間（分）
 * @param {number} dailyGoal - 1日の目標学習時間（分）
 * @param {boolean} isGoalAchieved - 目標達成フラグ
 */
const DailyGoalCard = ({ todayStudyTimeMinutes, dailyGoal, isGoalAchieved }) => {
  const progressValue = Math.min((todayStudyTimeMinutes / dailyGoal) * 100, 100);

  return (
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
            {todayStudyTimeMinutes}分 / {dailyGoal}分
          </span>
        </div>
        <div className={styles.dailyGoalProgressWrapper}>
          <div
            className={styles.dailyGoalProgressBar}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {isGoalAchieved && (
          <p className={styles.goalAchieved}>目標達成！</p>
        )}
      </CardContent>
    </Card>
  );
};

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
  const [todayStudyTime, setTodayStudyTime] = useState(0);

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
  const homeScreenData = useHomeScreenData(userId, dailyGoal, refreshTrigger, recentActivitiesData.calculateTotalStudiedItems, cachedHomeScreenData, setCachedHomeScreenData);
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

  const convertSecondsToMinutes = (seconds) => {
    return Math.floor(seconds / 60);
  };

  useEffect(() => {
    const fetchTodayStudyTime = async () => {
      if (userId) {
        const time = await calculateTodayStudyTime(userId);
        setTodayStudyTime(time);
      }
    };
    fetchTodayStudyTime();
  }, [userId]);

  const handleOpenAdminUpdate = useCallback(() => {
    setIsAdminUpdateDialogOpen(true);
  }, []);

  const handleFlickInput = useCallback((option) => {
    if (option === '問題管理') {
      onCreateSet();
    } else if (option === '学習開始') {
      onStartLearning();
    }
  }, [onCreateSet, onStartLearning]);

  // メモ化されたコンポーネント
  const MemoizedProgressCard = useMemo(() => {
    return (
      <ProgressCard 
        streak={homeScreenData.streak} 
        currentProgress={homeScreenData.currentProgress}
        handleShowStatistics={handleShowStatistics} 
      />
    );
  }, [homeScreenData.streak, homeScreenData.currentProgress, handleShowStatistics]);

  const MemoizedDailyGoalCard = useMemo(() => (
    <DailyGoalCard 
      todayStudyTimeMinutes={convertSecondsToMinutes(todayStudyTime)} 
      dailyGoal={dailyGoal} 
      isGoalAchieved={todayStudyTime >= dailyGoal * 60} 
    />
  ), [todayStudyTime, dailyGoal]);

  // スケルトンローディングの改善
  if (homeScreenData.isLoading || recentActivitiesData.isLoading || scheduledEventsData.isLoading) {
    return <SkeletonLoading />;
  }

  if (showStatistics) {
    return (
      <Suspense fallback={<div>統計データを読み込み中...</div>}>
        <StatisticsScreen onBack={handleBackFromStatistics} userId={userId} />
      </Suspense>
    );
  }

  return (
    <div className={styles.container}>
      <Header 
        onOpenSettings={onOpenSettings} 
        onOpenShare={handleOpenShare}
        onSignOut={onSignOut}
        isAdmin={isAdmin}
        onOpenAdminUpdate={handleOpenAdminUpdate}
      />
      <div className={styles.scrollableContent}>
        {MemoizedProgressCard}

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

        {MemoizedDailyGoalCard}
      </div>

      <div className={styles.flickButtonContainer}>
        <FlickButton 
          main={<><Book size={20} /><span>選択</span></>}
          options={['問題管理', '学習開始']}
          onInput={handleFlickInput}
        />
      </div>

      <AddEventModal
        isOpen={scheduledEventsData.isAddEventModalOpen}
        onClose={() => scheduledEventsData.setIsAddEventModalOpen(false)}
        onSave={scheduledEventsData.handleSaveEvent}
        onDelete={scheduledEventsData.handleDeleteEvent}
        editingEvent={scheduledEventsData.editingEvent}
      />

      <Dialog open={isUpdateDialogOpen} onOpenChange={closeUpdateDialog}>
        <DialogContent className={styles.updateDialog}>
          <DialogHeader>
            <DialogTitle className={styles.updateDialogTitle}>更新情報</DialogTitle>
          </DialogHeader>
          <DialogDescription className={styles.updateDialogDescription}>
            {updateContents.map((content, index) => (
              <div key={index} className={index > 0 ? styles.updateContentItem : ""}>
                {content}
              </div>
            ))}
          </DialogDescription>
          <Button onClick={closeUpdateDialog} className={styles.updateDialogCloseButton}>
            閉じる
          </Button>
        </DialogContent>
      </Dialog>

      {isAdmin && (
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
    <div className={styles.skeletonTabs}></div>
    <div className={styles.skeletonCard}></div>
  </div>
);

export default HomeScreen;