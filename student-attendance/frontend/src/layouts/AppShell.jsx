import React from "react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdminUser } from "../types";
import { Button } from "../components/ui";
import { Icons } from "../components/icons";
function linksFor(admin, role) {
  if (admin)
    return [
      { to: "/", label: "Dashboard", icon: Icons.grid },
      { to: "/admin/users", label: "Users", icon: Icons.users },
      { to: "/admin/academics", label: "Academics", icon: Icons.book },
      { to: "/admin/teachers", label: "Teachers", icon: Icons.users },
      { to: "/admin/assignments", label: "Enrollments", icon: Icons.link },
      { to: "/admin/complaints", label: "Complaints", icon: Icons.chat },
      { to: "/reports", label: "Reports", icon: Icons.chart },
      { to: "/profile", label: "Profile", icon: Icons.user }
    ];
  if (role === "TEACHER")
    return [
      { to: "/", label: "My classes", icon: Icons.grid },
      { to: "/reports", label: "Reports", icon: Icons.chart },
      { to: "/profile", label: "Profile", icon: Icons.user }
    ];
  return [
    { to: "/", label: "My attendance", icon: Icons.grid },
    { to: "/complaints", label: "Complaints", icon: Icons.chat },
    { to: "/profile", label: "Profile", icon: Icons.user }
  ];
}
function AppShell({ title, crumbs, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = linksFor(isAdminUser(user), user?.role);
  const onLogout = async () => {
    await logout();
    navigate("/sign-in", { replace: true });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen lg:flex" }, /* @__PURE__ */ React.createElement("a", { href: "#main", className: "sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-white focus:p-2" }, "Skip to content"), /* @__PURE__ */ React.createElement("aside", { className: "sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-950 p-4 text-slate-300 lg:flex", "aria-label": "Sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5 px-2 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "btn-brand flex h-9 w-9 items-center justify-center rounded-xl font-display text-lg font-bold text-white", "aria-hidden": true }, "\u2713"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-[15px] font-bold leading-tight text-white" }, "Attendly"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "School attendance"))), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Primary", className: "mt-4 flex flex-col gap-1" }, links.map((l) => /* @__PURE__ */ React.createElement(
    NavLink,
    {
      key: l.to + l.label,
      to: l.to,
      className: ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`
    },
    /* @__PURE__ */ React.createElement(l.icon, { className: "h-5 w-5" }),
    l.label
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold" }, "Session active"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs text-indigo-100", "aria-label": "signed in user" }, user?.username, " \xB7 ", user?.role), /* @__PURE__ */ React.createElement("button", { onClick: onLogout, className: "mt-3 flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25" }, /* @__PURE__ */ React.createElement(Icons.logout, { className: "h-4 w-4" }), " Log out"))), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("header", { className: "sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur lg:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "btn-brand flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white", "aria-hidden": true }, "\u2713"), /* @__PURE__ */ React.createElement("span", { className: "font-display font-bold" }, "Attendly"), /* @__PURE__ */ React.createElement("button", { className: "ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm", onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-label": "Toggle navigation" }, "\u2630")), open && /* @__PURE__ */ React.createElement("nav", { "aria-label": "Mobile", className: "border-t border-slate-200 px-4 py-2" }, links.map((l) => /* @__PURE__ */ React.createElement(NavLink, { key: l.to + l.label, to: l.to, onClick: () => setOpen(false), className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" }, /* @__PURE__ */ React.createElement(l.icon, { className: "h-5 w-5" }), " ", l.label)), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: onLogout }, "Log out (", user?.username, ")"))), /* @__PURE__ */ React.createElement("main", { id: "main", className: "mx-auto max-w-6xl px-4 py-6 lg:px-8" }, crumbs && /* @__PURE__ */ React.createElement("nav", { "aria-label": "Breadcrumb", className: "mb-1.5 text-[13px] text-slate-500" }, crumbs.join("  /  ")), /* @__PURE__ */ React.createElement("h1", { className: "font-display mb-5 text-2xl font-bold tracking-tight text-slate-900" }, title), children)));
}
function AuthLayout({ children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md" }, /* @__PURE__ */ React.createElement("div", { className: "mb-5 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "btn-brand inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold text-white", "aria-hidden": true }, "\u2713"), /* @__PURE__ */ React.createElement("p", { className: "font-display mt-3 text-xl font-bold text-white" }, "Attendly"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-400" }, "Session-based sign in")), children));
}
export {
  AppShell,
  AuthLayout
};
