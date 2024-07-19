import React from 'react';
import { logOut } from '../utils/auth';
import { Button } from '@/components/ui/button';

const SignOut = ({ onSignOut }) => {
  const handleSignOut = async () => {
    try {
      await logOut();
      onSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Button onClick={handleSignOut}>Sign Out</Button>
  );
};

export default SignOut;