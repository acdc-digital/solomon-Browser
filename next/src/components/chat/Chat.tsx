// Chat.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chat.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatEntry {
  _id: string;
  input: string;
  response: string;
}

interface PendingMessage {
  id: string;      // local-only ID (e.g. "pending-1685647384")
  input: string;   // user’s typed text
}

export default function Chat({ projectId }: { projectId: string }) {
  // 1. Query official server messages
  const entries = useQuery(api.chat.getAllEntries, { projectId });

  // 2. Send user messages to the server
  const handleUserAction = useAction(api.chat.handleUserAction);

  // 3. Local states
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  // 4. Refs for scrolling & auto-resize
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever entries or pendingMessages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, pendingMessages]);

  // Auto-resize the <textarea> as you type
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 5. Handle user submission
  const onSubmit = async (msg: string) => {
    if (msg.trim() === "") return;
    setMessage("");
    setIsLoading(true);

    const pendingId = `pending-${Date.now()}`;
    setPendingMessages((prev) => [...prev, { id: pendingId, input: msg }]);

    try {
      await handleUserAction({ message: msg, projectId });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Remove ephemeral messages once the server includes them
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    setPendingMessages((prev) =>
      prev.filter((pm) => {
        const isReflectedOnServer = entries.some(
          (entry) => entry.input === pm.input
        );
        return !isReflectedOnServer;
      })
    );
  }, [entries]);

  // 7. Merge ephemeral + server messages
  const mergedEntries: Array<ChatEntry | PendingMessage> = [
    ...(entries || []),
    ...pendingMessages,
  ];

  return (
    <div className="relative flex flex-col h-full">
      {/* Chat Display */}
      <div className="flex-col rounded-xl h-[635px] border-black overflow-y-auto mt-2 mb-4 pr-2">
        {mergedEntries.map((entry) => {
          const isEphemeral = !("_id" in entry);

          return (
            <div
              key={isEphemeral ? entry.id : entry._id}
              className="flex flex-col gap-2 text-black p-2"
            >
              {/* "You:" label */}
              <div className="text-sm items-end text-right">You:</div>

              {/* User message in a light "cloud box" */}
              <div className="text-right">
                <div className="inline-block bg-gray-100 text-black px-3 py-2 rounded-md text-left max-w-[85%] break-words">
                  {entry.input}
                </div>
              </div>

              {/* If ephemeral -> show small "Thinking..." placeholder
                  If real entry -> show Solomon's response if present */}
              {isEphemeral ? (
                <div className="text-xs text-gray-500 ml-2 items-end text-right">(Thinking...)</div>
              ) : (
                "response" in entry &&
                entry.response && (
                  <>
                    <div className="text-sm mt-2">Solomon:</div>
                    <div className="ml-2">{entry.response}</div>
                  </>
                )
              )}
            </div>
          );
        })}
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 form-input px-4 bg-gray-100 border border-black rounded-md
                     focus:outline-none focus:ring-0 resize-none"
          placeholder="Type your message..."
          style={{ overflow: "auto", maxHeight: "200px" }}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="ml-2 px-3 bg-gray-700 text-white rounded-md hover:bg-gray-500 border-black"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <ArrowUp size={20} />
          )}
        </button>
      </form>
    </div>
  );
}