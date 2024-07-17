'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/iphone-flashcard-app' + window.location.pathname);
  }, []);

  return null;
}