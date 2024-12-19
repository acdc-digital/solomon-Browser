// Dashboard Page
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/app/dashboard/page.tsx

'use client'

import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';

import Sidebar from './_components/Sidebar'
import Canvas from './_components/Canvas';
import Chat from './_components/Chat';


const DashboardPage: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const handleProjectSelection = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  return (
    <DashboardLayout >
      <div className="flex flex-1 h-screen pb-2">
          <Sidebar onProjectSelect={handleProjectSelection} />
          <Canvas activeProjectId={activeProjectId} />
          <Chat />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;