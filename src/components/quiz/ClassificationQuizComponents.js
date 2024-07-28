import React, { memo, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import styles from '@/styles/modules/quiz/ClassificationQuizComponents.module.css';

// ドラッグ可能なアイテムコンポーネント
export const SortableItem = memo(({ id, children, isDragging, isClassified, isWideScreen }) => {
  // useSortableフックを使用してドラッグ＆ドロップの機能を追加
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  // スタイルをメモ化
  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  }), [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.sortableItem} ${isClassified ? styles.classified : ''} ${isDragging ? styles.dragging : ''} ${isWideScreen ? styles.wideScreenItem : ''}`}
    >
      {children}
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

// ドロップ可能なカテゴリーコンポーネント
export const DroppableCategory = memo(({ category, isActive, feedbackColor, style, isWideScreen }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: category.name || category.id || `category-${category.index}`,
    data: { category: category.name || category.id || `category-${category.index}` },
  });

  const className = useMemo(() => `
    ${styles.droppableCategory}
    ${feedbackColor ? styles[feedbackColor] : ''}
    ${isActive ? styles.active : ''}
    ${isOver ? styles.isOver : ''}
    ${isWideScreen ? styles.wideScreenCategory : ''}
  `, [feedbackColor, isActive, isOver, isWideScreen]);

  return (
    <div ref={setNodeRef} className={className} style={style}>
      <div className={`${styles.categoryContent} ${isWideScreen ? styles.wideScreenCategoryContent : ''}`}>
        {category.image && (
          <img 
            src={category.image} 
            alt={category.name || "Category image"} 
            className={`${styles.categoryImage} ${isWideScreen ? styles.wideScreenCategoryImage : ''}`}
            draggable="false"
          />
        )}
        {category.name && (
          <h3 className={`${styles.categoryName} ${isWideScreen ? styles.wideScreenCategoryName : ''}`}>
            {category.name}
          </h3>
        )}
        {!category.name && !category.image && (
          <div className={styles.placeholderCategory}>カテゴリー</div>
        )}
      </div>
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';