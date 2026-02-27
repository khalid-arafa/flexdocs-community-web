import { API_URL } from '@/constants';
import Cookies from 'js-cookie';

function getCookieOptions() {
  const isSecure = typeof window !== "undefined"
    ? window.location.protocol === "https:"
    : process.env.NODE_ENV === "production";
  return {
    expires: 7,
    sameSite: "Lax",
    secure: isSecure,
  };
}

export const login = async (email, password) => {
  try {
    const result = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (result.ok) {
      const body = await result.json();
      Cookies.set("user", JSON.stringify(body), getCookieOptions());
      return {
        ok: true,
        body: body,
      };
    }
    return result
  } catch (error) {
    return { ok: false }
  }
}

export const register = async (name, email, password) => {
  const result = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (result.ok) {
    const body = await result.json();
    Cookies.set("user", JSON.stringify(body), getCookieOptions());
    return {
      ok: true,
      body: body,
    };
  }
  return result
}

export const logout = () => {
  Cookies.remove("user", { sameSite: "Lax" });
}

export const logoutAndRedirect = (path = "/login") => {
  logout();
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.location.replace(path);
  }
}
