import React from "react";
import { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { Badge, Card } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState("checking\u2026");
  const [error, setError] = useState(null);
  useEffect(() => {
    api("/api/v1/health/").then((h) => setHealth(h.status)).catch((e) => setError(e instanceof Error ? e.message : "API unreachable"));
  }, []);
  return /* @__PURE__ */ React.createElement(AppShell, { title: user?.role === "STUDENT" ? "My attendance" : user?.role === "TEACHER" ? "My classes" : "Dashboard", crumbs: ["Home"] }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: `Welcome, ${user?.username}`, subtitle: "Session is active. Backend remains authoritative for permissions." }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: "blue" }, user?.role), /* @__PURE__ */ React.createElement(Badge, { tone: health === "ok" ? "green" : "amber" }, "API: ", health))), /* @__PURE__ */ React.createElement(Card, { title: "Next steps (Phase 5)", subtitle: "Role experiences wire to real API here." }, error ? /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: () => window.location.reload() }) : health === "ok" ? /* @__PURE__ */ React.createElement(EmptyState, { title: "Connected", hint: "Admin, teacher, and student journeys land here in Phase 5." }) : /* @__PURE__ */ React.createElement(Loading, { label: "Checking API\u2026" }))));
}
function Forbidden() {
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Access denied" }, /* @__PURE__ */ React.createElement(ErrorState, { message: "You do not have permission to view this page." }));
}
function NotFound() {
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Not found" }, /* @__PURE__ */ React.createElement(EmptyState, { title: "Page not found", hint: "Check the URL or return to the dashboard." }));
}
export {
  Dashboard,
  Forbidden,
  NotFound
};
