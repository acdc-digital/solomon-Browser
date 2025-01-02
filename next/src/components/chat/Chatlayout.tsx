// ChatLayout.tsx
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/components/chat/Chatlayout.tsx

'use client'

import React from 'react';
import useChatStore from '@/lib/store/chatStore';
import Chat from './Chat';
import { useEditorStore } from '@/lib/store/editorStore';

export default function ChatLayout() {
    const { isChatActive, deactivateChat } = useChatStore(); // Access the chat visibility state
    const { projectId } = useEditorStore();

    return (
        <div className='flex flex-col items-center h-full w-full mt-2'>
            {isChatActive && projectId ? (
                <div className='flex flex-col h-full w-full'>
                    {/* Header Row */}
                    <div className='flex items-center justify-between text-gray-500 px-4 ml-auto mr-2'>
                        {/* Close Button */}
                        <button 
                            className='text-gray-500 hover:text-gray-200'
                            onClick={deactivateChat}
                            aria-label='Closed'
                            >
                            &#x2715; {/* Close Icon */}
                        </button>
                    </div>
                    {/* Chat Content */}
                    <div className='flex-1 overflow-auto ml-4 mr-4'>
                        <Chat projectId={projectId} />
                    </div>
                </div>
            ) : (
                <p className='text-center text-gray-600'>Choose a project to continue.</p>
            )}
        </div>
    );
}