// Files Dashbaord
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Admin)/Admin.tsx

'use client'

import React from "react";
import { useUser } from "@clerk/clerk-react";

import Image from "next/image";
import { Button } from "../../ui/button";
import { PlusCircle } from "lucide-react";

const Files = () => {
  const { user } = useUser();

  return (
    <div className="flex flex-col h-screen overflow-y">
      <p className="mt-6 text-center"> Search </p>
      <div className="flex flex-col items-center gap-x-4 border rounded-t-lg bg-gray-50 mt-6 ml-3 mr-3 p-4 pl-4 py-2 justify-end">
          <p> Display Files List for ALL Files in Convex Database</p>
      </div>
      <div>
        <p className="text-center">content</p>
      </div>
    </div>
  );
}

export default Files;