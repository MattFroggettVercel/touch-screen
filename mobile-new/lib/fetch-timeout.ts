/**
 * Helper to create an AbortSignal with a timeout.
 * Polyfill for AbortSignal.timeout() which isn't available in React Native.
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
