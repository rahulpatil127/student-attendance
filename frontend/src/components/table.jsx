import React from "react";
function Table({ caption, headers, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto rounded-xl border border-slate-200" }, /* @__PURE__ */ React.createElement("table", { className: "min-w-full divide-y divide-slate-200 bg-white text-sm" }, /* @__PURE__ */ React.createElement("caption", { className: "sr-only" }, caption), /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50" }, /* @__PURE__ */ React.createElement("tr", null, headers.map((h) => /* @__PURE__ */ React.createElement("th", { key: h, scope: "col", className: "px-4 py-2.5 text-left font-medium text-slate-600" }, h)))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, children)));
}
export {
  Table
};
