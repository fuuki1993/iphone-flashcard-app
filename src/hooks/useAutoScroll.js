import { useEffect, useRef } from 'react';

export function useAutoScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    };

    element.addEventListener('focus', handleFocus);

    return () => {
      element.removeEventListener('focus', handleFocus);
    };
  }, []);

  return ref;
}