/**
 * =============================================
 * スケジュールイベント管理カスタムフック
 * =============================================
 */

import { useState, useCallback } from 'react';

/**
 * @hook useScheduledEvents
 * @description スケジュールされたイベントを管理するカスタムフック
 * @returns {Object} イベント管理に関する状態と関数
 */
const useScheduledEvents = () => {
  // ----------------------------------------
  // ステート定義
  // ----------------------------------------
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // ----------------------------------------
  // イベント操作関数
  // ----------------------------------------
  /**
   * 新規イベント追加モーダルを開く
   */
  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setIsAddEventModalOpen(true);
  }, []);

  /**
   * イベント編集モーダルを開く
   * @param {Object} event - 編集対象のイベント
   */
  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setIsAddEventModalOpen(true);
  }, []);

  /**
   * イベントを保存する
   * @param {Object} newEvent - 保存するイベント
   */
  const handleSaveEvent = useCallback((newEvent) => {
    setScheduledEvents(prevEvents => {
      if (newEvent.id) {
        return prevEvents.map(event => 
          event.id === newEvent.id ? newEvent : event
        );
      } else {
        return [...prevEvents, { ...newEvent, id: Date.now() }];
      }
    });
    scheduleNotification(newEvent);
  }, []);

  /**
   * イベントを削除する
   * @param {number} eventId - 削除するイベントのID
   */
  const handleDeleteEvent = useCallback((eventId) => {
    setScheduledEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  }, []);

  // ----------------------------------------
  // 通知関連関数
  // ----------------------------------------
  /**
   * イベントの通知をスケジュールする
   * @param {Object} event - 通知をスケジュールするイベント
   */
  const scheduleNotification = useCallback((event) => {
    const now = new Date();
    const eventTime = new Date(event.date);
    const timeUntilEvent = eventTime.getTime() - now.getTime();

    if (timeUntilEvent > 0) {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(event.title, {
            body: '予定の時間です！',
          });
        }
      }, timeUntilEvent);
    }
  }, []);

  // ----------------------------------------
  // ユーティリティ関数
  // ----------------------------------------
  /**
   * イベント日付をフォーマットする
   * @param {string} date - フォーマットする日付
   * @returns {string} フォーマットされた日付文字列
   */
  const formatEventDate = useCallback((date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ----------------------------------------
  // 返却値
  // ----------------------------------------
  return {
    scheduledEvents,
    isAddEventModalOpen,
    editingEvent,
    handleAddEvent,
    handleEditEvent,
    handleSaveEvent,
    handleDeleteEvent,
    formatEventDate,
    setIsAddEventModalOpen
  };
};

export default useScheduledEvents;