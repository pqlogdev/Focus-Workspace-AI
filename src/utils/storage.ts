/**
 * Safe localStorage wrapper with QuotaExceededError handling and fallbacks
 */

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to save key "${key}" to localStorage:`, error);

    // Try clearing old non-critical caches to free space
    try {
      // Free old logs if too many
      const logsRaw = localStorage.getItem('airiser_logs');
      if (logsRaw) {
        try {
          const logs = JSON.parse(logsRaw);
          if (Array.isArray(logs) && logs.length > 20) {
            localStorage.setItem('airiser_logs', JSON.stringify(logs.slice(0, 10)));
          }
        } catch {}
      }

      // Retry set
      localStorage.setItem(key, value);
      return true;
    } catch {
      // If still fails, fail gracefully without throwing to prevent React app crash
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string, fallback: string = ''): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, error);
    return fallback;
  }
}

export function safeLocalStorageJSONGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] Failed to parse key "${key}" JSON from localStorage:`, error);
    return fallback;
  }
}
