// src/components/DroppableCategory.js
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

const DroppableCategory = ({ id, children }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className="droppable-category">
      {children}
    </div>
  );
};

export default DroppableCategory;