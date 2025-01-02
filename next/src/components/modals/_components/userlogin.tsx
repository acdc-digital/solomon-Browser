"use client";

import React from "react";
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsLeftRight } from "lucide-react";

interface UserloginProps {
  fallbackAvatar?: string; // optional fallback if user?.imageUrl is null
}

const Userlogin: React.FC<UserloginProps> = ({
  fallbackAvatar = "/default-avatar.png",
}) => {
  const { user } = useUser();

  // Example: use the user's first initial if `fullName` is available, otherwise `?`
  const avatarFallback = user?.fullName?.[0]?.toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-x-3 text-sm p-0">
          <Avatar className="border border-gray-300">
            <AvatarImage
              src={user?.imageUrl || fallbackAvatar}
              alt="User Avatar"
            />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <span className="text-start font-medium text-sm line-clamp-1">
            {user?.fullName || "Unknown User"}
          </span>
          <ChevronsLeftRight className="rotate-90 text-muted-foreground h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="start" alignOffset={11}>
        <div className="flex flex-col space-y-2 p-2">
          {/* Email */}
          {user?.emailAddresses?.[0]?.emailAddress && (
            <p className="text-sm font-medium leading-none text-muted-foreground">
              {user.emailAddresses[0].emailAddress}
            </p>
          )}
          {/* Full Name */}
          <div className="space-y-0">
            <p className="text-sm font-medium">{user?.fullName}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="w-full cursor-pointer text-muted-foreground">
          <SignOutButton>Log Out</SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Userlogin;