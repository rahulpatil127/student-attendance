import React from "react";
function base(className, path) {
  return /* @__PURE__ */ React.createElement("svg", { className: className ?? "h-5 w-5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true }, path);
}
const Icons = {
  grid: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" }))),
  users: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "8", r: "3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" }), /* @__PURE__ */ React.createElement("circle", { cx: "17", cy: "9", r: "2.5" }), /* @__PURE__ */ React.createElement("path", { d: "M16 14.6c2.6.2 4.7 2 5.5 4.9" }))),
  book: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" }), /* @__PURE__ */ React.createElement("path", { d: "M4 20.5V5.5" }), /* @__PURE__ */ React.createElement("path", { d: "M20 18v3H6.5" }))),
  link: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" }), /* @__PURE__ */ React.createElement("path", { d: "M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" }))),
  chart: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M4 20V10" }), /* @__PURE__ */ React.createElement("path", { d: "M10 20V4" }), /* @__PURE__ */ React.createElement("path", { d: "M16 20v-7" }), /* @__PURE__ */ React.createElement("path", { d: "M22 20H2" }))),
  user: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "8", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M4 21c1-4.5 4-7 8-7s7 2.5 8 7" }))),
  logout: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), /* @__PURE__ */ React.createElement("path", { d: "M16 17l5-5-5-5" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12H9" }))),
  check: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M20 6L9 17l-5-5" }))),
  calendar: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M8 3v4M16 3v4M3 10h18" }))),
  spark: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" }))),
  chat: (p) => base(p.className, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" })))
};
export {
  Icons
};
