/**
 * =============================================
 * スケジュールイベント管理カスタムフック
 * =============================================
 */

import { useState, useCallback, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const STORAGE_KEY_PREFIX = 'scheduledEvents_';

const useScheduledEvents = (cachedEvents, setCachedEvents) => {
  const [scheduledEvents, setScheduledEvents] = useState(cachedEvents || []);
  const [isLoading, setIsLoading] = useState(!cachedEvents);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (cachedEvents) {
      setScheduledEvents(cachedEvents);
      setIsLoading(false);
    } else {
      loadEvents();
    }
  }, [cachedEvents]);

  const loadEvents = useCallback(() => {
    setIsLoading(true);
    if (user) {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      const storedEvents = localStorage.getItem(storageKey);
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        setScheduledEvents(parsedEvents);
        setCachedEvents(parsedEvents);
      }
    }
    setIsLoading(false);
  }, [user, setCachedEvents]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const saveEventsToStorage = useCallback((events) => {
    if (user) {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(events));
    }
  }, [user]);

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setIsAddEventModalOpen(true);
  }, []);

  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setIsAddEventModalOpen(true);
  }, []);

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

  const handleDeleteEvent = useCallback((eventId) => {
    if (user) {
      setScheduledEvents(prevEvents => {
        const updatedEvents = prevEvents.filter(event => event.id !== eventId);
        saveEventsToStorage(updatedEvents);
        return updatedEvents;
      });
    }
  }, [user, saveEventsToStorage]);

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

  const formatEventDate = useCallback((date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return {
    scheduledEvents,
    isAddEventModalOpen,
    editingEvent,
    handleAddEvent,
    handleEditEvent,
    handleSaveEvent,
    handleDeleteEvent,
    formatEventDate,
    setIsAddEventModalOpen,
    isLoading
  };
};

export default useScheduledEvents;