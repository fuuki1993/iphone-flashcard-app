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
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Trash2 } from 'lucide-react';
import styles from '@/styles/modules/HomeScreen.module.css';

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
      <DialogContent className={styles.eventDialog}>
        <DialogHeader>
          <DialogTitle className={styles.eventDialogTitle}>
            {editingEvent ? '予定を編集' : '予定を追加'}
          </DialogTitle>
          <DialogDescription className={styles.eventDialogDescription}>
            {editingEvent ? '既存の予定を編集します。' : '新しい予定を追加します。'}
          </DialogDescription>
        </DialogHeader>
        <form className={styles.eventForm}>
          <div>
            <Label htmlFor="title" className={styles.eventFormLabel}>
              タイトル
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.eventFormInput}
            />
          </div>
          <div>
            <Label htmlFor="date" className={styles.eventFormLabel}>
              日付
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.eventFormInput}
            />
          </div>
          <div>
            <Label htmlFor="time" className={styles.eventFormLabel}>
              時間
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={styles.eventFormInput}
            />
          </div>
        </form>
        <DialogFooter className={styles.eventFormFooter}>
          {editingEvent && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className={`${styles.eventFormButton} ${styles.eventFormDeleteButton}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          )}
          <Button
            onClick={handleSave}
            className={`${styles.eventFormButton} ${styles.eventFormSaveButton}`}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventModal;