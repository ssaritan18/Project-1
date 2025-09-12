export function getStoredToken(): string | null {
  const TOKEN_KEY = "adhders_token_v1";
  
  // Try localStorage first
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log("🔑 Token fetched from localStorage:", token.substring(0, 20) + "...");
      return token;
    }
  } catch (err) {
    console.warn("⚠️ localStorage access failed:", err);
  }
  
  // Try sessionStorage fallback
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log("🔑 Token fetched from sessionStorage:", token.substring(0, 20) + "...");
      return token;
    }
  } catch (err) {
    console.warn("⚠️ sessionStorage access failed:", err);
  }
  
  // Try cookie fallback
  try {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith(`${TOKEN_KEY}=`));
    if (tokenCookie) {
      const token = tokenCookie.split('=')[1];
      console.log("🔑 Token fetched from cookie:", token.substring(0, 20) + "...");
      return token;
    }
  } catch (err) {
    console.warn("⚠️ cookie access failed:", err);
  }
  
  console.warn("⚠️ No token found in any storage method");
  return null;
}

export function hasValidToken(): boolean {
  const token = getStoredToken();
  return !!token;
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem("adhders_token_v1");
    console.log("🗑️ Token cleared from localStorage");
  } catch (err) {
    console.error("❌ Error clearing token:", err);
  }
}