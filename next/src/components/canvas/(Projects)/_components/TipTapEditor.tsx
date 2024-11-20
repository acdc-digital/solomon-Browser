// TipTap Editor 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/TipTapEditor.tsx

import React from 'react';
import { useEditorStore } from "@/lib/store/editorStore";
import { AlignHorizontalDistributeCenterIcon, BoldIcon, BoltIcon, BotIcon, BotMessageSquareIcon, CodeIcon, CogIcon, FolderIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, ListIcon, ListOrderedIcon, PilcrowIcon, SplitIcon, Strikethrough, SquareCheck, TextQuoteIcon, UnderlineIcon, HighlighterIcon, LinkIcon, ImageIcon, TableIcon } from 'lucide-react';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

import { Button } from '@/components/ui/button';
import { FileTable } from "./FileTable";

import useChatStore from '@/lib/store/chatStore';
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
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
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

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

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
      <div className="flex-grow overflow-y-auto">
        {activeView === "editor" && (
          <div className="flex flex-col h-full w-full">
            {/* Editor Toolbar */}
            <div className="flex flex-row gap-x-2 border-b bg-white p-2 items-center">
              {[
                {
                  icon: <BoldIcon size={18} />,
                  action: () => editor.chain().focus().toggleBold().run(),
                  isActive: editor.isActive("bold"),
                },
                {
                  icon: <ItalicIcon size={18} />,
                  action: () => editor.chain().focus().toggleItalic().run(),
                  isActive: editor.isActive("italic"),
                },
                {
                  icon: <UnderlineIcon size={18} />,
                  action: () => editor.chain().focus().toggleUnderline().run(),
                  isActive: editor.isActive("underline"),
                },
                {
                  icon: <Strikethrough size={18} />,
                  action: () => editor.chain().focus().toggleStrike().run(),
                  isActive: editor.isActive("strike"),
                },
                {
                  icon: <HighlighterIcon size={18} />,
                  action: () => editor.chain().focus().toggleHighlight().run(),
                  isActive: editor.isActive("highlight"),
                },
                {
                  icon: <LinkIcon size={18} />,
                  action: setLink,
                  isActive: editor.isActive("link"),
                },
                {
                  icon: <ImageIcon size={18} />,
                  action: addImage,
                  isActive: false,
                },
                {
                  icon: <TableIcon size={18} />,
                  action: addTable,
                  isActive: false,
                },
                {
                  icon: <CodeIcon size={18} />,
                  action: () => editor.chain().focus().toggleCodeBlock().run(),
                  isActive: editor.isActive("codeBlock"),
                },
                {/* {
                  icon: <TextQuoteIcon size={18} />,
                  action: () => editor.chain().focus().toggleBlockquote().run(),
                  isActive: editor.isActive("blockquote"),
                }, */}
              ].map((button, index) => (
                <button
                  key={index}
                  onClick={button.action}
                  className={`p-2 ${button.isActive ? "bg-gray-200" : ""}`}
                >
                  {button.icon}
                </button>
              ))}
            </div>

            {/* Editor Content */}
            <div className="flex-grow overflow-y-auto bg-white">
              <EditorContent editor={editor} className="h-full w-full p-4" />
            </div>
          </div>
        )}
        {activeView === "files" && (
          <FileTable caption="List of Files" files={files} />
        )}
      </div>
    </div>
  );
};