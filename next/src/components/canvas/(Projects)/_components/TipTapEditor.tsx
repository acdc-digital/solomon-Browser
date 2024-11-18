// TipTap Editor 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/TipTapEditor.tsx

import { AlignHorizontalDistributeCenterIcon, BoldIcon, BoltIcon, BotIcon, BotMessageSquareIcon, CodeIcon, CogIcon, FolderIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, ListIcon, ListOrderedIcon, PilcrowIcon, SplitIcon, Strikethrough, TextQuoteIcon } from 'lucide-react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';

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

  const documents = useQuery(api.documents.getDocuments)
  const createDocument = useMutation(api.documents.createDocument);

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
    <div>
      {/* Initial Heading */}
      <div className="flex flex-row gap-x-4 border-b bg-gray-50 p-2 pl-4 py-1 justify-end">
        <Button className="text-gray-600" variant="outline">
          <BoltIcon className="mr-2 h-4 w-4" />
          Editor
        </Button>
        <Button
          onClick={() => {
            createDocument({ title: "this is a test" });
          }}
          className="text-gray-600"
          variant="outline"
        >
          <FolderIcon className="mr-2 h-4 w-4" />
          Files
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


      {/* Editor Nav */}
      <div className="flex flex-row gap-x-4 border-b bg-white p-2 pl-4 py-0.5 items-center">
        
        <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .toggleBold()
            .run()
        }
        className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <BoldIcon size={18}/>
        </button>

        <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .toggleItalic()
            .run()
        }
        className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <ItalicIcon size={18}/>
        </button>

        <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .toggleStrike()
            .run()
        }
        className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <Strikethrough size={19}/>
        </button>

        {/* <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .toggleCode()
            .run()
        }
        className={editor.isActive('code') ? 'is-active' : ''}
        >
          <CodeIcon />
        </button>

        <button onClick={() => editor.chain().focus().unsetAllMarks().run()}>
        clear-marks
        </button>

        <button onClick={() => editor.chain().focus().clearNodes().run()}>
        clear-nodes
        </button> */}

        <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={editor.isActive('paragraph') ? 'is-active' : ''}
        >
          <PilcrowIcon size={20}/>
        </button>

        <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        >
          H1
        </button>

        {/* <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          <Heading2Icon />
        </button>

        <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        >
          <Heading3Icon />
        </button>

        <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
        >
          h4
        </button>

        <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
        >
          h5
        </button>

        <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
        >
          h6
        </button> 

        <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          <ListIcon />
        </button>

        <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          <ListOrderedIcon />
        </button> */}

        <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
        >
          <CodeIcon size={20}/>
        </button>

        <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        >
          <TextQuoteIcon size={20}/>
        </button>

        {/* <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <AlignHorizontalDistributeCenterIcon />
        </button>

        <button onClick={() => editor.chain().focus().setHardBreak().run()}>
          <SplitIcon />
        </button>

        <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .undo()
            .run()
          }
        >
          undo
        </button>

        <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={
          !editor.can()
            .chain()
            .focus()
            .redo()
            .run()
          }
        >
          redo
        </button> */}
      </div>

      <div 
        className='m-2'
        style={{ height: 'calc(80vh - 80px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <EditorContent
          className='mt-2'
          editor={editor} />
      </div>
    </div>
  );
};