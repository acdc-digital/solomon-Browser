// TipTapEditor.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/TipTapEditor.tsx

import React, { useState } from 'react';
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
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  PlusCircle, // Alternative for Zoom In
  MinusCircle, // Alternative for Zoom Out
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';

import Gapcursor from '@tiptap/extension-gapcursor'
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
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';

import PageVisualization from './PageVisualization'; // Ensure correct import path

interface TipTapEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onChange,
  initialContent,
}) => {
  const [zoom, setZoom] = useState(1); // Initialize zoom state

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
      Gapcursor,
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
      }),
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

  // Zoom Handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3)); // Max zoom 300%
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5)); // Min zoom 50%
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center border-b bg-gray-50 p-2 gap-x-1">
        {/* Undo and Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className={buttonClass(false)}
          aria-label="Undo"
        >
          <UndoIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className={buttonClass(false)}
          aria-label="Redo"
        >
          <RedoIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Text Styles */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          aria-label="Toggle Bold"
        >
          <BoldIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          aria-label="Toggle Italic"
        >
          <ItalicIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={buttonClass(editor.isActive('underline'))}
          aria-label="Toggle Underline"
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          aria-label="Toggle Strikethrough"
        >
          <Strikethrough size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={buttonClass(editor.isActive('highlight'))}
          aria-label="Toggle Highlight"
        >
          <HighlighterIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          aria-label="Toggle Bullet List"
        >
          <ListIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          aria-label="Toggle Ordered List"
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
          aria-label="Align Left"
        >
          <AlignLeftIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={buttonClass(
            editor.isActive({ textAlign: 'center' }) as boolean
          )}
          aria-label="Align Center"
        >
          <AlignCenterIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={buttonClass(
            editor.isActive({ textAlign: 'right' }) as boolean
          )}
          aria-label="Align Right"
        >
          <AlignRightIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Insert Elements */}
        <button
          onClick={setLink}
          className={buttonClass(editor.isActive('link'))}
          aria-label="Insert Link"
        >
          <LinkIcon size={18} />
        </button>
        <button onClick={addImage} className={buttonClass(false)} aria-label="Insert Image">
          <ImageIcon size={18} />
        </button>
        <button onClick={addTable} className={buttonClass(false)} aria-label="Insert Table">
          <TableIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={buttonClass(editor.isActive('codeBlock'))}
          aria-label="Toggle Code Block"
        >
          <CodeIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          aria-label="Heading 1"
        >
          <Heading1Icon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          aria-label="Heading 2"
        >
          <Heading2Icon size={20} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 3 }))}
          aria-label="Heading 3"
        >
          <Heading3Icon size={20} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Zoom Controls */}
        <button
          onClick={handleZoomOut}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Zoom Out"
        >
          <MinusCircle size={18} /> {/* Use MinusCircle as Zoom Out */}
        </button>
        <span className="px-1">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Zoom In"
        >
          <PlusCircle size={18} /> {/* Use PlusCircle as Zoom In */}
        </button>
      </div>

      {/* Editor Content with Page Visualization */}
      <div className="flex-grow overflow-y-auto bg-gray-200 p-2">
        {/* Wrap EditorContent with PageVisualization */}
        <PageVisualization pageSize="A4" zoom={zoom}>
          <EditorContent
            editor={editor}
            className="h-full w-full"
            style={{ caretColor: 'black' }}
          />
        </PageVisualization>
      </div>
    </div>
  );
};

export default TipTapEditor;