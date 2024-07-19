import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const AuthScreen = ({ onSignIn, onSignUp }) => {
  const [activeTab, setActiveTab] = useState('signin');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            ようこそ
          </CardTitle>
          <p className="text-center text-sm text-gray-500">
            アカウントを作成するか、既存のアカウントでサインインしてください
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">サインイン</TabsTrigger>
              <TabsTrigger value="signup">サインアップ</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <SignIn onSignIn={onSignIn} />
            </TabsContent>
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