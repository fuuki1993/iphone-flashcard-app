'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firebase/firestore';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, getDoc, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonEditScreen.module.css';

const ClassificationEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [categories, setCategories] = useState([{ name: '', items: [''] }]);
  const [errors, setErrors] = useState({});
  const [originalCategories, setOriginalCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

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
          const loadedSets = await getSets(user.uid, 'classification');
          setSets(loadedSets);

          const lastEditedSetId = localStorage.getItem('lastEditedClassificationSetId');
          if (lastEditedSetId) {
            const cachedSet = localStorage.getItem(`classificationSet_${lastEditedSetId}`);
            if (cachedSet) {
              const parsedSet = JSON.parse(cachedSet);
              setSelectedSetId(lastEditedSetId);
              setSetTitle(parsedSet.title);
              setCategories(parsedSet.categories || [{ name: '', items: [''] }]);
              setOriginalCategories(parsedSet.categories || [{ name: '', items: [''] }]);
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
      setCategories(set.categories || [{ name: '', items: [''] }]);
      setOriginalCategories(set.categories || [{ name: '', items: [''] }]);
      localStorage.setItem(`classificationSet_${setId}`, JSON.stringify(set));
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
    }
  };
  
  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    localStorage.setItem('lastEditedClassificationSetId', value);
    if (user) {
      const cachedSet = localStorage.getItem(`classificationSet_${value}`);
      if (cachedSet) {
        const parsedSet = JSON.parse(cachedSet);
        setSetTitle(parsedSet.title);
        setCategories(parsedSet.categories || [{ name: '', items: [''] }]);
        setOriginalCategories(parsedSet.categories || [{ name: '', items: [''] }]);
      } else {
        await loadSetData(value);
      }
    }
  };

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
      i === categoryIndex 
        ? {
        ...category,
        items: category.items.map((item, j) => 
          j === itemIndex ? value : item)
      }
       : category
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
    if (!event || !event.target || !event.target.files) {
      console.error("Invalid event object:", event);
      return;
    }
    const file = event.target.files[0];
    if (file && user) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `classification/${user.uid}/${selectedSetId}/category_${categoryIndex}`);
        
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
  }, [selectedSetId, categories, user]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    categories.forEach((category, index) => {
      if (!category.name.trim() && !category.image) {
        newErrors[`category${index}`] = 'カテゴリー名または画像を入力してください。';
      }
      if (category.items.filter(item => item.trim()).length === 0) {
        newErrors[`category${index}items`] = '少なくとも1つの項目を入力してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, categories]);

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
    if (validateForm() && user && user.uid) {
      try {
        const db = getFirestore();
        const setRef = doc(db, `users/${user.uid}/sets`, selectedSetId);
        
        const existingSetDoc = await getDoc(setRef);
        const existingSetData = existingSetDoc.data() || {};
  
        const updatedSet = { 
          id: selectedSetId,
          title: setTitle, 
          categories: categories.map((category, index) => ({
            ...category,
            image: category.image || null
          })),
          type: 'classification',
        };
  
        if (!existingSetData.createdAt) {
          updatedSet.createdAt = serverTimestamp();
        } else {
          updatedSet.createdAt = existingSetData.createdAt;
        }
        updatedSet.updatedAt = serverTimestamp();
  
        const batch = writeBatch(db);
        batch.set(setRef, updatedSet, { merge: true });
  
        await deleteUnusedImages(originalCategories, updatedSet.categories);
  
        await batch.commit();
  
        localStorage.setItem(`classificationSet_${selectedSetId}`, JSON.stringify(updatedSet));
  
        onSave(updatedSet);
        setOriginalCategories(updatedSet.categories);
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
  }, [selectedSetId, setTitle, categories, validateForm, onSave, originalCategories, deleteUnusedImages, user]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。') && user) {
      try {
        const storage = getStorage();
        for (const category of categories) {
          if (category.image) {
            const imageRef = ref(storage, category.image);
            await deleteObject(imageRef);
          }
        }

        const newProgress = await deleteSet(user.uid, selectedSetId);
        
        const updatedSets = await getSets(user.uid, 'classification');
        setSets(updatedSets);

        setSelectedSetId('');
        setSetTitle('');
        setCategories([{ name: '', items: [''] }]);
        setOriginalCategories([]);

        setErrors({});
        alert('セットが正常に削除されました。');
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, categories, user]);

  return (
    <div className={styles.editScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">分類問題編集</h1>
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
          categories && categories.length > 0 ? (
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
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(categoryIndex, e)}
                      className={styles.imageInput}
                    />
                    {category.image && <img src={category.image} alt="Uploaded image" className={styles.previewImage} />}
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
          ) : (
            <p>
              {selectedSetId 
                ? "このセットにはカテゴリーがありません。新しいカテゴリーを追加してください。" 
                : "セットを選択するか、新しいカテゴリーを追加してください。"}
            </p>
          )
        )}

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
    </div>
  );
};

export default ClassificationEditScreen;