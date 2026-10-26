import React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, SESSION_EXPIRED_EVENT } from "../lib/api";
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api("/api/v1/auth/me/");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [refresh]);
  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const me = await api("/api/v1/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setUser(me);
      return me;
    } catch (e) {
      setError("Invalid username or password.");
      throw e;
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      await api("/api/v1/auth/logout/", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);
  const value = useMemo(() => ({ user, loading, error, login, logout, refresh }), [user, loading, error, login, logout, refresh]);
  return /* @__PURE__ */ React.createElement(AuthContext.Provider, { value }, children);
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
export {
  AuthProvider,
  useAuth
};
