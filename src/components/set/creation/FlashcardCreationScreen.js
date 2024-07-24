'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, getBlob, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonCreationScreen.module.css';

const FlashcardCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '', image: null }]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const inputRef = useAutoScroll();
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleImageUpload = useCallback(async (index, event) => {
    if (!user) {
      console.error("User is not authenticated");
      setErrors(prevErrors => ({ ...prevErrors, image: "ユーザー認証が必要です。" }));
      return;
    }

    const file = event.target.files[0];
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

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    cards.forEach((card, index) => {
      if (!card.front.trim() || !card.back.trim()) {
        newErrors[`card${index}`] = 'カードの表面と裏面を入力してください。';
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

  const togglePreview = useCallback((index) => {
    setPreviewIndex(prevIndex => prevIndex === index ? null : index);
  }, []);

  return (
    <div className={styles.mobileFriendlyForm}>
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
            className={`${styles.mobileFriendlyInput} mb-2`}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        {cards.map((card, index) => (
          <Card key={index} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">カード {index + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => togglePreview(index)}>
                  {previewIndex === index ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeCard(index)} >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewIndex === index ? (
                <div className="bg-gray-100 p-4 rounded-md">
                  <h3 className="font-bold mb-2">表面:</h3>
                  <p>{card.front}</p>
                  {card.image && <img src={card.image} alt="Card front" className="mt-2 max-w-full h-auto" />}
                  <h3 className="font-bold mt-4 mb-2">裏面:</h3>
                  <p>{card.back}</p>
                </div>
              ) : (
                <>
                  <Textarea
                    ref={inputRef}
                    placeholder="表面"
                    value={card.front}
                    onChange={(e) => updateCard(index, 'front', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                  />
                  <Textarea
                    ref={inputRef}
                    placeholder="裏面"
                    value={card.back}
                    onChange={(e) => updateCard(index, 'back', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                  />
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                  />
                  {card.image && <img src={card.image} alt="Uploaded" className="mt-2 max-w-full h-auto" />}
                </>
              )}
            </CardContent>
            <CardFooter>
              {errors[`card${index}`] && <Alert variant="destructive"><AlertDescription>{errors[`card${index}`]}</AlertDescription></Alert>}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className={styles.fixedBottom}>
        <div className="flex justify-between">
          <Button onClick={addCard}>
            <Plus className="mr-2 h-4 w-4" /> カードを追加
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" /> {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCreationScreen;