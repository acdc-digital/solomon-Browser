// Settings Modal 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/modals/settings-modal.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-settings";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { InfinityIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useEditorStore } from "@/lib/store/editorStore"; // Import Zustand store
import Userlogin from "./_components/userlogin";

export const SettingsModal = () => {
  const settings = useSettings();
  const setActiveComponent = useEditorStore((state) => state.setActiveComponent); // Access setActiveComponent from Zustand

  const navigateToUsers = () => {
    setActiveComponent("Users"); // Set the active component to "Users"
    settings.onClose(); // Close the Settings Modal
  };

  return (
    <>
      {/* Main Settings Dialog */}
      <Dialog open={settings.isOpen} onOpenChange={settings.onClose}>
        <DialogContent>
          <DialogHeader className="border-b pb-3">
            <h2 className="text-lg font-medium">My Settings</h2>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">

            {/* Appearance Section */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-y-1">
                <Label>Appearance</Label>
                <span className="text-[0.8rem] text-muted-foreground">
                  Customize
                </span>
              </div>
              <ModeToggle />
            </div>

            {/* Usage Section */}
            <div className="flex items-center justify-between">
              {/* Left Side: Label and Description */}
              <div className="flex flex-col">
                <Label>Usage</Label>
                <span className="text-[0.8rem] text-muted-foreground">
                  View your database usage
                </span>
              </div>

              {/* Right Side: Infinity Icon Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToUsers} // Updated onClick handler
                aria-label="View Usage Statistics" // Accessibility improvement
              >
                <InfinityIcon />
              </Button>
            </div>

            {/* User Login Section */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-y-1">
                <Label>Account</Label>
                <span className="text-[0.8rem] text-muted-foreground">
                  Manage your account
                </span>
              </div>

              {/* Right Side: Reusable Avatar/Dropdown */}
              <Userlogin />
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Removed Usage Statistics Dialog */}
      {/* Since we're navigating within the canvas, this separate dialog is no longer needed */}
    </>
  );
};