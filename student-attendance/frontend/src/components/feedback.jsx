import React from "react";
import { Button } from "./ui";
function Loading({ label = "Loading\u2026" }) {
  return /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "flex items-center gap-3 p-6" }, /* @__PURE__ */ React.createElement("span", { className: "skeleton inline-block h-5 w-5 rounded-full", "aria-hidden": true }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600" }, label));
}
function Skeleton({ className = "h-4 w-full" }) {
  return /* @__PURE__ */ React.createElement("div", { className: `skeleton rounded ${className}`, "aria-hidden": true });
}
function EmptyState({ title, hint, action }) {
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-slate-900" }, title), hint && /* @__PURE__ */ React.createElement("p", { className: "max-w-sm text-sm text-slate-500" }, hint), action);
}
function ErrorState({ message, onRetry }) {
  return /* @__PURE__ */ React.createElement("div", { role: "alert", className: "flex flex-col items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-red-800" }, "Something went wrong"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-700" }, message), onRetry && /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: onRetry }, "Retry"));
}
export {
  EmptyState,
  ErrorState,
  Loading,
  Skeleton
};
