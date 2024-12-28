// /next/src/lib/similarity.ts

/**
 * Computes the cosine similarity between two vectors.
 * @param vecA - First vector.
 * @param vecB - Second vector.
 * @returns Cosine similarity value between -1 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must be of the same length.");
    }
  
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * (vecB[idx] || 0), 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
    return dotProduct / (magnitudeA * magnitudeB);
  }