// MetaData Extractor!
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/metadataExtractors.ts

/**
 * A naive keyword extractor example using simple frequency-based approach.
 * In production, consider TF-IDF, RAKE, or an NLP library like spaCy.
 */
export function extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    const freq: Record<string, number> = {};
    for (const word of words) {
      // Filter out short words
      if (word.length >= 4) {
        freq[word] = (freq[word] || 0) + 1;
      }
    }
    // Sort by frequency and take top 10
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);
  }
  
  /**
   * Simple entity extractor placeholder.
   * Replace with an actual NER library like spaCy, Hugging Face, or compromise.js.
   */
  export function extractEntities(text: string): string[] {
    // Just an example: This pattern tries to find capitalized words (like names).
    const entityRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    const matches = text.match(entityRegex) || [];
    return Array.from(new Set(matches)); // remove duplicates
  }
  
  /**
   * Simple "topic modeling" placeholder.
   * In real usage, you'd feed text to something like LDA, BERTopic, or OpenAI topic classification.
   */
  export function assignTopics(text: string): string[] {
    // Naive approach: check for certain keywords
    const topics: string[] = [];
    if (text.match(/\b(market|finance|stock)\b/i)) {
      topics.push("Finance");
    }
    if (text.match(/\b(ml|machine learning|ai|artificial intelligence)\b/i)) {
      topics.push("AI");
    }
    if (text.match(/\b(law|legal|court|act)\b/i)) {
      topics.push("Legal");
    }
    return topics;
  }