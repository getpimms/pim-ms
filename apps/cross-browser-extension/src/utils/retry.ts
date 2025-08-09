/**
 * Simple exponential backoff retry utility
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 2000,
    backoffFactor = 2,
    jitter = true,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on final attempt
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Don't retry on certain errors
      if (lastError.message.includes('context invalidated')) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      let delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
      delay = Math.min(delay, maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
