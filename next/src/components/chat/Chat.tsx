// Chat.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chat.tsx

'use client';

import { useAction, useQuery } from 'convex/react';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../convex/_generated/api';

export default function Chat({ projectId }: { projectId: string }) { // projectId as string
  const handleUserAction = useAction(api.chat.handleUserAction);
  const entries = useQuery(api.chat.getAllEntries, { projectId }); // Pass as string
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const onSubmit = async (message: string) => {
    if (message.trim() === '') return; // Prevent empty messages
    await handleUserAction({ message, projectId }); // Pass as string
    setMessage('');
  };

  return (
    <div className="flex flex-col">
      {/* Chat Display */}
      <div className="bg-gray-100 rounded-xl h-[640px] border border-gray-400 overflow-y-auto mt-2 mb-4">
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
        className="flex mt-0 mb-4 mx-0"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(message);
        }}
      >
        <input
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 form-input px-4 py-2 bg-gray-100 border border-gray-400 rounded-md"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}