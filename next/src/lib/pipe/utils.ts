// Utils for Backoff
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/utils.ts

/**
 * Retry a given async function with exponential backoff and jitter.
 * 
 * @param fn - The async function to retry
 * @param retries - Number of retries
 * @param delay - Initial delay in milliseconds (it will double on each retry)
 * @returns The result of fn() if it eventually succeeds
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      // Add jitter by randomizing the delay slightly
      const jitter = Math.floor(Math.random() * 100);
      const totalDelay = delay + jitter;
      console.warn(
        `Operation failed. Retrying in ${totalDelay}ms... (Retries left: ${retries - 1})`
      );
      await new Promise(res => setTimeout(res, totalDelay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }
  