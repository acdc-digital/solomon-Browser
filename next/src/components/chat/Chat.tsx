// Chat.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chat.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Import the special graph chat constant from your ChatHeader module.
import { GRAPH_CHAT_ID } from "./Chatheader";

// Interfaces for chat messages.
interface ChatEntry {
  _id: string;
  input: string;
  response: string;
}

interface PendingMessage {
  id: string;      // Local-only ID (e.g. "pending-1685647384")
  input: string;   // User’s typed text
}

interface ChatProps {
  projectId: string; // Either a regular project id or "graph-chat"
}

export default function Chat({ projectId }: ChatProps) {
  // Determine if we're in graph-chat mode.
  const isGraphChat = projectId === GRAPH_CHAT_ID;

  // 1. Query messages.
  // If graph chat, use our dedicated graph chat query (which does not require a projectId parameter).
  // Otherwise, use the project-specific query.
  const entries = useQuery(
    isGraphChat ? api.graphChat.getAllGraphChatEntries : api.chat.getAllEntries,
    isGraphChat ? {} : { projectId }
  );

  // 2. Select the appropriate action/mutation for sending messages.
  const handleUserAction = useAction(
    isGraphChat ? api.graphChat.handleGraphUserAction : api.chat.handleUserAction
  );

  // 3. Local states.
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  // 4. Refs for scrolling and auto-resize.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages or pending messages change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, pendingMessages]);

  // Auto-resize the textarea as you type.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 5. Handle user submission.
  const onSubmit = async (msg: string) => {
    if (msg.trim() === "") return;
    setMessage("");
    setIsLoading(true);

    const pendingId = `pending-${Date.now()}`;
    setPendingMessages((prev) => [...prev, { id: pendingId, input: msg }]);

    try {
      if (isGraphChat) {
        // Graph chat does not require a projectId.
        await handleUserAction({ message: msg });
      } else {
        await handleUserAction({ message: msg, projectId });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Remove ephemeral messages once the server includes them.
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    setPendingMessages((prev) =>
      prev.filter((pm) => !entries.some((entry) => entry.input === pm.input))
    );
  }, [entries]);

  // 7. Merge pending and server messages.
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
              <div className="text-sm text-right text-gray-500">You:</div>

              {/* Display user message */}
              <div className="text-right">
                <div className="inline-block bg-gray-100 text-black px-3 py-2 rounded-md text-left max-w-[85%] break-words">
                  {entry.input}
                </div>
              </div>

              {/* Display "Thinking..." for pending messages or show response */}
              {isEphemeral ? (
                <div className="text-xs text-gray-500 ml-2 text-right">(Thinking...)</div>
              ) : (
                "response" in entry &&
                entry.response && (
                  <>
                    <div className="text-sm mt-2 text-gray-500">Solomon:</div>
                    <div className="ml-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {entry.response}
                      </ReactMarkdown>
                    </div>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(message);
            }
          }}
          className="flex-1 form-input px-4 bg-gray-100 border border-black rounded-md focus:outline-none focus:ring-0 resize-none leading-normal"
          placeholder="Type your message..."
          style={{ overflow: "auto", maxHeight: "200px" }}
        />
      </form>
    </div>
  );
}