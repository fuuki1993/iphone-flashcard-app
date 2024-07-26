import React, { useState, useCallback, useEffect } from 'react';
import styles from '@/styles/modules/CommonCreationScreen.module.css';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Checkbox } from '@/components/ui/form/checkbox';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { saveSet } from '@/utils/firebase/firestore';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { compressImage } from '@/utils/helpers/imageCompression';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";

const MultipleChoiceCreationScreen = ({ onBack, onSave }) => {
  const [setTitle, setSetTitle] = useState('');
  const [questions, setQuestions] = useState([{ 
    question: '', 
    choices: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    image: null 
  }]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
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
    const savedData = localStorage.getItem('multipleChoiceCreationData');
    if (savedData) {
      const { title, questions } = JSON.parse(savedData);
      setSetTitle(title);
      setQuestions(questions);
    }
  }, []);

  useEffect(() => {
    // データをローカルストレージに保存
    localStorage.setItem('multipleChoiceCreationData', JSON.stringify({ title: setTitle, questions }));
  }, [setTitle, questions]);

  const addQuestion = useCallback(() => {
    setQuestions(prevQuestions => [...prevQuestions, { 
      question: '', 
      choices: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      image: null 
    }]);
  }, []);

  const updateQuestion = useCallback((index, field, value) => {
    setQuestions(prevQuestions => prevQuestions.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions(prevQuestions => prevQuestions.filter((_, i) => i !== index));
  }, []);

  const addChoice = useCallback((questionIndex) => {
    setQuestions(prevQuestions => prevQuestions.map((q, i) => 
      i === questionIndex ? { ...q, choices: [...q.choices, { text: '', isCorrect: false }] } : q
    ));
  }, []);

  const updateChoice = useCallback((questionIndex, choiceIndex, field, value) => {
    setQuestions(prevQuestions => prevQuestions.map((q, i) => 
      i === questionIndex ? {
        ...q,
        choices: q.choices.map((c, j) => 
          j === choiceIndex ? { ...c, [field]: value } : field === 'isCorrect' ? { ...c, isCorrect: false } : c
        )
      } : q
    ));
  }, []);

  const removeChoice = useCallback((questionIndex, choiceIndex) => {
    setQuestions(prevQuestions => prevQuestions.map((q, i) => 
      i === questionIndex ? { ...q, choices: q.choices.filter((_, j) => j !== choiceIndex) } : q
    ));
  }, []);

  const handleImageUpload = useCallback(async (index, event) => {
    const file = event.target.files[0];
    if (file && user) {
      try {
        const compressedImage = await compressImage(file);
        const storage = getStorage();
        const storageRef = ref(storage, `multiple_choice/${user.uid}/temp_${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateQuestion(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [user, updateQuestion]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!setTitle.trim()) {
      newErrors.title = 'セットタイトルを入力してください。';
    }
    questions.forEach((q, index) => {
      if (!q.question.trim()) {
        newErrors[`question${index}`] = '問題文を入力してください。';
      }
      if (q.choices.filter(c => c.text.trim()).length < 2) {
        newErrors[`question${index}choices`] = '少なくとも2つの選択肢を入力してください。';
      }
      if (!q.choices.some(c => c.isCorrect)) {
        newErrors[`question${index}correct`] = '正解を選択してください。';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [setTitle, questions]);

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
      const newSet = {
        title: setTitle,
        questions: await Promise.all(questions.map(async (q, i) => {
          if (q.image) {
            const storage = getStorage();
            const oldRef = ref(storage, q.image);
            const newRef = ref(storage, `multiple_choice/${user.uid}/question_${Date.now()}_${i}`);
            
            const oldBlob = await getBlob(oldRef);
            await uploadBytes(newRef, oldBlob);
            const newUrl = await getDownloadURL(newRef);
            await deleteObject(oldRef);
  
            return { ...q, image: newUrl };
          }
          return q;
        })),
        type: 'multiple-choice'
      };
  
      const savedSet = await saveSet(newSet, user.uid);
  
      localStorage.removeItem('multipleChoiceCreationData');
      onSave(savedSet);
    } catch (error) {
      console.error("Error saving set:", error);
      setErrors(prevErrors => ({ ...prevErrors, save: `セットの保存中にエラーが発生しました: ${error.message}` }));
    } finally {
      setIsSaving(false);
    }
  }, [setTitle, questions, validateForm, onSave, user, isSaving]);
  
  const togglePreview = useCallback((index) => {
    setPreviewIndex(prevIndex => prevIndex === index ? null : index);
  }, []);

  return (
    <div className={styles.creationScreenContainer}>
      <div className={styles.scrollableContent}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">多肢選択問題作成</h1>
        </div>

        <div className="mb-6">
          <Input
            placeholder="セットのタイトル"
            value={setTitle}
            onChange={(e) => setSetTitle(e.target.value)}
            className={`${styles.mobileFriendlyInput} mb-2`}
            style={{ fontSize: '16px' }}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="mb-4 w-full sm:w-[calc(50%-0.5rem)] inline-block align-top">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">問題 {qIndex + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => togglePreview(qIndex)}>
                  {previewIndex === qIndex ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewIndex === qIndex ? (
                <div className={styles.previewContent}>
                <h3 className={styles.previewTitle}>問題:</h3>
                <p>{q.question}</p>
                {q.image && <img src={q.image} alt="Question" className={styles.previewImage} />}
                <h3 className={styles.previewTitle}>選択肢:</h3>
                <ul className={styles.previewList}>
                  {q.choices.map((choice, cIndex) => (
                    <li key={cIndex} className={choice.isCorrect ? styles.choiceCorrect : ""}>
                      {choice.text} {choice.isCorrect && "(正解)"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
                <>
                  <Textarea
                    ref={inputRef}
                    placeholder="問題文"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    className={`${styles.mobileFriendlyInput} mb-2`}
                    style={{ fontSize: '16px' }}
                  />
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(qIndex, e)}
                    className={styles.mobileFriendlyInput}
                  />
                  {q.image && <img src={q.image} alt="Uploaded" className={styles.previewImage} />}
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
                          style={{ fontSize: '16px' }}
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
                </>
              )}
            </CardContent>
            <CardFooter>
              {errors[`question${qIndex}`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}`]}</AlertDescription></Alert>}
              {errors[`question${qIndex}choices`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}choices`]}</AlertDescription></Alert>}
              {errors[`question${qIndex}correct`] && <Alert variant="destructive"><AlertDescription>{errors[`question${qIndex}correct`]}</AlertDescription></Alert>}
            </CardFooter>
          </Card>
        ))}

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

export default MultipleChoiceCreationScreen;