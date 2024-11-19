// Canvasheader.tsx
// /Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/components/canvas/Canvasheader.tsx

import React from 'react';
import Link from "next/link";
import { Button } from '../ui/button';

interface CanvasHeaderProps {
    title: string; // You can add more props as needed
}

// Pass onClick callbacks for each button
const CanvasHeader: React.FC<CanvasHeaderProps & { 
	onAdminClick: () => void, 
	onProjectsClick: () => void, 
	onFilesClick: () => void, 
	onTasksClick: () => void, 
	onDocsClick: () => void,
	}> = ({ title, onAdminClick, onProjectsClick, onFilesClick, onTasksClick, onDocsClick }) => {
    // Modify your Button components to call the provided callbacks on click
    return (
        <div className="px-4 py-1 border-b flex flex-row items-center bg-gray-50">
			<div className='flex m-2'>
				<Button 
					className='mr-2'
					variant={"outline"} 
					onClick={onAdminClick}>
					Admin
				</Button>

				<Button 
					className='mr-2'
					variant={"outline"} 
					onClick={onFilesClick}>
					Files 
				</Button>

				<Button
					className='mr-2' 
					variant={"outline"} 
					onClick={onProjectsClick}>
					Projects
				</Button>

			</div>
				{/* Push the Docs button to the right */}
				<div className='ml-auto mr-2'> 
					<Button 
						variant={"outline"} 
						onClick={onDocsClick}>
						Docs
					</Button>
				</div>
		</div>

    );
};

export default CanvasHeader;

