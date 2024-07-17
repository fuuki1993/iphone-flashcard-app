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

const ClassificationCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const inputRef = useAutoScroll();

  const addCategory = () => {
    setCategories([...categories, { name: '', items: [''] }]);
  };

  const updateCategory = (index, field, value) => {
    const updatedCategories = categories.map((category, i) => 
      i === index ? { ...category, [field]: value } : category
    );
    setCategories(updatedCategories);
  };

  const removeCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const addItem = (categoryIndex) => {
    const updatedCategories = categories.map((category, i) => 
      i === categoryIndex ? { ...category, items: [...category.items, ''] } : category
    );
    setCategories(updatedCategories);
  };

  const updateItem = (categoryIndex, itemIndex, value) => {
    const updatedCategories = categories.map((category, i) => 
      i === categoryIndex ? {
        ...category,
        items: category.items.map((item, j) => j === itemIndex ? value : item)
      } : category
    );
    setCategories(updatedCategories);
  };

  const removeItem = (categoryIndex, itemIndex) => {
    const updatedCategories = categories.map((category, i) => 
      i === categoryIndex ? {
        ...category,
        items: category.items.filter((_, j) => j !== itemIndex)
      } : category
    );
    setCategories(updatedCategories);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    categories.forEach((category, index) => {
      if (!category.name.trim()) {
        newErrors[`category${index}`] = 'カテゴリー名を入力してください。';
      }
      if (category.items.filter(item => item.trim()).length === 0) {
        newErrors[`category${index}items`] = '少なくとも1つの項目を入力してください。';
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
          categories,  // categoriesを使用
          type: 'classification' // タイプ情報を追加
        };
        const id = await saveSet(newSet);
        onSave({ ...newSet, id });
      } catch (error) {
        console.error("Error saving set:", error);
        // エラーハンドリングのUIを表示する
      }
    }
  };

  return (
    <div className="mobile-friendly-form">
      <div className="scrollable-content">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">分類問題作成</h1>
        </div>

        <div className="mb-6">
          <Input
            ref={inputRef}
            placeholder="セットのタイトル"
            value={setTitle}
            onChange={(e) => setSetTitle(e.target.value)}
            className="mb-2"
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        <Button onClick={() => setPreviewMode(!previewMode)} className="mb-4">
          {previewMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {previewMode ? 'プレビューを終了' : 'プレビュー'}
        </Button>

        {previewMode ? (
          <div className="bg-gray-100 p-4 rounded-md mb-4">
            <h2 className="text-xl font-bold mb-4">{setTitle}</h2>
            {categories.map((category, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-bold">{category.name}</h3>
                <ul className="list-disc pl-5">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          categories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">カテゴリー {categoryIndex + 1}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(categoryIndex)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Input
                  ref={inputRef}
                  placeholder="カテゴリー名"
                  value={category.name}
                  onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                  className="mb-2"
                />
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex mb-2">
                    <Input
                      ref={inputRef}
                      placeholder={`項目 ${itemIndex + 1}`}
                      value={item}
                      onChange={(e) => updateItem(categoryIndex, itemIndex, e.target.value)}
                      className="flex-grow mr-2"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(categoryIndex, itemIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => addItem(categoryIndex)} className="mt-2">
                  <Plus className="mr-2 h-4 w-4" /> 項目を追加
                </Button>
              </CardContent>
              <CardFooter>
                {errors[`category${categoryIndex}`] && <Alert variant="destructive"><AlertDescription>{errors[`category${categoryIndex}`]}</AlertDescription></Alert>}
                {errors[`category${categoryIndex}items`] && <Alert variant="destructive"><AlertDescription>{errors[`category${categoryIndex}items`]}</AlertDescription></Alert>}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <div className="fixed-bottom">
        <div className="flex justify-between">
          <Button onClick={addCategory}>
            <Plus className="mr-2 h-4 w-4" /> カテゴリーを追加
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassificationCreationScreen;