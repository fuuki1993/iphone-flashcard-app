import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export function useHashRouter() {
  const router = useRouter();
  const [hashPath, setHashPath] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setHashPath(hash);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const push = (path) => {
    window.location.hash = path;
  };

  return { hashPath, push };
}