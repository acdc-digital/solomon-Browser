// Chat.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chat.tsx

'use client';

import { useAction, useQuery } from 'convex/react';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../convex/_generated/api';
import { ArrowUp } from 'lucide-react';

export default function Chat({ projectId }: { projectId: string }) { // projectId as string
  const handleUserAction = useAction(api.chat.handleUserAction);
  const entries = useQuery(api.chat.getAllEntries, { projectId }); // Pass as string
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scrollHeight
    }
  }, [message]);

  const onSubmit = async (message: string) => {
    if (message.trim() === '') return; // Prevent empty messages
    await handleUserAction({ message, projectId }); // Pass as string
    setMessage('');
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Chat Display */}
      <div className=" flex-col bg-gray-100 rounded-xl h-[635px] border border-black overflow-y-auto mt-2 mb-4">
        {entries?.map((entry) => (
          <div key={entry._id} className="flex flex-col gap-2 text-black p-2">
            <div className="font-semibold">You:</div>
            <div className="ml-2">{entry.input}</div>
            <div className="font-semibold mt-2">Solomon:</div>
            <div className="ml-2">{entry.response}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        className="absolute bottom-0 left-0 right-0 flex mb-4 z-10"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(message);
        }}
      >
        <textarea
          ref={textareaRef}
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 form-input px-4 bg-gray-100 border border-black rounded-md focus:outline-none focus:ring-0 resize-none"
          placeholder="Type your message..."
          style={{ overflow: 'auto', maxHeight: '200px' }}
        />
        <button
          type="submit"
          className="ml-2 px-3 bg-gray-700 text-white rounded-md hover:bg-gray-500 border-black"
        >
          <ArrowUp />
        </button>
      </form>
    </div>
  );
}