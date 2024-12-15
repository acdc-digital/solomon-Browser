// /Users/matthewsimon/Documents/Github/solomon-electron/solomon-electron/next/src/app/api/search/route.ts
// SearchAPI

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient'; 
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from '../../../../convex/_generated/api';

export const runtime = "nodejs"; // Ensure the route runs in Node.js runtime if needed.

export async function POST(request: Request) {
  try {
    const { query, projectId } = await request.json();

    // Validate inputs
    if (!query || !projectId) {
      return NextResponse.json({ error: 'Missing query or projectId' }, { status: 400 });
    }

    // Call the Convex action
    const results = await convex.action(api.search.search, { query, projectId });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/search route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}