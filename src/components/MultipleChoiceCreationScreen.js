'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { saveSet } from '@/utils/indexedDB';
import { useAutoScroll } from '@/hooks/useAutoScroll';

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

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateQuestion(index, 'image', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleSave = async () => {
    if (validateForm()) {
      try {
        const newSet = { 
          title: setTitle, 
          questions,  // questionsを使用
          type: 'multiple-choice' // タイプ情報を追加
        };
        const id = await saveSet(newSet);
        onSave({ ...newSet, id });
      } catch (error) {
        console.error("Error saving set:", error);
        // エラーハンドリングのUIを表���する
      }
    }
  };

  const togglePreview = (index) => {
    setPreviewIndex(previewIndex === index ? null : index);
  };

  return (
    <div className="mobile-friendly-form max-w-full overflow-x-hidden">
      <div className="scrollable-content px-4">
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
            className="mobile-friendly-input mb-2 text-base"
            style={{ fontSize: '16px' }}
          />
          {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">問題 {qIndex + 1}</CardTitle>
              <div>
                <Button variant="ghost" size="icon" onClick={() => togglePreview(qIndex)}>
                  {previewIndex === qIndex ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} >
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
                    ref={inputRef}
                    placeholder="問題文"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    className="mobile-friendly-input mb-2 text-base"
                    style={{ fontSize: '16px' }}
                  />
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(qIndex, e)}
                    className="mobile-friendly-input mb-2"
                  />
                  {q.image && <img src={q.image} alt="Uploaded" className="mt-2 max-w-full h-auto" />}
                  <h4 className="font-medium mt-4 mb-2">選択肢:</h4>
                  {q.choices.map((choice, cIndex) => (
                    <div key={cIndex} className="flex items-center mb-2">
                      <Checkbox
                        ref={inputRef}
                        checked={choice.isCorrect}
                        onCheckedChange={(checked) => updateChoice(qIndex, cIndex, 'isCorrect', checked)}
                        className="mr-2"
                      />
                      <Input
                        ref={inputRef}
                        placeholder={`選択肢 ${cIndex + 1}`}
                        value={choice.text}
                        onChange={(e) => updateChoice(qIndex, cIndex, 'text', e.target.value)}
                        className="mobile-friendly-input flex-grow mr-2 text-base"
                        style={{ fontSize: '16px' }}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeChoice(qIndex, cIndex)} >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => addChoice(qIndex)}>
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
            <Button onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" /> 問題を追加
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

export default MultipleChoiceCreationScreen;