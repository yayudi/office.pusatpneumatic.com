// api/auth.js
import api from "./axios";

export async function logout() {
  try {
    await api.post("/auth/logout");  // ✅ samain dengan mock
    return true;
  } catch {
    return false;
  }
}
