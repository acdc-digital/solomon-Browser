// Sidebar
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/app/dashboard/_components/Sidebar.tsx

'use client';

import SidebarHeader from '@/components/sidebar/Sidebarheader';
import SidebarFooter from '@/components/sidebar/Sidebarfooter';
import { Button } from '@/components/ui/button';
import { useMutation } from 'convex/react';
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  PlusCircle,
  Search,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';
import { ProjectItem } from '@/components/sidebar/ProjectItem';
import { ProjectList } from '@/components/sidebar/Project-List';
import { Separator } from '@/components/ui/separator';
import { useSearch } from '@/hooks/use-search';
import { useEditorStore } from '@/lib/store/editorStore';

interface SidebarProps {
  onProjectSelect: (projectId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onProjectSelect }) => {
  const search = useSearch();
  const { setProjectId } = useEditorStore();

  // State to toggle the sidebar width
  const [isExpanded, setIsExpanded] = useState(true);

  // Persist sidebar state in localStorage
  useEffect(() => {
    const storedState = localStorage.getItem('sidebarExpanded');
    if (storedState !== null) {
      setIsExpanded(JSON.parse(storedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Function to toggle the state
  const toggleSidebar = () => {
    console.log('Toggling sidebar');
    setIsExpanded((prev) => !prev);
  };

  const create = useMutation(api.projects.create);

  const handleCreate = () => {
    const promise = create({ title: 'New Project' });

    toast.promise(promise, {
      loading: 'Creating a new Project...',
      success: 'New Project Created!',
      error: 'Failed to Create a new Project',
    });
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    // Set the projectId in the editor store as soon as a project is selected
    setProjectId(projectId as any); // Replace 'as any' with proper typing if projectId is Id<"projects">

    // Call the parent prop with the selected projectId
    onProjectSelect(projectId);
  };

  return (
    <div
      className={`flex flex-col ${
        isExpanded ? 'w-60' : 'w-16' 
      } h-screen border-r transition-[width] duration-300 ease-in-out overflow-hidden flex-shrink-0`}
    >
      {/* Sidebar Header */}
      <SidebarHeader title="" isExpanded={isExpanded} />

      {/* Toggle Button */}
      <Button
        variant="link"
        className="flex justify-end items-center w-full"
        onClick={toggleSidebar}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded ? (
          <ArrowLeftFromLine className="w-4 h-4" />
        ) : (
          <ArrowRightFromLine className="w-4 h-4" />
        )}
      </Button>

      {/* Inner Content */}
      <div
        className={`flex flex-col flex-grow transition-opacity duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Search & New Project Buttons */}
        <div className="mb-2 ml-2">
          <ProjectItem
            onClick={search.onOpen}
            label="Search"
            icon={Search}
            isSearch
          />
        </div>

        <div className="mb-2 ml-2">
          <ProjectItem
            onClick={handleCreate}
            label="New Project"
            icon={PlusCircle}
          />

          {/* <ProjectItem
            href="/dashboard"
            label="Collapse All"
            icon={RefreshCcw}
          /> */}
          <div>
            <Separator className="mt-4 mb-2" />
          </div>
        </div>

        {/* Project List */}
        <div className="flex flex-grow flex-col overflow-y-auto">
          <ProjectList onProjectSelect={handleProjectSelect} />
        </div>

        {/* Sidebar Footer */}
        <SidebarFooter isExpanded={isExpanded} />
      </div>
    </div>
  );
};

export default Sidebar;