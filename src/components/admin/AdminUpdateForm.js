/**
 * =============================================
 * 管理者用更新フォームコンポーネント
 * =============================================
 */

import React, { useState } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form/textarea';
import { Input } from '@/components/ui/form/input';
import styles from '@/styles/modules/HomeScreen.module.css';

/**
 * @component AdminUpdateForm
 * @description 管理者が更新内容を入力し、Firestoreに保存するフォーム
 * @param {Function} onClose - フォームを閉じる関数
 */
const AdminUpdateForm = ({ onClose }) => {
  // ----------------------------------------
  // ステート管理
  // ----------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // ----------------------------------------
  // イベントハンドラ
  // ----------------------------------------
  /**
   * フォームを送信し、Firestoreにデータを保存する
   * @param {Event} e - フォーム送信イベント
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const db = getFirestore();
    try {
      await addDoc(collection(db, 'updates'), {
        title,
        content,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setContent('');
      alert('更新内容が保存されました。');
      onClose(); // ダイアログを閉じる
    } catch (error) {
      console.error('Error adding update:', error);
      alert('更新内容の保存に失敗しました。');
    }
  };

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <form onSubmit={handleSubmit} className={styles.adminUpdateForm}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        className={styles.eventFormInput}
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="更新内容を入力してください"
        rows={5}
        className={styles.eventFormInput}
      />
      <div className={styles.adminUpdateFormFooter}>
        <Button
          type="button"
          onClick={onClose}
          className={`${styles.adminUpdateFormButton} ${styles.adminUpdateFormCancelButton}`}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className={`${styles.adminUpdateFormButton} ${styles.adminUpdateFormSaveButton}`}
        >
          保存
        </Button>
      </div>
    </form>
  );
};

export default AdminUpdateForm;