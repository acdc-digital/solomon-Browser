// Usage Stats Convex API
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/usage.tsx

{/*
import { query } from "./_generated/server";

// Define the UsageStats type based on your data structure
interface UsageStats {
  totalUsers: number;
  activeUsers: number;
  storageUsedMB: number;
  // Add other relevant fields
}

export const getUsage = query(async ({ db }): Promise<UsageStats> => {
  // Example queries - adjust based on your database schema

  // Count total users
  const totalUsers = await db.query('users').count();

  // Count active users (assuming a field like `isActive`)
  const activeUsers = await db.query('users').filter({ isActive: true }).count();

  // Calculate storage used (assuming you have a `files` collection with `size` in bytes)
  const files = await db.query('files').collect();
  const storageUsedMB = files.reduce((acc, file) => acc + (file.size || 0), 0) / (1024 * 1024);

  return {
    totalUsers,
    activeUsers,
    storageUsedMB,
    // Populate other fields as needed
  };
});
*/} 