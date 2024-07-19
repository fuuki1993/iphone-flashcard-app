import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { getSets, getSetById, updateSet, deleteSet } from '@/utils/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";

const MultipleChoiceEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const [originalQuestions, setOriginalQuestions] = useState([]);

  useEffect(() => {
    const loadSets = async () => {
      try {
        const loadedSets = await getSets('multiple-choice');
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
      const set = await getSetById(value); // parseInt を削除
      setSetTitle(set.title);
      setQuestions(set.questions);
      setOriginalQuestions(set.questions);
    } catch (error) {
      console.error("Error loading set:", error);
      setErrors(prevErrors => ({ ...prevErrors, load: "セットの読み込み中にエラーが発生しました。" }));
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      question: '', 
      choices: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      image: null 
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = questions.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    );
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addChoice = (questionIndex) => {
    const updatedQuestions = questions.map((q, i) => 
      i === questionIndex ? { ...q, choices: [...q.choices, { text: '', isCorrect: false }] } : q
    );
    setQuestions(updatedQuestions);
  };

  const updateChoice = (questionIndex, choiceIndex, field, value) => {
    const updatedQuestions = questions.map((q, i) => 
      i === questionIndex ? {
        ...q,
        choices: q.choices.map((c, j) => 
          j === choiceIndex ? { ...c, [field]: value } : field === 'isCorrect' ? { ...c, isCorrect: false } : c
        )
      } : q
    );
    setQuestions(updatedQuestions);
  };

  const removeChoice = (questionIndex, choiceIndex) => {
    const updatedQuestions = questions.map((q, i) => 
      i === questionIndex ? { ...q, choices: q.choices.filter((_, j) => j !== choiceIndex) } : q
    );
    setQuestions(updatedQuestions);
  };

  const handleImageUpload = useCallback(async (index, event) => {
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
        const storageRef = ref(storage, `multiple_choice/${user.uid}/${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, compressedImage);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateQuestion(index, 'image', downloadURL);
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors(prevErrors => ({ ...prevErrors, image: "画像のアップロード中にエラーが発生しました。" }));
      }
    }
  }, [updateQuestion]);

  const validateForm = () => {
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
  };

// 新しい関数を追加
const deleteUnusedImages = useCallback(async (originalQuestions, updatedQuestions) => {
  const storage = getStorage();
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const originalImageUrls = originalQuestions.map(q => q.image).filter(Boolean);
  const updatedImageUrls = updatedQuestions.map(q => q.image).filter(Boolean);

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

  // handleSave 関数を修正
  const handleSave = useCallback(async () => {
    if (validateForm()) {
      try {
        const updatedSet = { 
          id: selectedSetId,
          title: setTitle, 
          questions,
          type: 'multiple-choice'
        };

        // 未使用の画像を削除
        await deleteUnusedImages(originalQuestions, updatedSet.questions);

        await updateSet(updatedSet);
        onSave(updatedSet);

        // 保存後に originalQuestions を更新
        setOriginalQuestions(updatedSet.questions);
      } catch (error) {
        console.error("Error updating set:", error);
        setErrors(prevErrors => ({ ...prevErrors, save: "セットの更新中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, setTitle, questions, validateForm, onSave, originalQuestions, deleteUnusedImages]);

  // handleDelete 関数を修正
  const handleDelete = useCallback(async () => {
    if (window.confirm('このセットを削除してもよろしいですか？この操作は取り消せません。')) {
      try {
        // Delete all images associated with this set
        const storage = getStorage();
        for (const question of questions) {
          if (question.image) {
            const imageRef = ref(storage, question.image);
            await deleteObject(imageRef);
          }
        }
        await deleteSet(selectedSetId);
        onBack();
      } catch (error) {
        console.error("Error deleting set:", error);
        setErrors(prevErrors => ({ ...prevErrors, delete: "セットの削除中にエラーが発生しました。" }));
      }
    }
  }, [selectedSetId, questions, onBack]);

  return (
    <div className="mobile-friendly-form max-w-full overflow-x-hidden">
      <div className="scrollable-content px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">多肢選択問題編集</h1>
        </div>

        <div className="mb-6">
          <Select onValueChange={handleSetChange} value={selectedSetId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="編集するセットを選択" />
            </SelectTrigger>
            <SelectContent>
              {sets.map(set => (
                <SelectItem key={set.id} value={set.id}>{set.title}</SelectItem>
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

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">問題 {qIndex + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => setPreviewIndex(previewIndex === qIndex ? null : qIndex)}>
                  {previewIndex === qIndex ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewIndex === qIndex ? (
                <div className="bg-gray-100 p-4 rounded-md">
                  <h3 className="font-bold mb-2">問題:</h3>
                  <p>{q.question}</p>
                  {q.image && <img src={q.image} alt="Question" className="mt-2 max-w-full h-auto" />}
                  <h3 className="font-bold mt-4 mb-2">選択肢:</h3>
                  <ul className="list-disc pl-5">
                    {q.choices.map((choice, cIndex) => (
                      <li key={cIndex} className={choice.isCorrect ? "text-green-600 font-bold" : ""}>
                        {choice.text} {choice.isCorrect && "(正解)"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="問題文"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    className="mb-2"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(qIndex, e)}
                    className="mb-2"
                  />
                  {q.image && <img src={q.image} alt="Uploaded" className="mt-2 max-w-full h-auto" />}
                  <h4 className="font-medium mt-4 mb-2">選択肢:</h4>
                  {q.choices.map((choice, cIndex) => (
                    <div key={cIndex} className="flex items-center mb-2">
                      <Checkbox
                        checked={choice.isCorrect}
                        onCheckedChange={(checked) => updateChoice(qIndex, cIndex, 'isCorrect', checked)}
                        className="mr-2"
                      />
                      <Input
                        placeholder={`選択肢 ${cIndex + 1}`}
                        value={choice.text}
                        onChange={(e) => updateChoice(qIndex, cIndex, 'text', e.target.value)}
                        className="flex-grow mr-2"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeChoice(qIndex, cIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => addChoice(qIndex)} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" /> 選択肢を追加
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

        <div className="fixed-bottom">
          <div className="flex justify-between">
            <Button onClick={addQuestion} >
              <Plus className="mr-2 h-4 w-4" /> 問題を追加
            </Button>
            <Button onClick={handleSave} >
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceEditScreen;