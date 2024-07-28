import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import styles from '@/styles/modules/ShareScreen.module.css';

const PublicSetDetailsModal = ({ isOpen, onClose, set, onCopy, isAlreadyCopied }) => {
  if (!set) return null;

  const renderSetContent = () => {
    switch (set.type) {
      case 'flashcard':
        return (
          <div className="space-y-4">
            {set.cards.map((card, index) => (
              <div key={index} className={styles.card}>
                <h3 className={styles.cardTitle}>カード {index + 1}</h3>
                <p className={styles.cardContent}><strong>表面:</strong> {card.front}</p>
                <p className={styles.cardContent}><strong>裏面:</strong> {card.back}</p>
              </div>
            ))}
          </div>
        );
      case 'qa':
        return (
          <div className="space-y-4">
            {set.qaItems.map((item, index) => (
              <div key={index} className={styles.card}>
                <h3 className={styles.cardTitle}>質問 {index + 1}</h3>
                <p className={styles.cardContent}><strong>質問:</strong> {item.question}</p>
                <p className={styles.cardContent}><strong>回答:</strong> {item.answer}</p>
              </div>
            ))}
          </div>
        );
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            {set.questions.map((question, index) => (
              <div key={index} className={styles.card}>
                <h3 className={styles.cardTitle}>質問 {index + 1}</h3>
                <p className={styles.cardContent}><strong>質問:</strong> {question.question}</p>
                <p className={styles.cardContent}><strong>選択肢:</strong></p>
                <ul className="list-disc list-inside space-y-2">
                  {question.options.map((option, optIndex) => (
                    <li key={optIndex} className={option === question.correctAnswer ? `${styles.cardContent} font-bold` : styles.cardContent}>
                      {option} {option === question.correctAnswer && "(正解)"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      case 'classification':
        return (
          <div className="space-y-4">
            {set.categories.map((category, index) => (
              <div key={index} className={styles.card}>
                <h3 className={styles.cardTitle}>カテゴリー: {category.name}</h3>
                <ul className="list-disc list-inside space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={styles.cardContent}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      default:
        return <p className={styles.cardContent}>このセットタイプの詳細は表示できません。</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[700px] ${styles.dialogContent}`}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className={`${styles.dialogTitle} text-xl sm:text-2xl`}>{set.title}</DialogTitle>
          <DialogDescription className={`${styles.dialogDescription} mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between`}>
            <span className="text-sm sm:text-base">作成者: {set.authorDisplayName || set.originalAuthorId || '不明'}</span>
            <Badge variant="secondary" className="mt-2 sm:mt-0 text-xs sm:text-sm">
              {set.type === 'flashcard' ? 'フラッシュカード' :
               set.type === 'qa' ? '一問一答' :
               set.type === 'multiple-choice' ? '多肢選択' :
               set.type === 'classification' ? '分類' : set.type}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogBody}>
          {renderSetContent()}
        </div>
        <div className={styles.dialogFooter}>
          <Button variant="outline" onClick={onClose}>閉じる</Button>
          <Button 
            onClick={() => !isAlreadyCopied && onCopy(set.id)}
            disabled={isAlreadyCopied}
            variant={isAlreadyCopied ? "secondary" : "default"}
            className={isAlreadyCopied ? styles.copiedButton : ''}
          >
            {isAlreadyCopied ? 'コピー済み' : 'コピーする'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicSetDetailsModal;