/**
 * Firecrawl client utility
 * Provides a singleton client instance initialized with global configuration
 */
import FirecrawlApp from '@mendable/firecrawl-js';

let clientInstance: FirecrawlApp | null = null;

export interface ClientOptions {
  apiKey?: string | null;
  apiUrl?: string | null;
  timeoutMs?: number;
  maxRetries?: number;
  backoffFactor?: number;
}

/**
 * Get or create the Firecrawl client instance
 */
export function getClient(options?: ClientOptions): FirecrawlApp {
  if (options) {
    const clientOptions = {
      apiKey: options.apiKey ?? undefined,
      apiUrl: options.apiUrl ?? undefined,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      backoffFactor: options.backoffFactor,
    };
    return new FirecrawlApp(clientOptions);
  }

  if (!clientInstance) {
    clientInstance = new FirecrawlApp({});
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetClient(): void {
  clientInstance = null;
}
