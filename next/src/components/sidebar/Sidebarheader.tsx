// Sidebarheader.tsx
// Users/matthewsimon/Documents/GitHub/acdc.solomon-electron/solomon-electron/next/src/components/sidebar/Sidebarheader.tsx

'use client';

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarHeaderProps {
  title: string;
  isExpanded: boolean; // Added isExpanded prop
}

const ModeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ title, isExpanded }) => {
  return (
    <div className="px-4 py-3 border-b flex items-center bg-gray-50">
      {/* <Image
        className="mr-4"
        src="/solomon.svg"
        alt="Next.js Logo"
        width={25}
        height={25}
        priority
      /> */}
      <div className='flex items-center'>
        {/* Conditionally render the Home button with smooth transitions */}
        <Button
          className={`mr-4 transition-opacity duration-300 ${
            isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          variant={"outline"}
        >
          <Link href="/">Home</Link>
        </Button>

        {/* Optionally include the ModeToggle */}
        {/* <ModeToggle /> */}
      </div>
      {/* Conditionally render the title */}
      {isExpanded && <h3 className="text-lg font-semibold ml-3">{title}</h3>}
      {/* You can add more header content here, like buttons or status indicators */}
    </div>
  );
};

export default SidebarHeader;