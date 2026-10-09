import React from "react";
const baseBtn = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px]";
const variants = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100"
};
function Button({ variant = "primary", loading, children, ...rest }) {
  return /* @__PURE__ */ React.createElement("button", { className: `${baseBtn} ${variants[variant]}`, disabled: loading ?? rest.disabled, ...rest }, loading ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": true }, "\u2026") : null, children);
}
function Field({ label, error, hint, children }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1.5" }, /* @__PURE__ */ React.createElement("label", { htmlFor: id, className: "text-sm font-medium text-slate-700" }, label), children, error ? /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-red-600" }, error) : hint ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, hint) : null);
}
function Input(props) {
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      ...props,
      className: `rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-primary-500 ${props.className ?? ""}`
    }
  );
}
function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-primary-100 text-primary-800"
  };
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}` }, children);
}
function Card({ title, subtitle, actions, children }) {
  return /* @__PURE__ */ React.createElement("section", { className: "card p-5", "aria-label": title ?? "card" }, (title || actions) && /* @__PURE__ */ React.createElement("header", { className: "mb-3 flex flex-wrap items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, title && /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold text-slate-900" }, title), subtitle && /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-sm text-slate-500" }, subtitle)), actions), children);
}
export {
  Badge,
  Button,
  Card,
  Field,
  Input
};
