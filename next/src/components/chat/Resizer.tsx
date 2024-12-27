// Panel Resizer
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/chat/Resizer.tsx

// Resizer.tsx
import { Dispatch, SetStateAction } from 'react';

export const initResize = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    setWidth: Dispatch<SetStateAction<number>>,
    minWidth: number,
    maxWidth: number
) => {
    e.preventDefault();
    const startX = e.clientX;

    // Target the next sibling (Chat Panel)
    const chatPanel = (e.target as HTMLDivElement).nextElementSibling as HTMLElement;
    const startWidth = chatPanel?.getBoundingClientRect().width || 300;

    const onMouseMove = (event: MouseEvent) => {
        const deltaX = event.clientX - startX;
        const newWidth = startWidth - deltaX; // Reversed delta

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            setWidth(newWidth);
        }
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};