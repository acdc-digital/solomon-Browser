// Chat.tsx
import React from 'react';
import ChatHeader from '@/components/chat/Chatheader';
import ChatLayout from '@/components/chat/Chatlayout';
import useChatStore from '@/lib/store/chatStore';
import { initResize } from '@/components/chat/Resizer';
import { GripVertical } from 'lucide-react'; // The "handle" icon

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

const Chat: React.FC = () => {
  const { chatWidth, setChatWidth } = useChatStore();

  return (
    <div className="flex h-full">
      {/* Resizer Container */}
      <div className="relative flex items-stretch">
        {/* Thin Vertical Line */}
        <div className="h-full w-px bg-gray-300" />

        {/* Handle in the Center */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 cursor-col-resize bg-white/70 rounded shadow-sm border border-gray-300"
          onMouseDown={(e) => initResize(e, setChatWidth, MIN_WIDTH, MAX_WIDTH)}
          onTouchStart={(e) => initResize(e, setChatWidth, MIN_WIDTH, MAX_WIDTH)}
          role="separator"
          aria-label="Resize chat panel"
        >
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      {/* Chat Panel */}
      <div
        id="chatPanel"
        className="flex flex-col border-l bg-white"
        style={{
            width: `${chatWidth}px`,
            minWidth: `${MIN_WIDTH}px`,
            maxWidth: `${MAX_WIDTH}px`,
        }}
        >
        <ChatHeader />
        <ChatLayout />
      </div>
    </div>
  );
};

export default Chat;