export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem("adhders_token_v1");
    if (!token) {
      console.warn("⚠️ No token found in localStorage");
      return null;
    }
    console.log("🔑 Token fetched from localStorage:", token.substring(0, 20) + "...");
    return token;
  } catch (err) {
    console.error("❌ Error reading token:", err);
    return null;
  }
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