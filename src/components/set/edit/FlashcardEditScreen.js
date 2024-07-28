'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff, X } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firebase/firestore';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, getDoc, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonEditScreen.module.css';

const FlashcardEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [cards, setCards] = useState([]);
  const [errors, setErrors] = useState({});
  const [originalCards, setOriginalCards] = useState([]);
  const [user, setUser] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRefs = useRef([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadSetsAndData = async () => {
      if (user) {
        try {
          const loadedSets = await getSets(user.uid);
          const flashcardSets = loadedSets.filter(set => set.type === 'flashcard');
          setSets(flashcardSets);
  
          const lastEditedSetId = localStorage.getItem('lastEditedFlashcardSetId');
          if (lastEditedSetId) {
            const cachedSet = localStorage.getItem(`flashcardSet_${lastEditedSetId}`);
            if (cachedSet) {
              const parsedSet = JSON.parse(cachedSet);
              setSelectedSetId(lastEditedSetId);
              setSetTitle(parsedSet.title);
              setCards(parsedSet.cards);
              setOriginalCards(parsedSet.cards);
            } else {
              await loadSetData(lastEditedSetId);
            }
          }
        } catch (error) {
          console.error("Error loading sets:", error);
          setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
        }
      }
    };
    loadSetsAndData();
  }, [user]);

  const loadSetData = async (setId) => {
    try {
      const set = await getSetById(user.uid, setId);
      setSetTitle(set.title);
      setCards(set.cards || []);
      setOriginalCards(set.cards || []);
      localStorage.setItem(`flashcardSet_${setId}`, JSON.stringify(set));
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
    }
  };

  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    localStorage.setItem('lastEditedFlashcardSetId', value);
    if (user) {
      const cachedSet = localStorage.getItem(`flashcardSet_${value}`);
      if (cachedSet) {
        const parsedSet = JSON.parse(cachedSet);
        setSetTitle(parsedSet.title);
        setCards(parsedSet.cards);
        setOriginalCards(parsedSet.cards);
      } else {
        await loadSetData(value);
      }
    }
  };

  const addCard = () => {
    setCards([...cards, { front: '', back: '', image: null }]);
  };

  const updateCard = useCallback((index, field, value) => {
    setCards(prevCards => prevCards.map((card, i) => 
      i === index ? { ...card, [field]: value } : card
    ));
  }, []);

  const removeCard = (index) => {
    setCards(cards.filter((_, i) => i !== index));
  };

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
        const storageRef = ref(storage, `flashcards/${user.uid}/${selectedSetId}/card_${index}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateCard(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, updateCard, user]);

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

  const deleteUnusedImages = useCallback(async (originalCards, updatedCards) => {
    const storage = getStorage();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const originalImageUrls = originalCards.map(card => card.image).filter(Boolean);
    const updatedImageUrls = updatedCards.map(card => card.image).filter(Boolean);

    for (const imageUrl of originalImageUrls) {
      if (!updatedImageUrls.includes(imageUrl)) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (validateForm() && user && user.uid) {
      try {
        const db = getFirestore();
        const setRef = doc(db, `users/${user.uid}/sets`, selectedSetId);
        
        const existingSetDoc = await getDoc(setRef);
        const existingSetData = existingSetDoc.data() || {};
  
        const updatedSet = { 
          id: selectedSetId,
          title: setTitle, 
          cards: cards,
          type: 'flashcard',
        };
  
        if (!existingSetData.createdAt) {
          updatedSet.createdAt = serverTimestamp();
        } else {
          updatedSet.createdAt = existingSetData.createdAt;
        }
        updatedSet.updatedAt = serverTimestamp();
  
        const batch = writeBatch(db);
        batch.set(setRef, updatedSet, { merge: true });
  
        await deleteUnusedImages(originalCards, updatedSet.cards);
  
        await batch.commit();
  
        localStorage.setItem(`flashcardSet_${selectedSetId}`, JSON.stringify(updatedSet));
  
        onSave(updatedSet);
        setOriginalCards(updatedSet.cards);
        setErrors({});
      } catch (error) {
        console.error("Error updating set:", error);
        setErrors(prevErrors => ({ 
          ...prevErrors, 
          save: error.code === 'permission-denied' 
            ? "権限がありません。再度ログインしてください。" 
            : "セットの更新中にエラーが発生しました。"
        }));
      }
    }
  }, [selectedSetId, setTitle, cards, validateForm, onSave, originalCards, deleteUnusedImages, user]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。') && user) {
      try {
        const storage = getStorage();
        for (const card of cards) {
          if (card.image) {
            const imageRef = ref(storage, card.image);
            await deleteObject(imageRef);
          }
        }
  
        await deleteSet(user.uid, selectedSetId);
        
        const updatedSets = await getSets(user.uid, 'flashcard');
        setSets(updatedSets);
  
        // ローカルストレージからセットデータを削除
        localStorage.removeItem(`flashcardSet_${selectedSetId}`);
        localStorage.removeItem('lastEditedFlashcardSetId');
  
        // sessionStatesを削除
        const sessionStates = JSON.parse(localStorage.getItem('sessionStates')) || {};
        delete sessionStates[selectedSetId];
        localStorage.setItem('sessionStates', JSON.stringify(sessionStates));
  
        setSelectedSetId('');
        setSetTitle('');
        setCards([]);
        
        setErrors({});
        alert('セットが正常に削除されました。');
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, cards, user]);

  const removeImage = useCallback((index) => {
    updateCard(index, 'image', null);
  }, [updateCard]);

  return (
    <div className={styles.editScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">フラッシュカード編集</h1>
        </div>

        <div className={styles.selectContainer}>
          <Select onValueChange={handleSetChange} value={selectedSetId}>
            <SelectTrigger className={styles.selectTrigger}>
              <SelectValue placeholder="編集するセットを選択" />
            </SelectTrigger>
            <SelectContent>
              {sets.map((set, index) => (
                <SelectItem key={`${set.id}-${index}`} value={set.id.toString()}>{set.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="セットのタイトル"
            value={setTitle}
            onChange={(e) => setSetTitle(e.target.value)}
            className={`${styles.mobileFriendlyInput} ${styles.setTitle} mb-2`}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
          {selectedSetId && (
            <Button onClick={handleDelete} variant="destructive" className="mt-2">
              <Trash2 className="mr-2 h-4 w-4" /> セットを削除
            </Button>
          )}
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
          cards && cards.length > 0 ? (
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
          ) : (
            <p>
              {selectedSetId 
                ? "このセットにはカードがありません。新しいカードを追加してください。" 
                : "セットを選択するか、新しいカードを追加してください。"}
            </p>
          )
        )}

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
    </div>
  );
};

export default FlashcardEditScreen;