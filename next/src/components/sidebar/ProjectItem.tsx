// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/sidebar/ProjectItem.tsx

'use client';

import {
  ChevronDown,
  ChevronRight,
  LucideIcon,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Trash2Icon,
  TrashIcon,
} from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { useUser } from '@clerk/clerk-react';

interface ProjectItemProps {
  id?: Id<'projects'>;
  projectIcon?: string;
  active?: boolean;
  expanded?: boolean;
  isSearch?: boolean;
  level?: number;
  onExpand?: () => void;
  label: string;
  onClick?: () => void;
  icon: LucideIcon;
}

export const ProjectItem = ({
  id,
  label,
  onClick,
  icon: Icon,
  active,
  projectIcon,
  isSearch,
  level = 0,
  onExpand,
  expanded,
}: ProjectItemProps) => {
  const { user } = useUser();
  const router = useRouter();
  const create = useMutation(api.projects.create);
  const archive = useMutation(api.projects.archive);

  const onArchive = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
    if (!id) return;
    const promise = archive({ id });

    toast.promise(promise, {
      loading: 'Moving to Trash...',
      success: 'Project Moved to Trash!',
      error: 'Failed to Archive Project.',
    });
  };

  const handleExpand = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
    onExpand?.();
  };

  const onCreate = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
    if (!id) return;
    const promise = create({ title: 'Untitled', parentProject: id }).then(
      (projectId) => {
        if (!expanded) {
          onExpand?.();
        }
        // router.push(`/projects/${projectId}`);
      }
    );

    toast.promise(promise, {
      loading: 'Creating a new Project...',
      success: 'New Project Created!',
      error: 'Failed to Create a new Project',
    });
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      onClick={onClick}
      role="button"
      style={{
        // Add Padding to Project Children
        paddingLeft: level ? `${level * 4 + 4}px` : '4px',
      }}
      className={cn(
        'ml-3 mr-5 mb-1 group border border-gray-400 rounded-md min-h-[27px] text-sm py-1 pr-3 flex items-center font-medium hover:bg-primary/5',
        // Change Background for Active Project
        active && 'bg-primary/5 text-primary'
      )}
    >
      {!!id && (
        <div
          role="button"
          className="h-full rounded-sm hover:bg-neutral-300 mr-1 flex-shrink-0"
          onClick={handleExpand}
        >
          <ChevronIcon
            className="h-4 w-4 shrink-0 text-muted-foreground/50"
          />
        </div>
      )}
      {projectIcon ? (
        <div className="shrink-0 mr-2 text-[18px]">
          {projectIcon}
        </div>
      ) : (
        <Icon className="shrink-0 h-[16px] mr-2" />
      )}
      {/* Updated Span for Truncation */}
      <span className="flex-1 truncate">{label}</span>
      {isSearch}
      {!!id && (
        <div className="ml-auto flex items-center gap-x-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              asChild
            >
              <div
                role="button"
                className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm"
              >
                <TrashIcon className="h-4 w-4 text-gray-600" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-60"
              align="start"
              side="right"
              forceMount
            >
              <DropdownMenuItem onClick={onArchive}>
                <Trash2Icon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="text-xs text-muted-foreground p-2">
                Last edited by: {user?.fullName}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div
            className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm"
            role="button"
            onClick={onCreate}
          >
            <PlusCircle className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
};

ProjectItem.Skeleton = function ProjectItemSkeleton({
  level,
}: {
  level?: number;
}) {
  return (
    <div
      className="flex gap-x-2 py-[3px]"
      style={{
        paddingLeft: level ? `${level * 3 + 4}px` : '4px',
      }}
    >
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[30%]" />
    </div>
  );
};