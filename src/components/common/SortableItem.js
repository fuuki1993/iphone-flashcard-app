// ======================================
// ソート可能アイテムコンポーネント
// ======================================

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * @component SortableItem
 * @description ドラッグ＆ドロップでソート可能なアイテムを表示するコンポーネント
 * @param {string|number} id - アイテムの一意識別子
 * @param {React.ReactNode} content - アイテムの内容
 */
const SortableItem = ({ id, content }) => {
  // ----------------------------------------
  // ソート機能のフック
  // ----------------------------------------
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  // ----------------------------------------
  // スタイル定義
  // ----------------------------------------
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '8px',
    margin: '4px 0',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    cursor: 'grab',
  };

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {content}
    </div>
  );
};

export default SortableItem;