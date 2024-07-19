'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firestore';
import { compressImage } from '@/utils/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";

const FlashcardEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [cards, setCards] = useState([]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const [categoryImages, setCategoryImages] = useState(() => Array(10).fill(null));
  const [originalCards, setOriginalCards] = useState([]);

  useEffect(() => {
    const loadSets = async () => {
      try {
        const loadedSets = await getSets('flashcard');
        setSets(loadedSets);
      } catch (error) {
        console.error("Error loading sets:", error);
        setErrors({ ...errors, load: "セットの読み込み中にエラーが発生しました。" });
      }
    };
    loadSets();
  }, []);

  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    try {
      const set = await getSetById(value);
      setSetTitle(set.title);
      if (Array.isArray(set.cards) && set.cards.length > 0) {
        setCards(set.cards);
        setOriginalCards(set.cards); // 元のカードを保存
      } else {
        setCards([]);
        setOriginalCards([]);
      }
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors({ ...errors, load: "セットの読み込み中にエラーが発生しました。" });
      setCards([]);
      setOriginalCards([]);
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

  const handleImageUpload = useCallback(async (index, event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `flashcards/${selectedSetId}/card_${index}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateCard(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, updateCard]);

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
    if (validateForm()) {
      try {
        const updatedSet = { 
          id: selectedSetId,
          title: setTitle, 
          cards: cards.map(card => ({
            front: card.front,
            back: card.back,
            image: card.image
          })),
          type: 'flashcard'
        };

        // 未使用の画像を削除
        await deleteUnusedImages(originalCards, updatedSet.cards);

        await updateSet(updatedSet);
        onSave(updatedSet);

        // 保存後に originalCards を更新
        setOriginalCards(updatedSet.cards);
      } catch (error) {
        console.error("Error updating set:", error);
        setErrors(prevErrors => ({ ...prevErrors, save: "セットの更新中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, setTitle, cards, validateForm, onSave, originalCards, deleteUnusedImages]);

  const togglePreview = (index) => {
    setPreviewIndex(previewIndex === index ? null : index);
  };

  const handleDelete = useCallback(async () => {
    if (window.confirm('本当にこのセットを削除しますか？')) {
      try {
        // Firestoreからセットを削除
        await deleteSet(selectedSetId);

        // Storageから関連する画像を削除
        const storage = getStorage();
        for (const card of cards) {
          if (card.image) {
            const imageRef = ref(storage, card.image);
            try {
              await deleteObject(imageRef);
            } catch (error) {
              console.error("画像の削除中にエラーが発生しました:", error);
              // 画像の削除に失敗しても、セットの削除処理は続行
            }
          }
        }

        // ローカルステートをリセット
        setSelectedSetId('');
        setSetTitle('');
        setCards([]);
        
        // セットのリストを更新
        const updatedSets = await getSets('flashcard');
        setSets(updatedSets);

        // 成功メッセージを表示
        setErrors({});
        alert('セットが正常に削除されました。');
      } catch (error) {
        console.error("セットの削除中にエラーが発生しました:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, cards]);

  return (
    <div className="mobile-friendly-form max-w-full overflow-x-hidden">
      <div className="scrollable-content px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">フラッシュカード編集</h1>
        </div>

        <div className="mb-6">
          <Select onValueChange={handleSetChange} value={selectedSetId}>
            <SelectTrigger className="w-full">
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
            className="mobile-friendly-input mb-2 text-base"
            style={{ fontSize: '16px' }}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
          {selectedSetId && (
            <Button onClick={handleDelete} variant="destructive" className="mt-2">
              <Trash2 className="mr-2 h-4 w-4" /> セットを削除
            </Button>
          )}
        </div>

        {cards && cards.length > 0 ? (
          cards.map((card, index) => (
            <Card key={`card-${index}`} className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">カード {index + 1}</CardTitle>
                <div>
                  <Button variant="ghost" size="icon" onClick={() => togglePreview(index)}>
                    {previewIndex === index ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeCard(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {previewIndex === index ? (
                  <div className="bg-gray-100 p-4 rounded-md">
                    <h3 className="font-bold mb-2">表面:</h3>
                    <p>{card.front}</p>
                    {card.image && <img src={card.image} alt="Card image" className="mt-2 max-w-full h-auto" />}
                    <h3 className="font-bold mt-4 mb-2">裏面:</h3>
                    <p>{card.back}</p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder="表面"
                      value={card.front}
                      onChange={(e) => updateCard(index, 'front', e.target.value)}
                      className="mb-2"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(index, e)}
                      className="mb-2"
                    />
                    {card.image && <img src={card.image} alt="Uploaded image" className="mt-2 max-w-full h-auto" />}
                    <Textarea
                      placeholder="裏面"
                      value={card.back}
                      onChange={(e) => updateCard(index, 'back', e.target.value)}
                      className="mt-4 mb-2"
                    />
                  </>
                )}
              </CardContent>
              <CardFooter>
                {errors[`card${index}`] && <Alert variant="destructive"><AlertDescription>{errors[`card${index}`]}</AlertDescription></Alert>}
              </CardFooter>
            </Card>
          ))
        ) : (
          <p>
            {selectedSetId 
              ? "このセットにはカードがありません。新しいカードを追加してください。" 
              : "セットを選択するか、新しいカードを追加してください。"}
          </p>
        )}

        <div className="fixed-bottom">
          <div className="flex justify-between">
            <Button onClick={addCard}>
              <Plus className="mr-2 h-4 w-4" /> カードを追加
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardEditScreen;