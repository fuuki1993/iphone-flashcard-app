'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Checkbox } from '@/components/ui/form/checkbox';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firebase/firestore';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, getDoc, serverTimestamp } from "firebase/firestore";
import styles from '@/styles/modules/CommonEditScreen.module.css';

const MultipleChoiceEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [originalQuestions, setOriginalQuestions] = useState([]);
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
          const loadedSets = await getSets(user.uid);
          const multipleChoiceSets = loadedSets.filter(set => set.type === 'multiple-choice');
          setSets(multipleChoiceSets);
  
          const lastEditedSetId = localStorage.getItem('lastEditedMultipleChoiceSetId');
          if (lastEditedSetId) {
            const cachedSet = localStorage.getItem(`multiple-choiceSet_${lastEditedSetId}`);
            if (cachedSet) {
              const parsedSet = JSON.parse(cachedSet);
              setSelectedSetId(lastEditedSetId);
              setSetTitle(parsedSet.title);
              setQuestions(parsedSet.questions);
              setOriginalQuestions(parsedSet.questions);
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
      setQuestions(set.questions || []);
      setOriginalQuestions(set.questions || []);
      localStorage.setItem(`multiple-choiceSet_${setId}`, JSON.stringify(set));
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
    }
  };

  const handleSetChange = async (value) => {
    setSelectedSetId(value);
    localStorage.setItem('lastEditedMultipleChoiceSetId', value);
    if (user) {
      const cachedSet = localStorage.getItem(`multiple-choiceSet_${value}`);
      if (cachedSet) {
        const parsedSet = JSON.parse(cachedSet);
        setSetTitle(parsedSet.title);
        setQuestions(parsedSet.questions);
        setOriginalQuestions(parsedSet.questions);
      } else {
        await loadSetData(value);
      }
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      question: '', 
      choices: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      image: null 
    }]);
  };

  const updateQuestion = useCallback((index, field, value) => {
    setQuestions(prevQuestions => prevQuestions.map((question, i) => 
      i === index ? { ...question, [field]: value } : question
    ));
  }, []);

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addChoice = useCallback((questionIndex) => {
    setQuestions(prevQuestions => prevQuestions.map((question, i) => 
      i === questionIndex 
        ? { ...question, choices: [...question.choices, { text: '', isCorrect: false }] } 
        : question
    ));
  }, []);

  const updateChoice = useCallback((questionIndex, choiceIndex, field, value) => {
    setQuestions(prevQuestions => prevQuestions.map((question, i) => 
      i === questionIndex 
        ? {
            ...question,
            choices: question.choices.map((choice, j) => 
              j === choiceIndex 
                ? { ...choice, [field]: value } 
                : field === 'isCorrect' 
                  ? { ...choice, isCorrect: false } 
                  : choice
            )
          } 
        : question
    ));
  }, []);

  const removeChoice = useCallback((questionIndex, choiceIndex) => {
    setQuestions(prevQuestions => prevQuestions.map((question, i) => 
      i === questionIndex 
        ? { ...question, choices: question.choices.filter((_, j) => j !== choiceIndex) } 
        : question
    ));
  }, []);

  const handleImageUpload = useCallback(async (index, event) => {
    if (!event || !event.target || !event.target.files) {
      console.error("Invalid event object:", event);
      return;
    }
    const file = event.target.files[0];
    if (file && user) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `multiple_choice/${user.uid}/${selectedSetId}/question_${index}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateQuestion(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, updateQuestion, user]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    questions.forEach((question, index) => {
      if (!question.question.trim()) {
        newErrors[`question${index}`] = '問題文を入力してください。';
      }
      if (question.choices.filter(choice => choice.text.trim()).length < 2) {
        newErrors[`question${index}choices`] = '少なくとも2つの選択肢を入力してください。';
      }
      if (!question.choices.some(choice => choice.isCorrect)) {
        newErrors[`question${index}correct`] = '正解を選択してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, questions]);

  const deleteUnusedImages = useCallback(async (originalQuestions, updatedQuestions) => {
    const storage = getStorage();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const originalImageUrls = originalQuestions.map(question => question.image).filter(Boolean);
    const updatedImageUrls = updatedQuestions.map(question => question.image).filter(Boolean);

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
          questions: questions,
          type: 'multiple-choice',
        };
  
        if (!existingSetData.createdAt) {
          updatedSet.createdAt = serverTimestamp();
        } else {
          updatedSet.createdAt = existingSetData.createdAt;
        }
        updatedSet.updatedAt = serverTimestamp();
  
        const batch = writeBatch(db);
        batch.set(setRef, updatedSet, { merge: true });
  
        await deleteUnusedImages(originalQuestions, updatedSet.questions);
  
        await batch.commit();
  
        localStorage.setItem(`multiple-choiceSet_${selectedSetId}`, JSON.stringify(updatedSet));
  
        onSave(updatedSet);
        setOriginalQuestions(updatedSet.questions);
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
  }, [selectedSetId, setTitle, questions, validateForm, onSave, originalQuestions, deleteUnusedImages, user]);

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。') && user) {
      try {
        const storage = getStorage();
        for (const question of questions) {
          if (question.image) {
            const imageRef = ref(storage, question.image);
            await deleteObject(imageRef);
          }
        }

        const newProgress = await deleteSet(user.uid, selectedSetId);
        
        const updatedSets = await getSets(user.uid, 'multiple-choice');
        setSets(updatedSets);

        setSelectedSetId('');
        setSetTitle('');
        setQuestions([]);

        setErrors({});
        alert('セットが正常に削除されました。');
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, questions, user]);

  return (
    <div className={styles.editScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">多肢選択問題編集</h1>
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
              {questions.map((q, qIndex) => (
                <div key={qIndex} className={styles.previewCategory}>
                  <div className={styles.previewCategoryHeader}>
                    <h3 className={styles.previewCategoryTitle}>問題 {qIndex + 1}</h3>
                    {q.image && <img src={q.image} alt="Question image" className={styles.previewImage} />}
                  </div>
                  <p>{q.question}</p>
                  <h4 className={styles.previewCategoryTitle}>選択肢:</h4>
                  <ul className={styles.previewList}>
                    {q.choices.map((choice, cIndex) => (
                      <li key={cIndex} className={`${styles.previewListItem} ${choice.isCorrect ? styles.choiceCorrect : ""}`}>
                        {choice.text} {choice.isCorrect && "(正解)"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          questions && questions.length > 0 ? (
            <div className={styles.categoriesGrid}>
              {questions.map((q, qIndex) => (
                <Card key={`question-${qIndex}`} className={styles.categoryCard}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">問題 {qIndex + 1}</CardTitle>
                    <div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="問題文"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      className={`${styles.mobileFriendlyInput} mb-2`}
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(qIndex, e)}
                      className={styles.imageInput}
                    />
                    {q.image && <img src={q.image} alt="Uploaded image" className={styles.previewImage} />}
                    <h4 className="font-medium mt-4 mb-2">選択肢:</h4>
                    {q.choices.map((choice, cIndex) => (
                      <div key={cIndex} className={styles.checkboxContainer}>
                        <Checkbox
                          id={`choice-${qIndex}-${cIndex}`}
                          checked={choice.isCorrect}
                          onCheckedChange={(checked) => updateChoice(qIndex, cIndex, 'isCorrect', checked)}
                          className={styles.customCheckbox}
                        />
                        <label htmlFor={`choice-${qIndex}-${cIndex}`} className={styles.checkboxLabel}>
                          <Input
                            placeholder={`選択肢 ${cIndex + 1}`}
                            value={choice.text}
                            onChange={(e) => updateChoice(qIndex, cIndex, 'text', e.target.value)}
                            className={`${styles.mobileFriendlyInput} flex-grow mr-2`}
                          />
                        </label>
                        <Button variant="ghost" size="icon" onClick={() => removeChoice(qIndex, cIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => addChoice(qIndex)} className={styles.addChoiceButton}>
                      <Plus className={styles.addChoiceButtonIcon} /> 選択肢を追加
                    </Button>
                  </CardContent>
                  <CardFooter>
                    {errors[`question${qIndex}`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}`]}</AlertDescription></Alert>}
                    {errors[`question${qIndex}choices`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}choices`]}</AlertDescription></Alert>}
                    {errors[`question${qIndex}correct`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}correct`]}</AlertDescription></Alert>}
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
            <Button onClick={addQuestion} className={`${styles.bottomButton} ${styles.addButton}`}>
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

export default MultipleChoiceEditScreen;