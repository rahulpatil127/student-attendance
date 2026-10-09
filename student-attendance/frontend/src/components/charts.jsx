import React from "react";
function Donut({ percentage, size = 140, label }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percentage));
  const tone = pct < 75 ? "#ef4444" : pct < 90 ? "#f59e0b" : "#10b981";
  return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4", role: "img", "aria-label": `${label ?? "Attendance"} ${pct}%` }, /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 140 140" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "donut-g", x1: "0", y1: "0", x2: "1", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#6366f1" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#8b5cf6" }))), /* @__PURE__ */ React.createElement("circle", { cx: "70", cy: "70", r, fill: "none", stroke: "#e2e8f0", strokeWidth: "16" }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: "70",
      cy: "70",
      r,
      fill: "none",
      stroke: pct >= 75 ? "url(#donut-g)" : tone,
      strokeWidth: "16",
      strokeLinecap: "round",
      strokeDasharray: `${pct / 100 * c} ${c}`,
      transform: "rotate(-90 70 70)"
    }
  ), /* @__PURE__ */ React.createElement("text", { x: "70", y: "66", textAnchor: "middle", fontSize: "26", fontWeight: "700", fill: "#0f172a", fontFamily: "Sora, Inter, sans-serif" }, pct, "%"), /* @__PURE__ */ React.createElement("text", { x: "70", y: "86", textAnchor: "middle", fontSize: "11", fill: "#64748b" }, label ?? "present")));
}
function StatusBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2.5", role: "img", "aria-label": "Status breakdown" }, data.map((d) => /* @__PURE__ */ React.createElement("div", { key: d.label }, /* @__PURE__ */ React.createElement("div", { className: "mb-1 flex justify-between text-xs font-medium text-slate-600" }, /* @__PURE__ */ React.createElement("span", null, d.label), /* @__PURE__ */ React.createElement("span", null, d.value)), /* @__PURE__ */ React.createElement("div", { className: "h-2.5 overflow-hidden rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full transition-all", style: { width: `${d.value / max * 100}%`, background: d.color } })))));
}
function Trend({ points, height = 120 }) {
  const w = 560;
  const h = height;
  const pad = 8;
  if (points.length === 0) return /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, "No trend data.");
  const step = points.length === 1 ? 0 : (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => ({
    px: pad + i * step,
    py: h - pad - Math.max(0, Math.min(100, p.y)) / 100 * (h - pad * 2),
    label: p.x,
    value: p.y
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.px},${c.py}`).join(" ");
  return /* @__PURE__ */ React.createElement("div", { role: "img", "aria-label": `Trend: ${points.map((p) => `${p.x} ${p.y}%`).join(", ")}` }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${w} ${h}`, className: "w-full", style: { height } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "trend-fill", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#6366f1", stopOpacity: "0.35" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#6366f1", stopOpacity: "0" }))), [25, 50, 75].map((g) => /* @__PURE__ */ React.createElement("line", { key: g, x1: pad, x2: w - pad, y1: h - pad - g / 100 * (h - pad * 2), y2: h - pad - g / 100 * (h - pad * 2), stroke: "#e2e8f0", strokeDasharray: "4 4" })), /* @__PURE__ */ React.createElement("path", { d: `${line} L${w - pad},${h - pad} L${pad},${h - pad} Z`, fill: "url(#trend-fill)" }), /* @__PURE__ */ React.createElement("path", { d: line, fill: "none", stroke: "#4f46e5", strokeWidth: "2.5", strokeLinecap: "round" }), coords.map((c, i) => /* @__PURE__ */ React.createElement("circle", { key: i, cx: c.px, cy: c.py, r: "3.5", fill: "#fff", stroke: "#4f46e5", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("title", null, `${c.label}: ${c.value}%`)))), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex justify-between text-[11px] text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, points[0].x), /* @__PURE__ */ React.createElement("span", null, points[points.length - 1].x)));
}
function Stat({ label, value, hint, accent }) {
  return /* @__PURE__ */ React.createElement("div", { className: "card group p-5 transition-shadow hover:shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, accent && /* @__PURE__ */ React.createElement("span", { className: "inline-block h-9 w-1.5 rounded-full", style: { background: accent }, "aria-hidden": true }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold text-slate-900" }, value), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-slate-500" }, label))), hint && /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs text-slate-500" }, hint));
}
export {
  Donut,
  Stat,
  StatusBars,
  Trend
};
