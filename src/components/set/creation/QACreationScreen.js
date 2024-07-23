'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonCreationScreen.module.css';

const QACreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [qaItems, setQAItems] = useState([{ question: '', answer: '', image: null }]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const inputRef = useAutoScroll();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // ローカルストレージからデータを復元
    const savedData = localStorage.getItem('qaCreationData');
    if (savedData) {
      const { title, items } = JSON.parse(savedData);
      setSetTitle(title);
      setQAItems(items);
    }
  }, []);

  useEffect(() => {
    // データをローカルストレージに保存
    localStorage.setItem('qaCreationData', JSON.stringify({ title: setTitle, items: qaItems }));
  }, [setTitle, qaItems]);

  const addQAItem = useCallback(() => {
    setQAItems(prevItems => [...prevItems, { question: '', answer: '', image: null }]);
  }, []);

  const updateQAItem = useCallback((index, field, value) => {
    setQAItems(prevItems => prevItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const removeQAItem = useCallback((index) => {
    setQAItems(prevItems => prevItems.filter((_, i) => i !== index));
  }, []);

  const handleImageUpload = useCallback(async (index, event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `qa_images/${user.uid}/temp_${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateQAItem(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [updateQAItem, user]);

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

  const handleSave = useCallback(async () => {
    if (validateForm() && user) {
      try {
        const newSet = {
          title: setTitle,
          qaItems: await Promise.all(qaItems.map(async (item, i) => {
            if (item.image) {
              const storage = getStorage();
              const oldRef = ref(storage, item.image);
              const newRef = ref(storage, `qa_images/${user.uid}/qa_${Date.now()}_${i}`);
              
              const oldBlob = await getBlob(oldRef);
              await uploadBytes(newRef, oldBlob);
              const newUrl = await getDownloadURL(newRef);
              await deleteObject(oldRef);
  
              return { ...item, image: newUrl };
            }
            return item;
          })),
          type: 'qa'
        };
  
        const savedSet = await saveSet(newSet, user.uid);
  
        localStorage.removeItem('qaCreationData');
        onSave(savedSet);
      } catch (error) {
        console.error("Error saving set:", error);
        setErrors(prevErrors => ({ ...prevErrors, save: "セットの保存中にエラーが発生しました。" }));
      }
    }
  }, [setTitle, qaItems, validateForm, onSave, user]);

  const togglePreview = useCallback((index) => {
    setPreviewIndex(prevIndex => prevIndex === index ? null : index);
  }, []);

  return (
    <div className={styles.mobileFriendlyForm}>
      <div className={styles.scrollableContent}>
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
            className={`${styles.mobileFriendlyInput} mb-2`}
            style={{ fontSize: '16px' }}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        {qaItems.map((item, index) => (
          <Card key={index} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">問題 {index + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => togglePreview(index)}>
                  {previewIndex === index ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQAItem(index)} >
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
                    className={`${styles.mobileFriendlyInput} mb-2`}
                    style={{ fontSize: '16px' }}
                  />
                  <Textarea
                    ref={inputRef}
                    placeholder="回答"
                    value={item.answer}
                    onChange={(e) => updateQAItem(index, 'answer', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                    style={{ fontSize: '16px' }}
                  />
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    className={styles.mobileFriendlyInput}
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

      <div className={styles.fixedBottom}>
        <div className="flex justify-between">
          <Button onClick={addQAItem}>
            <Plus className="mr-2 h-4 w-4" /> 問題を追加
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QACreationScreen;