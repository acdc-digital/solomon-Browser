// ChatLayout.tsx
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/components/chat/Chatlayout.tsx
'use client'

import React from 'react';
import useChatStore from '@/lib/store/chatStore';
import Chat from './Chat';
import { useEditorStore } from '@/lib/store/editorStore';

export default function ChatLayout() {
    const { isChatActive } = useChatStore(); // Access the chat visibility state
    const { projectId } = useEditorStore();

    return (
        <div className='flex flex-col items-center h-full mt-4'>
            {isChatActive && projectId ? (
                <Chat projectId={projectId} />
            ) : (
                <p className='text-center text-gray-600'>Create a project to continue.</p>
            )}
        </div>
    );
}

