// ══════════════════════════════════════════════════════════
// TENDERSHIELD — RESILIENT API CLIENT
// Handles: Retries, timeouts, graceful degradation
// Failover: AI engine → deterministic, Fabric → Supabase
// ══════════════════════════════════════════════════════════

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface ApiError {
  status: number;
  message: string;
  fallbackUsed?: boolean;
  retried?: number;
}

/**
 * Resilient fetch wrapper with retry, timeout, and graceful degradation
 */
export async function resilientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 15000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) return response;

      // Don't retry on client errors (400-499) except 429 (rate limited)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new ApiResponseError(response.status, await response.text());
      }

      // Retry on server errors and rate limits
      lastError = new ApiResponseError(response.status, `Server error: ${response.status}`);
    } catch (err) {
      if (err instanceof ApiResponseError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    // Wait before retry (exponential backoff)
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

class ApiResponseError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
  }
}

/**
 * Safe JSON fetch — returns null instead of throwing on failure
 */
export async function safeFetchJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const response = await resilientFetch(url, options);
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    const error: ApiError = {
      status: err instanceof ApiResponseError ? err.status : 0,
      message: err instanceof Error ? err.message : 'Unknown error',
      fallbackUsed: false,
      retried: options.retries || 2,
    };
    console.warn(`[TenderShield API] ${url} failed:`, error.message);
    return { data: null, error };
  }
}

/**
 * Determine if we should use fallback/demo data
 */
export function shouldUseFallback(error: ApiError | null): boolean {
  if (!error) return false;
  // Use fallback on: network errors, server errors, timeouts
  return error.status === 0 || error.status >= 500 || error.message.includes('abort');
}

/**
 * Format error for user display
 */
export function formatUserError(error: ApiError): string {
  if (error.status === 0) return 'Unable to connect to server. Please check your internet connection.';
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 403) return 'You don\'t have permission to perform this action.';
  if (error.status === 404) return 'The requested resource was not found.';
  if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (error.status >= 500) return 'Server is temporarily unavailable. Using cached data.';
  return error.message || 'An unexpected error occurred.';
}
