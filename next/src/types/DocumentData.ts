// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/types/DocumentData.ts
// src/types/DocumentData.ts\

import { Id } from "../../convex/_generated/dataModel";

export interface DocumentData {
  _id: Id<"projects">;
  documentTitle: string;
  createdAt: Date;
  fileId: Id<"_storage">;
}