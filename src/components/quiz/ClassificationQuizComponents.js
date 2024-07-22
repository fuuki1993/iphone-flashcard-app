import React, { memo, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

// ドラッグ可能なアイテムコンポーネント
export const SortableItem = memo(({ id, children, isDragging, isClassified }) => {
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
      className={`inline-block p-4 m-2 rounded border text-2xl font-semibold ${
        isClassified ? 'bg-gray-100' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : 'shadow'} transform rotate-90`}
    >
      {children}
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

// ドロップ可能なカテゴリーコンポーネント
export const DroppableCategory = memo(({ category, isActive, feedbackColor, style }) => {
  // useDroppableフックを使用してドロップ機能を追加
  const { setNodeRef } = useDroppable({
    id: category.name,
    data: { category: category.name },
  });

  // クラス名をメモ化
  const className = useMemo(() => `
    flex flex-col items-center justify-center rounded transition-all duration-300
    ${feedbackColor ? feedbackColor : 'bg-gray-100'}
    ${isActive ? 'border-2 border-blue-500' : ''}
    w-full h-full
  `, [feedbackColor, isActive]);

  return (
    <div ref={setNodeRef} className={className} style={style}>
      {category.image && (
        <img src={category.image} alt={category.name} className="w-full h-24 object-cover mb-2 transform rotate-90" />
      )}
      <h3 className="text-center transform rotate-90">{category.name}</h3>
    </div>
  );
});

DroppableCategory.displayName = 'DroppableCategory';