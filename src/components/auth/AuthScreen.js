import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import styles from '@/styles/modules/AuthScreen.module.css';

/**
 * =============================================
 * 認証画面コンポーネント
 * =============================================
 */

/**
 * @component AuthScreen
 * @description サインインとサインアップの機能を提供する認証画面
 * @param {Function} onSignIn - サインイン成功時のコールバック関数
 * @param {Function} onSignUp - サインアップ成功時のコールバック関数
 */
const AuthScreen = ({ onSignIn, onSignUp }) => {
  // ステート管理
  const [activeTab, setActiveTab] = useState('signin');

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        {/* カードヘッダー */}
        <CardHeader className="space-y-1">
          <CardTitle className={styles.cardTitle}>
            ようこそ
          </CardTitle>
          <p className={styles.cardDescription}>
            アカウントを作成するか、既存のアカウントでサインインしてください
          </p>
        </CardHeader>
        {/* カードコンテンツ */}
        <CardContent>
          {/* タブコンポーネント */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 ${styles.tabsList}`}>
              <TabsTrigger value="signin" className={styles.tabsTrigger}>サインイン</TabsTrigger>
              <TabsTrigger value="signup" className={styles.tabsTrigger}>サインアップ</TabsTrigger>
            </TabsList>
            {/* サインインタブ */}
            <TabsContent value="signin">
              <SignIn onSignIn={onSignIn} />
            </TabsContent>
            {/* サインアップタブ */}
            <TabsContent value="signup">
              <SignUp onSignUp={onSignUp} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthScreen;