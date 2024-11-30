// TipTap Editor 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/TipTapEditor.tsx

import React from 'react';
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  Strikethrough,
  UnderlineIcon,
  HighlighterIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  UndoIcon,
  RedoIcon,
  ListIcon,
  ListOrderedIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  HeadingIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'

interface TipTapEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onChange,
  initialContent,
}) => {
  const editor = useEditor({
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none',
      },
    },
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList,
      OrderedList,
      ListItem,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Placeholder.configure({
        placeholder: 'Start typing here...',
      })
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onChange(content);
    },
  });

  React.useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const buttonClass = (isActive: boolean) =>
    `p-1 rounded hover:bg-gray-200 ${isActive ? 'bg-gray-300' : ''}`;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center border-b bg-gray-50 p-2 gap-x-1">
        {/* Undo and Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className={buttonClass(false)}
        >
          <UndoIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className={buttonClass(false)}
        >
          <RedoIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Text Styles */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
        >
          <BoldIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
        >
          <ItalicIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={buttonClass(editor.isActive('underline'))}
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
        >
          <Strikethrough size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={buttonClass(editor.isActive('highlight'))}
        >
          <HighlighterIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
        >
          <ListIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
        >
          <ListOrderedIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Text Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={buttonClass(
            editor.isActive({ textAlign: 'left' }) as boolean
          )}
        >
          <AlignLeftIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={buttonClass(
            editor.isActive({ textAlign: 'center' }) as boolean
          )}
        >
          <AlignCenterIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={buttonClass(
            editor.isActive({ textAlign: 'right' }) as boolean
          )}
        >
          <AlignRightIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Insert Elements */}
        <button
          onClick={setLink}
          className={buttonClass(editor.isActive('link'))}
        >
          <LinkIcon size={18} />
        </button>
        <button onClick={addImage} className={buttonClass(false)}>
          <ImageIcon size={18} />
        </button>
        <button onClick={addTable} className={buttonClass(false)}>
          <TableIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={buttonClass(editor.isActive('codeBlock'))}
        >
          <CodeIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading'))}
        >
          <Heading1Icon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading'))}
        >
          <Heading2Icon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={buttonClass(editor.isActive('heading'))}
        >
          <Heading3Icon size={20} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-grow overflow-y-auto bg-white">
        <EditorContent
          editor={editor}
          className="h-full w-full p-4"
          style={{ caretColor: 'black' }}
        />
      </div>
    </div>
  );
};