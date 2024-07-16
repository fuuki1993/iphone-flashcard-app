import { useEffect } from 'react';
import { useHashRouter } from '@/utils/hashRouter';
import Home from '@/app/page';

export default function IndexPage() {
  const { hashPath, push } = useHashRouter();

  useEffect(() => {
    if (!hashPath) {
      push('home');
    }
  }, [hashPath, push]);

  return <Home />;
}