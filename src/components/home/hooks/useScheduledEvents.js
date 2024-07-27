/**
 * =============================================
 * スケジュールイベント管理カスタムフック
 * =============================================
 */

import { useState, useCallback, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY_PREFIX = 'scheduledEvents_';

const useScheduledEvents = () => {
  // ----------------------------------------
  // ステート定義
  // ----------------------------------------
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [user, setUser] = useState(null);

  // ----------------------------------------
  // ユーザー認証状態の監視
  // ----------------------------------------
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ----------------------------------------
  // ローカルストレージからデータを読み込む
  // ----------------------------------------
  useEffect(() => {
    if (user) {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      const storedEvents = localStorage.getItem(storageKey);
      if (storedEvents) {
        setScheduledEvents(JSON.parse(storedEvents));
      } else {
        setScheduledEvents([]);
      }
    } else {
      setScheduledEvents([]);
    }
  }, [user]);

  // ----------------------------------------
  // ローカルストレージにデータを保存する関数
  // ----------------------------------------
  const saveEventsToStorage = useCallback((events) => {
    if (user) {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(events));
    }
  }, [user]);

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
    if (user) {
      setScheduledEvents(prevEvents => {
        let updatedEvents;
        if (newEvent.id) {
          updatedEvents = prevEvents.map(event => 
            event.id === newEvent.id ? newEvent : event
          );
        } else {
          updatedEvents = [...prevEvents, { ...newEvent, id: Date.now() }];
        }
        saveEventsToStorage(updatedEvents);
        return updatedEvents;
      });
      scheduleNotification(newEvent);
    }
  }, [user, saveEventsToStorage]);

  /**
   * イベントを削除する
   * @param {number} eventId - 削除するイベントのID
   */
  const handleDeleteEvent = useCallback((eventId) => {
    if (user) {
      setScheduledEvents(prevEvents => {
        const updatedEvents = prevEvents.filter(event => event.id !== eventId);
        saveEventsToStorage(updatedEvents);
        return updatedEvents;
      });
    }
  }, [user, saveEventsToStorage]);

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