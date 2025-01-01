// Display Convex Usage Stats
// /src/components/canvas/(User)/Users.tsx

'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';


const Users = () => {
  // Fetch usage stats using Convex's useQuery hook
  // const usageStats = useQuery(api.getUsage);

  // Handle loading state
  {/* 
    if (!usageStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mt-2 text-gray-500">Loading usage statistics...</p>
      </div>
    );
  }
    */}


  // Handle potential errors (if your setup supports it)
  // Convex's useQuery may not directly provide error states; handle accordingly.

  return (
    <div className="flex flex-col h-screen overflow-y">
      <div className="flex flex-col items-center gap-x-4 border rounded-t-lg bg-gray-50 mt-6 ml-3 mr-6 p-4 pl-4 py-2 justify-end">
        <p>Usage Statistics</p>
      {/*
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex items-center p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
          <div className="text-blue-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-5M12 20h5v-5M7 20h5v-5M2 20h5v-5M4 4h16v16H4V4z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500 dark:text-gray-300">Total Users</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              {usageStats.totalUsers}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
          <div className="text-green-500">
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5l3 3h5a2 2 0 012 2v10a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500 dark:text-gray-300">Active Users</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              {usageStats.activeUsers}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
          <div className="text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3v1m0 16v1m18-18v1M18 19v1M5 12h14M12 5v14"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500 dark:text-gray-300">Storage Used</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              {usageStats.storageUsedMB.toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>
      */}
      </div>
        <p
        className='flex flex-col text-center border-b border-l border-r ml-3 mr-6 p-6'
        >Coming Soon!</p>
    </div>
  );
};

export default Users;
