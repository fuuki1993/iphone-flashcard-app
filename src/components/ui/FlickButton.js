import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from '@/styles/modules/FlickButton.module.css';

const FlickButton = ({ main, options, onInput }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [activeOption, setActiveOption] = useState(null);
  const buttonRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const isButtonPressed = useRef(false);

  const getFlickDirection = useCallback((deltaX, deltaY) => {
    if (Math.abs(deltaX) < 50) return null;
    return deltaX > 0 ? 1 : 0; // Right: 1, Left: 0
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    if (!isButtonPressed.current) return;
    startPosRef.current = { x: clientX, y: clientY };
    setShowOptions(true);
    hasMoved.current = false;
  }, []);

  const handleMove = useCallback((clientX, clientY) => {
    if (!isButtonPressed.current || !showOptions) return;

    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;

    const direction = getFlickDirection(deltaX, deltaY);
    if (direction !== null) {
      hasMoved.current = true;
      setActiveOption(options[direction]);
    } else {
      setActiveOption(null);
    }
  }, [options, showOptions, getFlickDirection]);

  const handleEnd = useCallback(() => {
    if (!isButtonPressed.current) return;
    if (!hasMoved.current) {
      onInput(main.props.children[1].props.children);
    } else if (activeOption) {
      onInput(activeOption);
    }
    setShowOptions(false);
    setActiveOption(null);
    isButtonPressed.current = false;
  }, [main, onInput, activeOption]);

  useEffect(() => {
    const button = buttonRef.current;
    if (button) {
      const touchStart = (e) => {
        e.preventDefault();
        isButtonPressed.current = true;
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      };
      const touchMove = (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      };
      const mouseDown = (e) => {
        isButtonPressed.current = true;
        handleStart(e.clientX, e.clientY);
      };
      const mouseMove = (e) => handleMove(e.clientX, e.clientY);
      const mouseUp = () => {
        handleEnd();
        isButtonPressed.current = false;
      };

      button.addEventListener('touchstart', touchStart, { passive: false });
      button.addEventListener('mousedown', mouseDown);
      
      window.addEventListener('touchmove', touchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);

      return () => {
        button.removeEventListener('touchstart', touchStart);
        button.removeEventListener('mousedown', mouseDown);
        window.removeEventListener('touchmove', touchMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup', mouseUp);
      };
    }
  }, [handleStart, handleMove, handleEnd]);

  return (
    <div className={styles.flickButton}>
      <button
        ref={buttonRef}
        className={styles.mainButton}
      >
        {main}
      </button>
      {showOptions && (
        <>
          <div className={`${styles.optionLabel} ${styles.leftOption}`}>{options[0]}</div>
          <div className={`${styles.optionLabel} ${styles.rightOption}`}>{options[1]}</div>
        </>
      )}
      {activeOption && (
        <div className={styles.activeOption}>
          {activeOption}
        </div>
      )}
    </div>
  );
};

export default FlickButton;