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

const QAEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [qaItems, setQAItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [originalQAItems, setOriginalQAItems] = useState([]);
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
          const qaSets = loadedSets.filter(set => set.type === 'qa');
          setSets(qaSets);
  
          const lastEditedSetId = localStorage.getItem('lastEditedQASetId');
          if (lastEditedSetId) {
            const cachedSet = localStorage.getItem(`qaSet_${lastEditedSetId}`);
            if (cachedSet) {
              const parsedSet = JSON.parse(cachedSet);
              setSelectedSetId(lastEditedSetId);
              setSetTitle(parsedSet.title);
              setQAItems(parsedSet.qaItems);
              setOriginalQAItems(parsedSet.qaItems);
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
      setQAItems(set.qaItems || []);
      setOriginalQAItems(set.qaItems || []);
      localStorage.setItem(`qaSet_${setId}`, JSON.stringify(set));
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
    }
  };

  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    localStorage.setItem('lastEditedQASetId', value);
    if (user) {
      const cachedSet = localStorage.getItem(`qaSet_${value}`);
      if (cachedSet) {
        const parsedSet = JSON.parse(cachedSet);
        setSetTitle(parsedSet.title);
        setQAItems(parsedSet.qaItems);
        setOriginalQAItems(parsedSet.qaItems);
      } else {
        await loadSetData(value);
      }
    }
  };

  const addQAItem = () => {
    setQAItems([...qaItems, { question: '', answer: '', image: null }]);
  };

  const updateQAItem = useCallback((index, field, value) => {
    setQAItems(prevItems => prevItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const removeQAItem = (index) => {
    setQAItems(qaItems.filter((_, i) => i !== index));
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
        const storageRef = ref(storage, `qa_images/${user.uid}/${selectedSetId}/item_${index}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateQAItem(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, updateQAItem, user]);

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
    qaItems.forEach((item, index) => {
      if (!item.question.trim() || !item.answer.trim()) {
        newErrors[`item${index}`] = '質問と回答を入力してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, qaItems]);

  const deleteUnusedImages = useCallback(async (originalItems, updatedItems) => {
    const storage = getStorage();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const originalImageUrls = originalItems.map(item => item.image).filter(Boolean);
    const updatedImageUrls = updatedItems.map(item => item.image).filter(Boolean);

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
          qaItems: qaItems,
          type: 'qa',
        };
  
        if (!existingSetData.createdAt) {
          updatedSet.createdAt = serverTimestamp();
        } else {
          updatedSet.createdAt = existingSetData.createdAt;
        }
        updatedSet.updatedAt = serverTimestamp();
  
        const batch = writeBatch(db);
        batch.set(setRef, updatedSet, { merge: true });
  
        await deleteUnusedImages(originalQAItems, updatedSet.qaItems);
  
        await batch.commit();
  
        localStorage.setItem(`qaSet_${selectedSetId}`, JSON.stringify(updatedSet));
  
        onSave(updatedSet);
        setOriginalQAItems(updatedSet.qaItems);
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
  }, [selectedSetId, setTitle, qaItems, validateForm, onSave, originalQAItems, deleteUnusedImages, user]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。') && user) {
      try {
        const storage = getStorage();
        for (const item of qaItems) {
          if (item.image) {
            const imageRef = ref(storage, item.image);
            await deleteObject(imageRef);
          }
        }

        const newProgress = await deleteSet(user.uid, selectedSetId);
        
        const updatedSets = await getSets(user.uid, 'qa');
        setSets(updatedSets);

        setSelectedSetId('');
        setSetTitle('');
        setQAItems([]);
        
        setErrors({});
        alert('セットが正常に削除されました。');
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, qaItems, user]);

  const removeImage = useCallback((index) => {
    updateQAItem(index, 'image', null);
  }, [updateQAItem]);

  return (
    <div className={styles.editScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">一問一答編集</h1>
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
              {qaItems.map((item, index) => (
                <div key={index} className={styles.previewCategory}>
                  <div className={styles.previewCategoryHeader}>
                    <h3 className={styles.previewCategoryTitle}>問題 {index + 1}</h3>
                    {item.image && <img src={item.image} alt="Question image" className={styles.previewImage} />}
                  </div>
                  <p>{item.question}</p>
                  <h4 className={styles.previewCategoryTitle}>回答:</h4>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          qaItems && qaItems.length > 0 ? (
            <div className={styles.categoriesGrid}>
              {qaItems.map((item, index) => (
                <Card key={`item-${index}`} className={styles.categoryCard}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">問題 {index + 1}</CardTitle>
                    <div>
                      <Button variant="ghost" size="icon" onClick={() => removeQAItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="質問"
                      value={item.question}
                      onChange={(e) => updateQAItem(index, 'question', e.target.value)}
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
                      {item.image ? (
                        <div className="relative">
                          <img src={item.image} alt="Uploaded image" className={styles.previewImage} />
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
                      placeholder="回答"
                      value={item.answer}
                      onChange={(e) => updateQAItem(index, 'answer', e.target.value)}
                      className={`${styles.mobileFriendlyInput} mb-2`}
                    />
                  </CardContent>
                  <CardFooter>
                    {errors[`item${index}`] && <Alert variant="destructive"><AlertDescription>{errors[`item${index}`]}</AlertDescription></Alert>}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p>
              {selectedSetId 
                ? "このセットには問題がありません。新しい問題を追加してください。" 
                : "セットを選択するか、新しい問題を追加してください。"}
            </p>
          )
        )}

        <div className={styles.fixedBottom}>
          <div className={styles.bottomButtonContainer}>
            <Button onClick={addQAItem} className={`${styles.bottomButton} ${styles.addButton}`}>
              <Plus className="mr-2 h-4 w-4" /> 問題を追加
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

export default QAEditScreen;