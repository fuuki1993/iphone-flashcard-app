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

const QACreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [qaItems, setQAItems] = useState([{ question: '', answer: '', image: null }]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const inputRef = useAutoScroll();

  const addQAItem = () => {
    setQAItems([...qaItems, { question: '', answer: '', image: null }]);
  };

  const updateQAItem = (index, field, value) => {
    const updatedQAItems = qaItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setQAItems(updatedQAItems);
  };

  const removeQAItem = (index) => {
    setQAItems(qaItems.filter((_, i) => i !== index));
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateQAItem(index, 'image', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    qaItems.forEach((item, index) => {
      if (!item.question.trim() || !item.answer.trim()) {
        newErrors[`item${index}`] = '質問と回答を入力してください。';
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
          qaItems,  // cardsの代わりにqaItemsを使用
          type: 'qa' // タイプ情報を追加
        };
        const id = await saveSet(newSet);
        onSave({ ...newSet, id });
      } catch (error) {
        console.error("Error saving set:", error);
        // エラーハンドリングのUIを表示する（例：エラーメッセージをステートに設定し、UIに表示）
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
          <h1 className="text-2xl font-bold ml-2">一問一答作成</h1>
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

        {qaItems.map((item, index) => (
          <Card key={index} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">問題 {index + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => togglePreview(index)} className="mobile-friendly-button">
                  {previewIndex === index ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQAItem(index)} className="mobile-friendly-button">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewIndex === index ? (
                <div className="bg-gray-100 p-4 rounded-md">
                  <h3 className="font-bold mb-2">質問:</h3>
                  <p>{item.question}</p>
                  {item.image && <img src={item.image} alt="Question" className="mt-2 max-w-full h-auto" />}
                  <h3 className="font-bold mt-4 mb-2">回答:</h3>
                  <p>{item.answer}</p>
                </div>
              ) : (
                <>
                  <Textarea
                    ref={inputRef}
                    placeholder="質問"
                    value={item.question}
                    onChange={(e) => updateQAItem(index, 'question', e.target.value)}
                    className="mobile-friendly-input mb-2 text-base"
                    style={{ fontSize: '16px' }}
                  />
                  <Textarea
                    ref={inputRef}
                    placeholder="回答"
                    value={item.answer}
                    onChange={(e) => updateQAItem(index, 'answer', e.target.value)}
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
                  {item.image && <img src={item.image} alt="Uploaded" className="mt-2 max-w-full h-auto" />}
                </>
              )}
            </CardContent>
            <CardFooter>
              {errors[`item${index}`] && <Alert variant="destructive"><AlertDescription>{errors[`item${index}`]}</AlertDescription></Alert>}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="fixed-bottom">
        <div className="flex justify-between">
          <Button onClick={addQAItem} className="mobile-friendly-button">
            <Plus className="mr-2 h-4 w-4" /> 問題を追加
          </Button>
          <Button onClick={handleSave} className="mobile-friendly-button">
            <Save className="mr-2 h-4 w-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QACreationScreen;