import React from 'react';

import { Settings, Trash2Icon } from 'lucide-react';
import { Button } from '../ui/button';
import { ProjectItem } from '@/components/sidebar/ProjectItem';
import { useSettings } from '@/hooks/use-settings';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Trashbox } from './Trashbox';

const SidebarFooter: React.FC = () => {
    const settings = useSettings();

    return (
        <div className="border-t py-4 mt-auto">
            {/* Footer content goes here */}
            <Popover>
                <PopoverTrigger className='w-full pl-1 mb-1 text-left'>
                    <ProjectItem 
                    label="Trashcan" 
                    icon={Trash2Icon}
                    />
                </PopoverTrigger>
                <PopoverContent className='ml-3 p-0 w-72'>
                    <Trashbox />
                </PopoverContent>
            </Popover>

            <div className='mb-3 ml-1'>
                <ProjectItem
                    onClick={settings.onOpen}
                    label="Settings"
                    icon={Settings}
                    /> 
            </div>
            <p className="ml-5 text-sm text-gray-500">
                © 2025 Solomon
            </p>
        </div>
    );
};

export default SidebarFooter;