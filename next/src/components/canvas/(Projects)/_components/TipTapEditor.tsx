// TipTap Editor 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/TipTapEditor.tsx

import { useEditorStore } from "@/lib/store/editorStore";
import { AlignHorizontalDistributeCenterIcon, BoldIcon, BoltIcon, BotIcon, BotMessageSquareIcon, CodeIcon, CogIcon, FolderIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, ListIcon, ListOrderedIcon, PilcrowIcon, SplitIcon, Strikethrough, SquareCheck, TextQuoteIcon } from 'lucide-react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { FileTable } from "./FileTable";

import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import CodeBlock from '@tiptap/extension-code-block'
import Gapcursor from '@tiptap/extension-gapcursor'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit';

import useChatStore from '@/lib/store/chatStore';
import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { title } from 'process';


interface TipTapEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onChange,
  initialContent,
}) => {

  const { activeView, setActiveView } = useEditorStore();

  const files = [
    { filename: "File1.docx", type: "Document", dateAdded: "2023-11-14" },
    { filename: "Image1.png", type: "Image", dateAdded: "2023-11-13" },
    { filename: "Spreadsheet1.xlsx", type: "Spreadsheet", dateAdded: "2023-11-12" },
  ];

  const editor = useEditor({
    extensions: [
      // TextStyle.configure({ types: [ListItem.name] }),
      StarterKit.configure({
      bulletList: {
        keepMarks: true,
        keepAttributes: false, 
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false, 
      },
    }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onChange(content);
    },
  });

  // Destructure activateChat from the store
  const { activateChat } = useChatStore();

  React.useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className='flex flex-col'>
      {/* Initial Heading */}
      <div className="flex flex-row gap-x-4 border-b bg-gray-50 p-2 pl-4 py-1 justify-end">
        <Button className={`text-gray-600 ${
                activeView === "editor" ? "border-b border-gray-500" : ""
                }`}
                variant="outline"
                onClick={() => setActiveView("editor")} >
              <BoltIcon className="mr-2 h-4 w-4" />
            Editor
        </Button>
        <Button className={`text-gray-600 ${
                activeView === "files" ? "border-b border-gray-500" : ""
                }`}
                variant="outline"
                onClick={() => setActiveView("files")} >
              <FolderIcon className="mr-2 h-4 w-4" />
            Files
        </Button>
        <Button
          className="text-gray-600"
          variant="outline"
          >
          <SquareCheck className="mr-2 h-5 w-5" />
          Tasks
        </Button>
        <Button
          className="text-gray-600"
          variant="outline"
          onClick={() => activateChat()}
        >
          <BotIcon className="mr-2 h-5 w-5" />
          Chat
        </Button>
      </div>


      {/* Dynamic Content */}
      <div className="flex-grow overflow-y-auto m-2">
        {activeView === "editor" && (
          <div>
            {/* Editor Toolbar */}
            <div className="flex flex-row gap-x-4 border-b bg-white p-2 pl-4 py-0.5 items-center">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={editor.isActive("bold") ? "is-active" : ""}
              >
                <BoldIcon size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={editor.isActive("italic") ? "is-active" : ""}
              >
                <ItalicIcon size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={editor.isActive("strike") ? "is-active" : ""}
              >
                <Strikethrough size={19} />
              </button>
              <button
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={editor.isActive("paragraph") ? "is-active" : ""}
              >
                <PilcrowIcon size={20} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive("codeBlock") ? "is-active" : ""}
              >
                <CodeIcon size={20} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive("blockquote") ? "is-active" : ""}
              >
                <TextQuoteIcon size={20} />
              </button>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />
          </div>
        )}
        {activeView === "files" && (
          <FileTable caption="List of Files" files={files} />
        )}
      </div>
    </div>
  );
};