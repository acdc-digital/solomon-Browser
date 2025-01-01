// Canvas.tsx
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/app/dashboard/_components/Canvas.tsx

'use client'

import React from 'react';

import CanvasHeader from '@/components/canvas/Canvasheader';
import Admin from '@/components/canvas/(Admin)/Admin'; 
import Projects from '@/components/canvas/(Projects)/Projects'
import Files from '@/components/canvas/(Files)/Files'; 
import Tasks from '@/components/canvas/(Tasks)/Tasks';
import Docs from '@/components/canvas/(Docs)/Docs';
import Users from '@/components/canvas/(User)/Users'; // Import Users component

import { useEditorStore } from '@/lib/store/editorStore'; // Import Zustand store

interface CanvasProps {
    activeProjectId: string | null;
}  

const Canvas: React.FC<CanvasProps> = ({ activeProjectId }) => {
    // Access activeComponent and setter from Zustand store
    const activeComponent = useEditorStore((state) => state.activeComponent);
    const setActiveComponent = useEditorStore((state) => state.setActiveComponent);

    const renderComponent = () => {
        switch(activeComponent) {
            case 'Admin': return <Admin />;
            case 'Files': return <Files />;
            case 'Projects': return <Projects projectId={activeProjectId}/>;
            case 'Docs': return <Docs />;
            case 'Users': return <Users />; // Render Users component
            default: return <Admin />; // Default case
        }
    };

    return (
        <div className='flex flex-col flex-grow bg-[#FFF] overflow-hidden dark:bg-neutral-200'>
            <CanvasHeader
                title="Canvas"
                onAdminClick={() => setActiveComponent('Admin')}
                onProjectsClick={() => setActiveComponent('Projects')}
                onFilesClick={() => setActiveComponent('Files')}
                // onTasksClick={() => setActiveComponent('Tasks')}
                onDocsClick={() => setActiveComponent('Docs')}
            /> 
            {renderComponent()}
        </div>
    );
};

export default Canvas;