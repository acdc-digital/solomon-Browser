// Sidebar Footer
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/sidebar/Sidebarfooter.tsx

// Sidebarfooter.tsx
import React from 'react';

import { Settings, Trash2Icon } from 'lucide-react';
import { Button } from '../ui/button';
import { ProjectItem } from '@/components/sidebar/ProjectItem';
import { useSettings } from '@/hooks/use-settings';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Trashbox } from './Trashbox';

interface SidebarFooterProps {
  isExpanded: boolean; // Added isExpanded prop
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isExpanded }) => {
  const settings = useSettings();

  return (
    <div className="border-t py-4 mt-auto flex flex-col items-start">
      {/* Trashcan */}
      <Popover>
        <PopoverTrigger className="w-full pl-1 mb-1 text-left">
          <ProjectItem label="Trashcan" icon={Trash2Icon} />
        </PopoverTrigger>
        <PopoverContent className="ml-3 p-0 w-72">
          <Trashbox />
        </PopoverContent>
      </Popover>

      {/* Settings */}
      <div className="w-full mb-3 ml-1 pr-1">
        <ProjectItem onClick={settings.onOpen} label="Settings" icon={Settings} />
      </div>

      {/* © Text */}
      {isExpanded && (
        <p className="ml-5 text-sm text-gray-500 transition-opacity duration-300">
          © 2025 Solomon
        </p>
      )}
    </div>
  );
};

export default SidebarFooter;