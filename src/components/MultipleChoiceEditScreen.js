import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { getSets, getSetById, updateSet } from '@/utils/indexedDB';

const MultipleChoiceEditScreen = ({ onBack, onSave }) => {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [setTitle, setSetTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);

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
      const set = await getSetById(parseInt(value));
      setSetTitle(set.title);
      setQuestions(set.questions);
    } catch (error) {
      console.error("Error loading set:", error);
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
        const updatedSet = { 
          id: parseInt(selectedSetId),
          title: setTitle, 
          questions,
          type: 'multiple-choice'
        };
        await updateSet(updatedSet);
        onSave(updatedSet);
      } catch (error) {
        console.error("Error updating set:", error);
        // エラーハンドリングのUIを表示する
      }
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
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
              <SelectItem key={set.id} value={set.id.toString()}>{set.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="セットのタイトル"
          value={setTitle}
          onChange={(e) => setSetTitle(e.target.value)}
          className="mobile-friendly-input"
        />
        {errors.title && <Alert variant="destructive"><AlertDescription>{errors.title}</AlertDescription></Alert>}
      </div>

      {questions.map((q, qIndex) => (
        <Card key={qIndex} className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">問題 {qIndex + 1}</CardTitle>
            <div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewIndex(previewIndex === qIndex ? null : qIndex)} className="mobile-friendly-button">
                {previewIndex === qIndex ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="mobile-friendly-button">
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

      <div className="flex justify-between mt-4">
        <Button onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" /> 問題を追加
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> 保存
        </Button>
      </div>
    </div>
  );
};

export default MultipleChoiceEditScreen;