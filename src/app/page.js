'use client';

import { useEffect } from 'react';
import { useHashRouter } from '@/utils/hashRouter';
import Home from '@/components/Home';

export default function Page() {
  const { hashPath, push } = useHashRouter();

  useEffect(() => {
    if (!hashPath) {
      push('home');
    }
  }, [hashPath, push]);

  return <Home />;
}