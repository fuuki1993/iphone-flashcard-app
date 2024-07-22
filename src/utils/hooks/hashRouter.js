// useHashRouter.js

import { useEffect, useState } from 'react';

export function useHashRouter() {
  const [hashPath, setHashPath] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      console.log('Hash changed to:', newHash); // デバッグ用ログ
      setHashPath(newHash);
    };

    handleHashChange(); // 初期化時にも呼び出す
    window.addEventListener('hashchange', handleHashChange);
    setIsReady(true);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const push = (path) => {
    console.log('Pushing path:', path); // デバッグ用ログ
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  return { hashPath, push, isReady };
}