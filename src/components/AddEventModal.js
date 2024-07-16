import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from 'lucide-react';

const AddEventModal = ({ isOpen, onClose, onSave, onDelete, editingEvent }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      const eventDate = new Date(editingEvent.date);
      setDate(eventDate.toISOString().split('T')[0]);
      setTime(eventDate.toTimeString().slice(0, 5));
    } else {
      setTitle('');
      setDate('');
      setTime('');
    }
  }, [editingEvent]);

  const handleSave = () => {
    const eventDate = new Date(`${date}T${time}`);
    onSave({ id: editingEvent?.id, title, date: eventDate });
    onClose();
  };

  const handleDelete = () => {
    if (editingEvent) {
      onDelete(editingEvent.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingEvent ? '予定を編集' : '予定を追加'}</DialogTitle>
          <DialogDescription>
            {editingEvent ? '既存の予定を編集します。' : '新しい予定を追加します。'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              タイトル
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              日付
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              時間
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          {editingEvent && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          )}
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventModal;