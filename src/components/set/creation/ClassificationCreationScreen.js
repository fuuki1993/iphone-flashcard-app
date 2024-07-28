'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Eye, EyeOff, Upload, Image, X } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from '@/styles/modules/CommonCreationScreen.module.css';

const ClassificationCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
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
    const savedData = localStorage.getItem('classificationCreationData');
    if (savedData) {
      const { title, categories } = JSON.parse(savedData);
      setSetTitle(title);
      setCategories(categories);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('classificationCreationData', JSON.stringify({ title: setTitle, categories }));
  }, [setTitle, categories]);

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

  const handleImageUpload = useCallback(async (categoryIndex, file) => {
    if (!user) {
      console.error("User is not authenticated");
      setErrors(prevErrors => ({ ...prevErrors, image: "ユーザー認証が必要です。" }));
      return;
    }

    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `classification/${user.uid}/${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        const updatedCategories = categories.map((category, index) => 
          index === categoryIndex ? { ...category, image: downloadURL } : category
        );
        setCategories(updatedCategories);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [categories, user]);

  const handleDrop = useCallback((e, categoryIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(categoryIndex, file);
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

  const handleAreaClick = useCallback((categoryIndex) => {
    fileInputRefs.current[categoryIndex].click();
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    categories.forEach((category, index) => {
      if (!category.name.trim() && !category.image) {
        newErrors[`category${index}`] = 'カテゴリー名または画像を入力してください。';
      }
      if (category.items.length === 0 || category.items.every(item => !item.trim())) {
        newErrors[`category${index}items`] = '少なくとも1つの項目を入力してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, categories]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!validateForm()) return;
    if (!user) {
      setErrors(prevErrors => ({ ...prevErrors, save: "ユーザー認証が必要です。再度ログインしてください。" }));
      return;
    }
    setIsSaving(true);
    try {
      const newSet = {
        title: setTitle,
        categories: categories,
        type: 'classification'
      };
      const savedSet = await saveSet(newSet, user.uid);
      localStorage.removeItem('classificationCreationData');
      onSave(savedSet);
    } catch (error) {
      console.error("Error saving set:", error);
      setErrors(prevErrors => ({ ...prevErrors, save: `セットの保存中にエラーが発生しました: ${error.message}` }));
    } finally {
      setIsSaving(false);
    }
  }, [setTitle, categories, validateForm, onSave, user, isSaving]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const removeImage = useCallback((categoryIndex) => {
    updateCategory(categoryIndex, 'image', null);
  }, [updateCategory]);

  return (
    <div className={styles.creationScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">分類問題作成</h1>
        </div>

        <Input
          placeholder="セットのタイトル"
          value={setTitle}
          onChange={(e) => setSetTitle(e.target.value)}
          className={`${styles.mobileFriendlyInput} ${styles.setTitle} mb-2`}
        />
        {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}

        <Button onClick={togglePreviewMode} className={styles.previewButton}>
          {previewMode ? <EyeOff className={styles.previewButtonIcon} /> : <Eye className={styles.previewButtonIcon} />}
          {previewMode ? 'プレビューを終了' : 'プレビュー'}
        </Button>

        {previewMode ? (
          <div className={styles.previewContent}>
            <h2 className={styles.previewTitle}>{setTitle}</h2>
            <div className={styles.previewCategoriesContainer}>
              {categories.map((category, index) => (
                <div key={index} className={styles.previewCategory}>
                  <div className={styles.previewCategoryHeader}>
                    <h3 className={styles.previewCategoryTitle}>{category.name}</h3>
                    {category.image && <img src={category.image} alt={`Category ${index + 1}`} className={styles.previewImage} />}
                  </div>
                  <ul className={styles.previewList}>
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex} className={styles.previewListItem}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.categoriesGrid}>
            {categories.map((category, categoryIndex) => (
              <Card key={`category-${categoryIndex}`} className={styles.categoryCard}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">カテゴリー {categoryIndex + 1}</CardTitle>
                  <div>
                    <Button variant="ghost" size="icon" onClick={() => removeCategory(categoryIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="カテゴリー名"
                    value={category.name}
                    onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                  />
                  <div
                    onDrop={(e) => handleDrop(e, categoryIndex)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onClick={() => handleAreaClick(categoryIndex)}
                    className="relative border-2 border-dashed border-gray-300 p-4 rounded-md cursor-pointer"
                  >
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(categoryIndex, e.target.files[0])}
                      className="hidden"
                      ref={el => fileInputRefs.current[categoryIndex] = el}
                    />
                    {category.image ? (
                      <div className="relative">
                        <img src={category.image} alt="Uploaded image" className={styles.previewImage} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(categoryIndex);
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
                  <h4 className="font-medium mt-4 mb-2">項目:</h4>
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex mb-2">
                      <Input
                        placeholder={`項目 ${itemIndex + 1}`}
                        value={item}
                        onChange={(e) => updateItem(categoryIndex, itemIndex, e.target.value)}
                        className={`${styles.mobileFriendlyInput} flex-grow mr-2`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(categoryIndex, itemIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => addItem(categoryIndex)} className={styles.addItemButton}>
                    <Plus className={styles.addItemButtonIcon} /> 項目を追加
                  </Button>
                </CardContent>
                <CardFooter>
                  {errors[`category${categoryIndex}`] && <Alert variant="destructive"><AlertDescription>{errors[`category${categoryIndex}`]}</AlertDescription></Alert>}
                  {errors[`category${categoryIndex}items`] && <Alert variant="destructive"><AlertDescription>{errors[`category${categoryIndex}items`]}</AlertDescription></Alert>}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className={styles.fixedBottom}>
        <div className={styles.bottomButtonContainer}>
          <Button onClick={addCategory} className={`${styles.bottomButton} ${styles.addButton}`} disabled={categories.length >= 10}>
            <Plus className="mr-2 h-4 w-4" /> カテゴリーを追加
          </Button>
          <Button onClick={handleSave} className={`${styles.bottomButton} ${styles.saveButton}`}>
            <Save className="mr-2 h-4 w-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassificationCreationScreen;