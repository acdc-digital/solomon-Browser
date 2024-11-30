// Docs 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Docs)/Docs.tsx

'use client'

import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Badge } from "@/components/ui/badge"
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const Docs = () => {
  const { user } = useUser();

    return (
        <div>
          <div className="ml-6 mt-6 flex flex-row items-center justify-start text-xl underline">
            Solomon Docs
          </div>
            {/* Other documentation components */}
            <div className="mt-8  mr-2 flex flex-row gap-x-3 justify-center">
              <Badge variant="outline">Next.js</Badge>
              <Badge variant="outline">Typescript</Badge>
              <Badge variant="outline">Tailwind</Badge>
              <Badge variant="outline">ShadCN</Badge>
              <Badge variant="outline">Convex DB</Badge>
              <Badge variant="outline">TipTap Editor</Badge>
              <Badge variant="outline">Clerk Auth</Badge>
              <Badge variant="outline">OpenAI Chat</Badge>
              <Badge variant="outline">Zustand</Badge>
            </div>
            {/* Button Scroll Navbar */}
            <div className="mt-6 ml-6 flex flex-row gap-x-4">
              <Button
                className="border border-gray-600 text-gray-700" 
                variant="secondary">
                Top-Level
              </Button>
              <Button
                className="border border-gray-600 text-gray-700" 
                variant="secondary">
                Sidebar
              </Button>
              <Button
                className="border border-gray-600 text-gray-700" 
                variant="secondary">
                Canvas
              </Button>
              <Button
                className="border border-gray-600 text-gray-700" 
                variant="secondary">
                Chat
              </Button>
            </div>
            {/* More components or documentation sections */}
            <div className="mt-8 ml-8 flex flex-col items-start">
            <Image
            src="/Excal-TopLevelFiles.png"
            height="650"
            width="650"
            alt="Top level file organization."
            className="pb-4"
            />
            </div>
            <div className="mt-8 ml-8 flex flex-col items-start">
            <Image
            src="/Project_Id_Layers.png"
            height="650"
            width="650"
            alt="Associating projectId's with documents."
            className="pb-4"
            />
            </div>
        </div>
    );
}
  
export default Docs;
