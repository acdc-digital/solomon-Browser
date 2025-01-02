// ChatHeader.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chatheader.tsx

"use client";

import React from 'react';
import { useUser } from '@clerk/clerk-react';

interface ChatHeaderProps {
  title: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ title }) => {
  const { user } = useUser();

  return (
    <div className="px-4 py-8 border-b flex items-center bg-gray-50">
      {/* Optional title or other elements */}
    </div>
  );
};

export default ChatHeader;
