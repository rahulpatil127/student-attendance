import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { Card } from "../../components/ui";
import { Stat } from "../../components/charts";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
function TeacherDashboard() {
  const [rooms, setRooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const [c, a] = await Promise.all([
          api("/api/v1/teacher/classes/"),
          api("/api/v1/teacher/assignments/")
        ]);
        setRooms(c);
        setAssignments(a);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return /* @__PURE__ */ React.createElement(AppShell, { title: "My classes", crumbs: ["Home", "Teacher"] }, error ? /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: () => window.location.reload() }) : loading ? /* @__PURE__ */ React.createElement(Loading, null) : rooms.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No assigned classes", hint: "Ask an administrator to assign you to a class/subject." }) : /* @__PURE__ */ React.createElement("div", { className: "rise grid gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Stat, { label: "Assigned classes", value: `${rooms.length}`, accent: "linear-gradient(120deg,#4f46e5,#7c3aed)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Class-subjects", value: `${assignments.length}`, hint: "Each needs its own daily session", accent: "linear-gradient(120deg,#10b981,#14b8a6)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Today", value: (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, { month: "short", day: "numeric" }), hint: "Open a class to mark today", accent: "linear-gradient(120deg,#f59e0b,#f97316)" })), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, rooms.map((c) => {
    const subs = assignments.filter((a) => a.classroom === c.id);
    return /* @__PURE__ */ React.createElement(Card, { key: c.id, title: `${c.name}-${c.section}`, subtitle: `${subs.length} subject(s)`, actions: /* @__PURE__ */ React.createElement(Link, { to: `/teacher/classes/${c.id}`, className: "btn-brand rounded-lg px-4 py-2 text-sm font-semibold text-white" }, "Mark attendance") }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, subs.map((s) => s.subject_display ?? `Subject ${s.subject}`).join(", ") || "Subjects loading\u2026"));
  }))));
}
export {
  TeacherDashboard
};
