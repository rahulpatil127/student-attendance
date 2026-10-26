import React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import { SESSION_EXPIRED_EVENT } from "../lib/api";
import { Router } from "./router";
function App() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    const onExpired = (e) => {
      const detail = e.detail;
      if (detail.status === 401) setNotice("Session expired. Please sign in again.");
      else setNotice(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);
  return /* @__PURE__ */ React.createElement(BrowserRouter, null, /* @__PURE__ */ React.createElement(AuthProvider, null, notice && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "bg-amber-100 px-4 py-2 text-center text-sm text-amber-900" }, notice), /* @__PURE__ */ React.createElement(Router, null)));
}
export {
  App
};
