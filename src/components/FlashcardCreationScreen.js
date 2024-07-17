'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { saveSet } from '@/utils/indexedDB';
import { useAutoScroll } from '@/hooks/useAutoScroll';

const FlashcardCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '', image: null }]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const inputRef = useAutoScroll();

  const addCard = () => {
    setCards([...cards, { front: '', back: '', image: null }]);
  };

  const updateCard = (index, field, value) => {
    const updatedCards = cards.map((card, i) => 
      i === index ? { ...card, [field]: value } : card
    );
    setCards(updatedCards);
  };

  const removeCard = (index) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCard(index, 'image', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
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
  };

  const handleSave = async () => {
    if (validateForm()) {
      try {
        const newSet = { 
          title: setTitle, 
          cards: cards,  // この行を確認
          type: 'flashcard'
        };
        const id = await saveSet(newSet);
        onSave({ ...newSet, id });
      } catch (error) {
        console.error("Error saving set:", error);
        // エラーハンドリングのUIを表示する
      }
    }
  };

  const togglePreview = (index) => {
    setPreviewIndex(previewIndex === index ? null : index);
  };

  return (
    <div className="mobile-friendly-form max-w-full overflow-x-hidden">
      <div className="scrollable-content px-4">
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
            className="mobile-friendly-input mb-2 text-base"
            style={{ fontSize: '16px' }}
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
                    className="mobile-friendly-input mb-2 text-base"
                    style={{ fontSize: '16px' }}
                  />
                  <Textarea
                    ref={inputRef}
                    placeholder="裏面"
                    value={card.back}
                    onChange={(e) => updateCard(index, 'back', e.target.value)}
                    className="mobile-friendly-input mb-2 text-base"
                    style={{ fontSize: '16px' }}
                  />
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    className="mobile-friendly-input mb-2"
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
  );
};

export default FlashcardCreationScreen;