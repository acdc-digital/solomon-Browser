// nodeRefiner.tsx
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/src/components/canvas/(Admin)/_components/nodeRefiner.tsx
// Example file that exports a utility to refine a node’s label/group using an LLM.

import OpenAI from "openai";

/**
 * If you’re prototyping in the browser, you must prefix your env variable 
 * with NEXT_PUBLIC_ and set dangerouslyAllowBrowser=true.
 * This is NOT recommended in production, but okay for dev prototypes.
 */
const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
const openaiKeyExists = Boolean(openaiApiKey);

let openai: OpenAI | null = null;
if (openaiKeyExists) {
  openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * A simple in-memory cache so we don’t re-call the LLM for the same (keywords, topics).
 * Key is JSON.stringify({ keywords, topics }).
 */
const refineCache: Record<string, { label: string; group: string }> = {};

/**
 * A simple in-memory cache for edge relationships as well.
 * Key could be JSON.stringify({ snippetA, snippetB }).
 */
const edgeCache: Record<string, string> = {};

/**
 * Calls the LLM to produce a short descriptive label & group for a node,
 * or returns a fallback label if no valid API key or the call fails.
 */
export async function refineNodeLabel(
  keywords: string[],
  topics: string[],
  fallbackLabel: string
): Promise<{ label: string; group: string }> {
  const cacheKey = JSON.stringify({ keywords, topics });
  if (refineCache[cacheKey]) {
    return refineCache[cacheKey];
  }

  // If there's no valid API key, skip calling OpenAI
  if (!openaiKeyExists) {
    const fallback = { label: fallbackLabel, group: "No-LLM" };
    refineCache[cacheKey] = fallback;
    return fallback;
  }

  const systemPrompt = `
    You are a helpful assistant. You receive a list of keywords and a list of topics.
    Please produce two things:
    1) A short node label (2-4 words) that summarizes the keywords.
    2) A single group label (1-2 words) from the topics array or a simplified category.
    Output in JSON: {"label": "...", "group": "..."}
  `.trim();

  const userContent = `
  Keywords: ${keywords.join(", ") || "None"}
  Topics: ${topics.join(", ") || "None"}
  `.trim();

  try {
    const completion = await openai!.chat.completions.create({
      model: "gpt-3.5-turbo", // Use a valid model name
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";
    let label = fallbackLabel;
    let group = "Generic";

    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed.label && typeof parsed.label === "string") {
        label = parsed.label;
      }
      if (parsed.group && typeof parsed.group === "string") {
        group = parsed.group;
      }
    } catch (err) {
      console.error("Error parsing refineNodeLabel JSON:", rawResponse, err);
    }

    refineCache[cacheKey] = { label, group };
    return { label, group };
  } catch (error) {
    console.error("Error calling refineNodeLabel:", error);
    const fallback = { label: fallbackLabel, group: "Generic" };
    refineCache[cacheKey] = fallback;
    return fallback;
  }
}

/**
 * Calls the LLM to produce a short relationship (1-2 sentences).
 * If no valid API key or any error, return a fallback string.
 */
export async function refineEdgeRelationship(
  snippetA: string,
  snippetB: string
): Promise<string> {
  const cacheKey = JSON.stringify({ snippetA, snippetB });
  if (edgeCache[cacheKey]) {
    return edgeCache[cacheKey];
  }

  // If there's no valid API key, return a fallback relationship
  if (!openaiKeyExists) {
    edgeCache[cacheKey] = "Relationship unavailable (no LLM).";
    return "Relationship unavailable (no LLM).";
  }

  const systemPrompt = `
    You are a helpful assistant. 
    You receive two short text snippets. 
    In 1-2 sentences, describe how they're related in theme or content.
    Provide an answer suitable as an "edge label" in a graph.
  `.trim();

  const userContent = `
  Snippet A:
  ---
  ${snippetA.slice(0, 250)}

  Snippet B:
  ---
  ${snippetB.slice(0, 250)}
  `.trim();

  try {
    const completion = await openai!.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 80,
    });

    let relationship = completion.choices[0]?.message?.content || "";
    relationship = relationship.trim();

    edgeCache[cacheKey] = relationship;
    return relationship;
  } catch (error) {
    console.error("Error calling refineEdgeRelationship:", error);
    const fallback = "No relationship found.";
    edgeCache[cacheKey] = fallback;
    return fallback;
  }
}