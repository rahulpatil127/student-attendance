import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { Card } from "../../components/ui";
import { Stat } from "../../components/charts";
import { ErrorState, Loading } from "../../components/feedback";
async function count(path) {
  const d = await api(path);
  return d.count;
}
const TILES = [
  { to: "/admin/users", title: "Users", desc: "Teachers, students, roles, activation.", tint: "from-indigo-500 to-violet-500" },
  { to: "/admin/academics", title: "Academics", desc: "Years, classes, sections, subjects.", tint: "from-emerald-500 to-teal-500" },
  { to: "/admin/assignments", title: "Assignments", desc: "Teacher allocation and enrollment.", tint: "from-amber-500 to-orange-500" },
  { to: "/reports", title: "Reports", desc: "Analytics and formula-safe CSV export.", tint: "from-sky-500 to-cyan-500" }
];
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const [users, years, rooms, subjects] = await Promise.all([
          count("/api/v1/admin/users/"),
          count("/api/v1/academic-years/"),
          count("/api/v1/classrooms/"),
          count("/api/v1/subjects/")
        ]);
        setStats({ users, years, rooms, subjects });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      }
    })();
  }, []);
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Admin dashboard", crumbs: ["Home", "Admin"] }, error ? /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: () => window.location.reload() }) : !stats ? /* @__PURE__ */ React.createElement(Loading, { label: "Loading overview\u2026" }) : /* @__PURE__ */ React.createElement("div", { className: "rise grid gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-4" }, /* @__PURE__ */ React.createElement(Stat, { label: "Accounts", value: `${stats.users}`, accent: "linear-gradient(120deg,#4f46e5,#7c3aed)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Academic years", value: `${stats.years}`, accent: "linear-gradient(120deg,#10b981,#14b8a6)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Classes", value: `${stats.rooms}`, accent: "linear-gradient(120deg,#f59e0b,#f97316)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Subjects", value: `${stats.subjects}`, accent: "linear-gradient(120deg,#0ea5e9,#22d3ee)" })), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, TILES.map((t) => /* @__PURE__ */ React.createElement(Link, { key: t.to, to: t.to, className: "card group flex items-center gap-4 p-5 transition-shadow hover:shadow-lift" }, /* @__PURE__ */ React.createElement("span", { className: `flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white ${t.tint}`, "aria-hidden": true }, "\u2192"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "block font-display font-bold text-slate-900 group-hover:text-primary-700" }, t.title), /* @__PURE__ */ React.createElement("span", { className: "block text-sm text-slate-500" }, t.desc))))), /* @__PURE__ */ React.createElement(Card, { title: "Seeded demo data", subtitle: "Local testing accounts (change passwords after evaluation)." }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, "Run ", /* @__PURE__ */ React.createElement("code", { className: "rounded bg-slate-100 px-1.5 py-0.5 text-xs" }, "python manage.py seed_demo"), " to create 2 teachers, 5 students, classes, subjects, 8 submitted sessions and 1 draft."))));
}
export {
  AdminDashboard
};
