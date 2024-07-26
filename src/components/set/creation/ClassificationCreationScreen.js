'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff, Upload } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonCreationScreen.module.css';

const ClassificationCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [categoryImages, setCategoryImages] = useState(() => Array(10).fill(null));
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
    const savedData = localStorage.getItem('classificationCreationData');
    if (savedData) {
      const { title, categories, categoryImages } = JSON.parse(savedData);
      setSetTitle(title);
      setCategories(categories);
      setCategoryImages(categoryImages);
    }
  }, []);

  useEffect(() => {
    // データをローカルストレージに保存
    localStorage.setItem('classificationCreationData', JSON.stringify({ title: setTitle, categories, categoryImages }));
  }, [setTitle, categories, categoryImages]);

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
      const storage = getStorage();
      const newSet = {
        title: setTitle,
        categories: await Promise.all(categories.map(async (category, index) => {
          if (categoryImages[index]) {
            try {
              const newRef = ref(storage, `classification/${user.uid}/category_${Date.now()}_${index}`);
              await uploadBytes(newRef, await (await fetch(categoryImages[index])).blob());
              const newUrl = await getDownloadURL(newRef);
              
              // 古い画像の参照を取得し、削除を試みる
              const oldRef = ref(storage, categoryImages[index]);
              try {
                await deleteObject(oldRef);
              } catch (deleteError) {
                console.warn("古い画像の削除に失敗しました:", deleteError);
              }
  
              return { ...category, image: newUrl };
            } catch (imageError) {
              console.error("画像の処理中にエラーが発生しました:", imageError);
              return category; // エラーが発生した場合は画像なしでカテゴリーを返す
            }
          }
          return category;
        })),
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
  }, [setTitle, categories, categoryImages, validateForm, onSave, user, isSaving]);

  return (
    <div className={styles.creationScreenContainer}>
      <div className={styles.scrollableContent}>
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
            className={`${styles.mobileFriendlyInput} ${styles.setTitle} mb-2`}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        <Button onClick={() => setPreviewMode(!previewMode)} className={styles.previewButton}>
          {previewMode ? <EyeOff className={styles.previewButtonIcon} /> : <Eye className={styles.previewButtonIcon} />}
          {previewMode ? 'プレビューを終了' : 'プレビュー'}
        </Button>

        {previewMode ? (
          <div className={styles.previewContent}>
          <h2 className={styles.previewTitle}>{setTitle}</h2>
          {categories.map((category, index) => (
            <div key={index} className={styles.previewCategory}>
              <h3 className={styles.previewCategoryTitle}>{category.name}</h3>
              {categoryImages[index] && (
                <img 
                  src={categoryImages[index]} 
                  alt={`Category ${index + 1}`} 
                  className={styles.previewImage}
                />
              )}
              <ul className={styles.previewList}>
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={styles.previewListItem}>{item}</li>
                ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          categories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="mb-4 w-full sm:w-[calc(50%-0.5rem)] inline-block align-top">
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
                  className={styles.previewImage} 
                  onError={(e) => {
                    console.error(`Error loading image for category ${categoryIndex}:`, e);
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <Input
                  ref={inputRef}
                  placeholder="カテゴリー名"
                  value={category.name}
                  onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                  className={`${styles.mobileFriendlyInput} mb-2`}
                />
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex mb-2">
                    <Input
                      ref={inputRef}
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
          ))
        )}
      </div>

        <div className={styles.fixedBottom}>
          <div className={styles.bottomButtonContainer}>
            <Button onClick={addCategory} className={`${styles.bottomButton} ${styles.addButton}`}>
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