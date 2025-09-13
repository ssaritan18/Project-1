import { getStoredToken } from "./tokenHelper";

// Global auth token retrieval utility
// Tries multiple sources in priority order:
// 1. In-memory token from AuthContext
// 2. localStorage
// 3. sessionStorage 
// 4. Cookie fallback

let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  inMemoryToken = token;
  console.log('🧠 In-memory token updated:', token ? 'Available' : 'Cleared');
}

export function getAuthToken(): string | null {
  console.log('🔍 getAuthToken() called - checking all sources...');
  
  // Priority 1: In-memory token (fastest, most up-to-date)
  if (inMemoryToken) {
    console.log('🧠 Using in-memory token');
    return inMemoryToken;
  }
  
  // Priority 2-4: Storage fallback (localStorage → sessionStorage → cookie)
  const storedToken = getStoredToken();
  if (storedToken) {
    console.log('💾 Using stored token, updating in-memory cache');
    setInMemoryToken(storedToken); // Cache for next time
    return storedToken;
  }
  
  console.warn('⚠️ No auth token found in any source');
  return null;
}

export function clearAuthToken(): void {
  console.log('🗑️ Clearing auth token from all sources');
  inMemoryToken = null;
  
  // Also clear storage
  try {
    localStorage.removeItem('adhders_token_v1');
    sessionStorage.removeItem('adhders_token_v1');
    document.cookie = 'adhders_token_v1=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  } catch (err) {
    console.warn('⚠️ Error clearing storage:', err);
  }
}

export function hasValidAuthToken(): boolean {
  return !!getAuthToken();
}