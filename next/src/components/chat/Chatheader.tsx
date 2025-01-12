// ChatHeader.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/chat/Chatheader.tsx

"use client";

import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEditorStore } from "@/lib/store/editorStore";
import { FolderIcon, Activity } from "lucide-react"; // Using an icon for Graph Chat (Activity icon here as an example)

interface ChatHeaderProps {
  title: string;
}

// This constant is used as a special identifier for graph chat.
export const GRAPH_CHAT_ID = "graph-chat";

const ChatHeader: React.FC<ChatHeaderProps> = ({ title }) => {
  const { user } = useUser();
  const { projectId, setProjectId } = useEditorStore();

  // Fetch projects for the dropdown. Using undefined for parentProject.
  const projects = useQuery(api.projects.getSidebar, { parentProject: undefined });

  // When a project or graph chat is selected, update state.
  const handleSelect = (id: string) => {
    setProjectId(id);
  };

  return (
    <div className="px-4 py-3 border-b flex items-center bg-gray-50">
      {/* Title on the left */}
      <h1 className="text-lg font-bold ml-4">{title}</h1>

      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {projectId === GRAPH_CHAT_ID
              ? "Graph Chat"
              : projectId
              ? "Select Chat"
              : "Select Project"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {/* Dedicated Graph Chat Item */}
          <div
            onClick={() => handleSelect(GRAPH_CHAT_ID)}
            className="flex items-center cursor-pointer px-2 py-1 hover:bg-gray-100"
          >
            <Activity className="mr-2 h-4 w-4" />
            <span className={`${projectId === GRAPH_CHAT_ID ? "font-bold" : "font-normal"}`}>
              Graph Chat
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          {projects ? (
            projects.map((project) => (
              <div
                key={project._id}
                onClick={() => handleSelect(project._id)}
                className="flex items-center cursor-pointer px-2 py-1 hover:bg-gray-100"
              >
                <FolderIcon className="mr-2 h-4 w-4" />
                <span className={`${projectId === project._id ? "font-bold" : "font-normal"}`}>
                  {project.title}
                </span>
              </div>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-gray-500">Loading...</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ChatHeader;