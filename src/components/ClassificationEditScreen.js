import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/indexedDB';

const ClassificationEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [categoryImages, setCategoryImages] = useState(Array(6).fill(null));

  useEffect(() => {
    const loadSets = async () => {
      try {
        const loadedSets = await getSets('classification');
        setSets(loadedSets);
      } catch (error) {
        console.error("Error loading sets:", error);
      }
    };
    loadSets();
  }, []);

  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    try {
      const set = await getSetById(parseInt(value));
      setSetTitle(set.title);
      setCategories(set.categories);
      setCategoryImages(set.categories.map(category => category.image || null));
    } catch (error) {
      console.error("Error loading set:", error);
    }
  };

  const handleImageUpload = (categoryIndex, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImages = [...categoryImages];
        newImages[categoryIndex] = e.target.result;
        setCategoryImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const addCategory = () => {
    if (categories.length < 6) {
      setCategories([...categories, { name: '', items: [''] }]);
    }
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
      if (!category.name.trim() && !categoryImages[index]) {
        newErrors[`category${index}`] = 'カテゴリー名または画像を入力してください。';
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
        const updatedSet = { 
          id: parseInt(selectedSetId),
          title: setTitle, 
          categories: categories.map((category, index) => ({
            ...category,
            image: categoryImages[index]
          })),
          type: 'classification'
        };
        await updateSet(updatedSet);
        onSave(updatedSet);
      } catch (error) {
        console.error("Error updating set:", error);
        // エラーハンドリングのUIを表示する
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。')) {
      try {
        await deleteSet(parseInt(selectedSetId));
        onBack(); // 削除後に前の画面に戻る
      } catch (error) {
        console.error("Error deleting set:", error);
        // エラーハンドリングのUIを表示する
      }
    }
  };

  return (
    <div className="mobile-friendly-form max-w-full overflow-x-hidden">
      <div className="scrollable-content px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">分類問題編集</h1>
        </div>

        <div className="mb-6">
          <Select onValueChange={handleSetChange} value={selectedSetId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="編集するセットを選択" />
            </SelectTrigger>
            <SelectContent>
              {sets.map(set => (
                <SelectItem key={set.id} value={set.id.toString()}>{set.title}</SelectItem>
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
                <div className="flex items-center">
                  <label htmlFor={`image-upload-${categoryIndex}`} className="cursor-pointer mr-2">
                    <Upload className="h-4 w-4" />
                    <input
                      id={`image-upload-${categoryIndex}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(categoryIndex, e)}
                    />
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => removeCategory(categoryIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categoryImages[categoryIndex] && (
                  <img src={categoryImages[categoryIndex]} alt="Category" className="w-full h-32 object-cover mb-2" />
                )}
                <Input
                  placeholder="カテゴリー名"
                  value={category.name}
                  onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                  className="mobile-friendly-input mb-2 text-base"
                  style={{ fontSize: '16px' }}
                />
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex mb-2">
                    <Input
                      placeholder={`項目 ${itemIndex + 1}`}
                      value={item}
                      onChange={(e) => updateItem(categoryIndex, itemIndex, e.target.value)}
                      className="mobile-friendly-input flex-grow mr-2 text-base"
                      style={{ fontSize: '16px' }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(categoryIndex, itemIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => addItem(categoryIndex)} className="mobile-friendly-button mt-2">
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

        <div className="fixed-bottom">
          <div className="flex justify-between">
            <Button 
              onClick={addCategory} 
              disabled={categories.length >= 6}
            >
              <Plus className="mr-2 h-4 w-4" /> カテゴリーを追加
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

export default ClassificationEditScreen;