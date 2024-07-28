'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Eye, EyeOff, Image, X } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, getBlob, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonCreationScreen.module.css';

const FlashcardCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '', image: null }]);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const inputRef = useAutoScroll();
  const fileInputRefs = useRef([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // ローカルストレージからデータを復元
    const savedData = localStorage.getItem('flashcardCreationData');
    if (savedData) {
      const { title, cards } = JSON.parse(savedData);
      setSetTitle(title);
      setCards(cards);
    }
  }, []);

  useEffect(() => {
    // データをローカルストレージに保存
    localStorage.setItem('flashcardCreationData', JSON.stringify({ title: setTitle, cards: cards }));
  }, [setTitle, cards]);

  const addCard = useCallback(() => {
    setCards(prevCards => [...prevCards, { front: '', back: '', image: null }]);
  }, []);

  const updateCard = useCallback((index, field, value) => {
    setCards(prevCards => prevCards.map((card, i) => 
      i === index ? { ...card, [field]: value } : card
    ));
  }, []);

  const removeCard = useCallback((index) => {
    setCards(prevCards => prevCards.filter((_, i) => i !== index));
  }, []);

  const handleImageUpload = useCallback(async (index, file) => {
    if (!user) {
      console.error("User is not authenticated");
      setErrors(prevErrors => ({ ...prevErrors, image: "ユーザー認証が必要です。" }));
      return;
    }

    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `flashcards/${user.uid}/temp_${Date.now()}_${index}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateCard(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [user, updateCard]);

  const handleDrop = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(index, file);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAreaClick = useCallback((index) => {
    fileInputRefs.current[index].click();
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    cards.forEach((card, index) => {
      if (!card.front.trim() && !card.back.trim() && !card.image) {
        newErrors[`card${index}`] = 'カードの表面または裏面、もしくは画像を入力してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, cards]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!validateForm()) {
      console.error("Form validation failed");
      return;
    }
    if (!user) {
      console.error("User not authenticated");
      setErrors(prevErrors => ({ ...prevErrors, save: "ユーザー認証が必要です。再度ログインしてください。" }));
      return;
    }
    setIsSaving(true);
    try {
      const newSet = {
        title: setTitle,
        cards: await Promise.all(cards.map(async (card, i) => {
          if (card.image) {
            const storage = getStorage();
            const oldRef = ref(storage, card.image);
            const newRef = ref(storage, `flashcards/${user.uid}/card_${Date.now()}_${i}`);
            
            const oldBlob = await getBlob(oldRef);
            await uploadBytes(newRef, oldBlob);
            const newUrl = await getDownloadURL(newRef);
            await deleteObject(oldRef);

            return { ...card, image: newUrl };
          }
          return card;
        })),
        type: 'flashcard'
      };

      const savedSet = await saveSet(newSet, user.uid);

      localStorage.removeItem('flashcardCreationData');
      onSave(savedSet);
    } catch (error) {
      console.error("Error saving set:", error);
      setErrors(prevErrors => ({ ...prevErrors, save: `セットの保存中にエラーが発生しました: ${error.message}` }));
    } finally {
      setIsSaving(false);
    }
  }, [setTitle, cards, validateForm, onSave, user, isSaving]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const removeImage = useCallback((index) => {
    updateCard(index, 'image', null);
  }, [updateCard]);

  return (
    <div className={styles.creationScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">フラッシュカード作成</h1>
        </div>

        <div className="mb-6">
          <Input
            ref={inputRef}
            placeholder="セットのタイトル"
            value={setTitle}
            onChange={(e) => setSetTitle(e.target.value)}
            className={`${styles.mobileFriendlyInput} ${styles.setTitle} mb-2`}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        <Button onClick={togglePreviewMode} className={styles.previewButton}>
          {previewMode ? <EyeOff className={styles.previewButtonIcon} /> : <Eye className={styles.previewButtonIcon} />}
          {previewMode ? 'プレビューを終了' : 'プレビュー'}
        </Button>

        {previewMode ? (
          <div className={styles.previewContent}>
            <h2 className={styles.previewTitle}>{setTitle}</h2>
            <div className={styles.previewCategoriesContainer}>
              {cards.map((card, index) => (
                <div key={index} className={styles.previewCategory}>
                  <div className={styles.previewCategoryHeader}>
                    <h3 className={styles.previewCategoryTitle}>カード {index + 1}</h3>
                    {card.image && <img src={card.image} alt={`Card ${index + 1}`} className={styles.previewImage} />}
                  </div>
                  <p><strong>表面:</strong> {card.front}</p>
                  <p><strong>裏面:</strong> {card.back}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.categoriesGrid}>
            {cards.map((card, index) => (
              <Card key={`card-${index}`} className={styles.categoryCard}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">カード {index + 1}</CardTitle>
                  <div>
                    <Button variant="ghost" size="icon" onClick={() => removeCard(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="表面"
                    value={card.front}
                    onChange={(e) => updateCard(index, 'front', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                  />
                  <div
                    onDrop={(e) => handleDrop(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onClick={() => handleAreaClick(index)}
                    className="relative border-2 border-dashed border-gray-300 p-4 rounded-md cursor-pointer"
                  >
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(index, e.target.files[0])}
                      className="hidden"
                      ref={el => fileInputRefs.current[index] = el}
                    />
                    {card.image ? (
                      <div className="relative">
                        <img src={card.image} alt="Uploaded image" className={styles.previewImage} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute top-2 right-2 bg-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Image className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">画像をドラッグ＆ドロップするか、クリックして選択してください</p>
                      </div>
                    )}
                  </div>
                  <Textarea
                    placeholder="裏面"
                    value={card.back}
                    onChange={(e) => updateCard(index, 'back', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mt-2`}
                  />
                </CardContent>
                <CardFooter>
                  {errors[`card${index}`] && <Alert variant="destructive"><AlertDescription>{errors[`card${index}`]}</AlertDescription></Alert>}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className={styles.fixedBottom}>
        <div className={styles.bottomButtonContainer}>
          <Button onClick={addCard} className={`${styles.bottomButton} ${styles.addButton}`}>
            <Plus className="mr-2 h-4 w-4" /> カードを追加
          </Button>
          <Button onClick={handleSave} className={`${styles.bottomButton} ${styles.saveButton}`}>
            <Save className="mr-2 h-4 w-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCreationScreen;