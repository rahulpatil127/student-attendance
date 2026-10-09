import React from "react";
import { useEffect, useRef } from "react";
import { Button } from "./ui";
function Dialog({ title, open, onClose, children, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector("button, input, select, [tabindex]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", "aria-label": title }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-900/40", onClick: onClose, "aria-hidden": true }), /* @__PURE__ */ React.createElement("div", { ref, className: "card relative w-full max-w-lg p-5" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold" }, title), /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-sm text-slate-700" }, children), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex justify-end gap-2" }, actions ?? /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: onClose }, "Close"))));
}
export {
  Dialog
};
