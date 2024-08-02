import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, Lock, Search, Filter, Eye } from 'lucide-react';
import { getSets, publishSet, unpublishSet, getPublishedSets, copyPublishedSet, getUserDisplayName, getPublicSetDetails } from '@/utils/firebase/firestore';
import PublicSetDetailsModal from './PublicSetDetailsModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/form/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import styles from '@/styles/modules/ShareScreen.module.css';  // この行を追加

const ShareScreen = ({ onBack, user }) => {
  const [userSets, setUserSets] = useState([]);
  const [publishedSets, setPublishedSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [activeTab, setActiveTab] = useState('my-sets');
  const [activeQuizType, setActiveQuizType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '' });
  const [selectedSet, setSelectedSet] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isSetAlreadyCopied = (publishedSetTitle) => {
    return userSets.some(set => set.title === publishedSetTitle);
  };

  useEffect(() => {
    const fetchSets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (user) {
          const sets = await getSets(user.uid);
          setUserSets(sets);
        }
        const published = await getPublishedSets();
        console.log('Published sets:', published);
        
        // 各公開セットの作成者の表示名を取得
        const publishedWithDisplayNames = await Promise.all(published.map(async (set) => {
          const displayName = await getUserDisplayName(set.originalAuthorId);
          return { ...set, authorDisplayName: displayName };
        }));
        
        setPublishedSets(publishedWithDisplayNames);

      } catch (err) {
        console.error("セットの取得中にエラーが発生しました:", err);
        setError("セットの読み込み中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSets();
  }, [user]);

  const handlePublish = async (setId) => {
    try {
      const setToPublish = userSets.find(set => set.id === setId);
      if (setToPublish.originalAuthorId && setToPublish.originalAuthorId !== user.uid) {
        setDialogContent({
          title: '公開エラー',
          description: 'コピーされたセットは公開できません。'
        });
        setDialogOpen(true);
        return;
      }
      const publicSetId = await publishSet(user.uid, setId);
      setUserSets(userSets.map(set => 
        set.id === setId ? { ...set, isPublished: true, publicSetId } : set
      ));
      setDialogContent({
        title: '公開成功',
        description: `セットが正常に公開されました。公開ID: ${publicSetId}`
      });
      setDialogOpen(true);
    } catch (err) {
      console.error("セットの公開中にエラーが発生しました:", err);
      setDialogContent({
        title: '公開エラー',
        description: 'セットの公開中にエラーが発生しました。'
      });
      setDialogOpen(true);
    }
  };

  const handleUnpublish = async (setId) => {
    try {
      await unpublishSet(user.uid, setId);
      setUserSets(userSets.map(set => 
        set.id === setId ? { ...set, isPublished: false } : set
      ));
    } catch (err) {
      console.error("セットの非公開化中にエラーが発生しました:", err);
      setError("セットの非公開化中にエラーが発生しました。");
    }
  };



  const handleViewDetails = async (setId) => {
    try {
      const setDetails = await getPublicSetDetails(setId);
      const authorDisplayName = await getUserDisplayName(setDetails.originalAuthorId);
      setSelectedSet({ ...setDetails, authorDisplayName });
      setIsDetailsModalOpen(true);
    } catch (err) {
      console.error("セット詳細の取得中にエラーが発生しました:", err);
      setDialogContent({
        title: '詳細取得エラー',
        description: 'セット詳細の取得中にエラーが発生しました。'
      });
      setDialogOpen(true);
    }
  };

  const handleCopy = async (publishedSetId) => {
    setIsCopying(true);
    try {
      await copyPublishedSet(user.uid, publishedSetId);
      const updatedSets = await getSets(user.uid);
      setUserSets(updatedSets);
      setDialogContent({
        title: 'コピー成功',
        description: `セットが正常にコピーされました。`
      });
      setDialogOpen(true);
      setIsDetailsModalOpen(false);  // モーダルを閉じる
      setSelectedSet(null);  // 選択されたセットをリセット
    } catch (err) {
      console.error("公開セットのコピー中にエラーが発生しました:", err);
      setDialogContent({
        title: 'コピーエラー',
        description: `公開セットのコピー中にエラーが発生しました: ${err.message}`
      });
      setDialogOpen(true);
    } finally {
      setIsCopying(false);
    }
  };

  const filterSets = (sets) => {
    return sets.filter(set => 
      set.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (activeQuizType === 'all' || set.type === activeQuizType)
    );
  };

  const renderSetList = (sets, handleAction, actionLabel, showAuthor = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filterSets(sets).map(set => {
        const isAlreadyCopied = activeTab === 'published-sets' && isSetAlreadyCopied(set.title);
        const buttonLabel = typeof actionLabel === 'function' ? actionLabel(set) : actionLabel;
        return (
          <Card key={set.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{set.title}</CardTitle>
              {showAuthor && (
                <CardDescription>作成者: {set.authorDisplayName || set.originalAuthorId || '不明'}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">タイプ: {quizTypes.find(type => type.id === set.type)?.label || set.type}</p>
            </CardContent>
            <CardFooter className="mt-auto">
              {activeTab === 'published-sets' && (
                <Button 
                  onClick={() => handleViewDetails(set.id)} 
                  variant="outline" 
                  className="w-full mb-2"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  詳細を見る
                </Button>
              )}
              <Button 
                onClick={() => handleAction(set.id)} 
                variant="outline" 
                className="w-full"
                disabled={isAlreadyCopied || (activeTab === 'my-sets' && set.originalAuthorId && set.originalAuthorId !== user.uid)}
              >
                {isAlreadyCopied ? 'コピー済み' : buttonLabel}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  const quizTypes = [
    { id: 'all', label: '全て' },
    { id: 'flashcard', label: 'フラッシュカード' },
    { id: 'qa', label: '一問一答' },
    { id: 'multiple-choice', label: '多肢選択' },
    { id: 'classification', label: '分類' }
  ];

  if (isLoading) return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">エラー: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">共有</h1>
      </div>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      <div className="flex items-center mb-6">
        <div className="relative flex-grow mr-4">
          <Input
            type="text"
            placeholder="セットを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> フィルター</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>クイズタイプ</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quizTypes.map(type => (
              <DropdownMenuItem key={type.id} onSelect={() => setActiveQuizType(type.id)}>
                {type.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="my-sets">自分のセット</TabsTrigger>
          <TabsTrigger value="published-sets">公開されているセット</TabsTrigger>
        </TabsList>
        <TabsContent value="my-sets">
          {renderSetList(
            userSets,
            (setId) => userSets.find(s => s.id === setId).isPublished ? handleUnpublish(setId) : handlePublish(setId),
            (set) => {
              if (set.isPublished) {
                return '非公開にする';
              } else if (set.originalAuthorId && set.originalAuthorId !== user.uid) {
                return 'コピーされたセット';
              } else {
                return '公開する';
              }
            }
          )}
        </TabsContent>
        <TabsContent value="published-sets">
          {renderSetList(
            publishedSets,
            handleCopy,
            'コピーする',
            true
          )}
        </TabsContent>
      </Tabs>

      <PublicSetDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        set={selectedSet}
        onCopy={handleCopy}
        isAlreadyCopied={selectedSet ? isSetAlreadyCopied(selectedSet.title) : false}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={styles.dialogContent}>
          <DialogHeader>
            <DialogTitle className={styles.dialogTitle}>{dialogContent.title}</DialogTitle>
            <DialogDescription className={styles.dialogDescription}>{dialogContent.description}</DialogDescription>
          </DialogHeader>
          <div className={styles.dialogFooter}>
            <Button 
              onClick={() => setDialogOpen(false)} 
              className={`${styles.dialogButton} ${styles.dialogSecondaryButton}`}
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareScreen;