// Chat.tsx
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/app/dashboard/_components/Chat.tsx

import React, { useState } from 'react';
import ChatHeader from '@/components/chat/Chatheader';
import ChatLayout from '@/components/chat/Chatlayout';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]); // Assuming Message is a defined type/interface

    const sendMessage = (newMessage: Message) => {
        setMessages(prevMessages => [...prevMessages, newMessage]);
    };

    return (
        <div className='flex flex-col w-[24%] h-screen border-l'>
            <ChatHeader title="Chat" />
            <ChatLayout />
        </div>
    );
};

export default Chat;
