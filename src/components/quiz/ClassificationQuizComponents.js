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
  // useDroppableフックを使用してドロップ機能を追加
  const { setNodeRef } = useDroppable({
    id: category.name,
    data: { category: category.name },
  });

  // クラス名をメモ化
  const className = useMemo(() => `
    ${styles.droppableCategory}
    ${feedbackColor ? styles[feedbackColor] : ''}
    ${isActive ? styles.active : ''}
    ${isWideScreen ? styles.wideScreenCategory : ''}
  `, [feedbackColor, isActive, isWideScreen]);

  return (
    <div ref={setNodeRef} className={className} style={style}>
      <div className={`${styles.categoryContent} ${isWideScreen ? styles.wideScreenCategoryContent : ''}`}>
        {category.image && (
          <img src={category.image} alt={category.name} className={`${styles.categoryImage} ${isWideScreen ? styles.wideScreenCategoryImage : ''}`} />
        )}
        <h3 className={`${styles.categoryName} ${isWideScreen ? styles.wideScreenCategoryName : ''}`}>{category.name}</h3>
      </div>
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';