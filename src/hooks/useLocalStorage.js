import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // ローカルストレージから値を取得する関数
  const readValue = () => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // 保存された値を基にステートを初期化
  const [storedValue, setStoredValue] = useState(readValue);

  // 値を返し、ローカルストレージに保存する関数
  const setValue = (value) => {
    try {
      // 新しい値が関数の場合は、現在の値を引数として呼び出す
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // ステートを保存
      setStoredValue(valueToStore);
      // ローカルストレージに保存
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    setStoredValue(readValue());
  }, []);

  return [storedValue, setValue];
}