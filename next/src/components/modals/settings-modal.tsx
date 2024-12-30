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
import { useState } from "react";
import { InfinityIcon } from "lucide-react";
import { Button } from "../ui/button";

export const SettingsModal = () => {
  const settings = useSettings();
  const [isUsageOpen, setIsUsageOpen] = useState(false);

  const openUsageDialog = () => setIsUsageOpen(true);
  const closeUsageDialog = () => setIsUsageOpen(false);

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
                onClick={openUsageDialog}
              >
                <InfinityIcon />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Statistics Dialog */}
      <Dialog open={isUsageOpen} onOpenChange={setIsUsageOpen}>
        <DialogContent>
          <DialogHeader className="border-b pb-3">
            <h2 className="text-lg font-medium">Usage Statistics</h2>
          </DialogHeader>
          <div className="mt-4">
            {/* Placeholder for usage statistics */}
            <p>Your usage statistics will appear here.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};