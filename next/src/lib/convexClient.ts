// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/convexClient.ts
// /src/lib/convexClient.ts

import { ConvexHttpClient } from "convex/browser"; // Correct import for HTTP client

// Ensure that environment variables are defined
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const CONVEX_API_TOKEN = process.env.CONVEX_API_TOKEN;

if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined in the environment variables.");
}

if (!CONVEX_API_TOKEN) {
  throw new Error("CONVEX_API_TOKEN is not defined in the environment variables.");
}

// Initialize ConvexHttpClient with the origin URL only
const convex = new ConvexHttpClient(CONVEX_URL);

export default convex;