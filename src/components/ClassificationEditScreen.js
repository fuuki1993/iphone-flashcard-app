import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firestore';
import { compressImage } from '@/utils/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";

const ClassificationEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [categoryImages, setCategoryImages] = useState(() => Array(10).fill(null));
  const [originalCategories, setOriginalCategories] = useState([]);

  useEffect(() => {
    const loadSets = async () => {
      try {
        const loadedSets = await getSets('classification');
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
      setCategories(set.categories || [{ name: '', items: [''] }]);
      setOriginalCategories(set.categories || [{ name: '', items: [''] }]);
      setCategoryImages(set.categories.map(category => category.image) || Array(10).fill(null));
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors({ ...errors, load: "セットの読み込み中にエラーが発生しました。" });
    }
  };

  const handleImageUpload = useCallback(async (categoryIndex, event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          throw new Error("User not authenticated");
        }

        const storage = getStorage();
        const storageRef = ref(storage, `classification/${user.uid}/${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        setCategoryImages(prevImages => {
          const newImages = [...prevImages];
          newImages[categoryIndex] = downloadURL;
          return newImages;
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prev => ({ ...prev, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, []);

  const addCategory = () => {
    if (categories.length < 10) {
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

  const deleteUnusedImages = useCallback(async (originalCategories, updatedCategories) => {
    const storage = getStorage();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const originalImageUrls = originalCategories.map(category => category.image).filter(Boolean);
    const updatedImageUrls = updatedCategories.map(category => category.image).filter(Boolean);

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
          categories: categories.map((category, index) => ({
            ...category,
            image: categoryImages[index] || null
          })),
          type: 'classification'
        };

        const changedCategories = categories.filter((category, index) => {
          return JSON.stringify(category) !== JSON.stringify(originalCategories[index]);
        });

        await deleteUnusedImages(originalCategories, changedCategories);

        await updateSet(updatedSet);
        onSave(updatedSet);

        setOriginalCategories(updatedSet.categories);
      } catch (error) {
        console.error("Error updating set:", error);
        setErrors({ ...errors, save: "セットの更新中にエラーが発生しました。" });
      }
    }
  }, [selectedSetId, setTitle, categories, categoryImages, validateForm, onSave, originalCategories, deleteUnusedImages]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。')) {
      try {
        const storage = getStorage();
        for (const image of categoryImages) {
          if (image) {
            const imageRef = ref(storage, image);
            await deleteObject(imageRef);
          }
        }
        await deleteSet(selectedSetId);
        onBack();
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors({ ...errors, delete: "セットの削除中にエラーが発生しました。" });
      }
    }
  }, [selectedSetId, categoryImages, onBack]);

  useEffect(() => {
    console.log('Current categoryImages:', categoryImages);
  }, [categoryImages]);

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
                  <img 
                    src={categoryImages[categoryIndex]} 
                    alt={`Category ${categoryIndex + 1}`} 
                    className="w-full h-32 object-cover mb-2" 
                    onError={(e) => {
                      console.error(`Error loading image for category ${categoryIndex}:`, e);
                      e.target.style.display = 'none';
                    }}
                  />
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
                <Button onClick={() => addItem(categoryIndex)}>
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
              disabled={categories.length >= 10}
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