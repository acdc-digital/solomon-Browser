// Chat.tsx
import React from 'react';
import ChatHeader from '@/components/chat/Chatheader';
import ChatLayout from '@/components/chat/Chatlayout';
import useChatStore from '@/lib/store/chatStore';
import { initResize } from '@/components/chat/Resizer';

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

const Chat: React.FC = () => {
    const { chatWidth, setChatWidth } = useChatStore();

    return (
        <div className="flex h-screen">
            {/* Resizer */}
            <div
                className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition-colors duration-200"
                onMouseDown={(e) => initResize(e, setChatWidth, MIN_WIDTH, MAX_WIDTH)}
                onTouchStart={(e) => initResize(e, setChatWidth, MIN_WIDTH, MAX_WIDTH)}
                aria-label="Resize chat panel"
                role="separator"
            />

            {/* Chat Panel */}
            <div
                className="flex flex-col border-l bg-white"
                style={{ width: `${chatWidth}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
            >
                <ChatHeader title="Chat" avatarUrl="path_to_avatar" fallbackText="U" />
                <ChatLayout />
            </div>
        </div>
    );
};

export default Chat;