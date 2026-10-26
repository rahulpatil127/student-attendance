import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Badge, Card, Field } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { Donut, Stat, StatusBars, Trend } from "../../components/charts";
import { unwrap } from "../../types";
const LOW_ATTENDANCE_HINT = 75;
function StudentDashboard() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, hist] = await Promise.all([
        api("/api/v1/reports/attendance/summary/"),
        api(`/api/v1/students/me/attendance/${status ? `?status=${status}` : ""}`)
      ]);
      setSummary(sum.results[0] ?? null);
      setHistory(unwrap(hist));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const bySubject = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const r of history) {
      const name = r.subject_name ?? `Session ${r.session}`;
      const e = m.get(name) ?? { total: 0, attended: 0 };
      e.total += 1;
      if (r.status === "PRESENT" || r.status === "LATE") e.attended += 1;
      m.set(name, e);
    }
    return [...m.entries()].map(([label, v]) => ({
      label,
      value: v.total,
      pct: v.total ? Math.round(v.attended / v.total * 100) : 0
    }));
  }, [history]);
  const trend = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const r of history) {
      const d = r.session_date ?? "";
      if (!d) continue;
      const e = m.get(d) ?? { total: 0, attended: 0 };
      e.total += 1;
      if (r.status === "PRESENT" || r.status === "LATE") e.attended += 1;
      m.set(d, e);
    }
    return [...m.entries()].sort(([a], [b]) => a < b ? -1 : 1).slice(-10).map(([x, v]) => ({ x: x.slice(5), y: v.total ? Math.round(v.attended / v.total * 100) : 0 }));
  }, [history]);
  const pct = summary?.percentage ?? 0;
  return /* @__PURE__ */ React.createElement(AppShell, { title: "My attendance", crumbs: ["Home", "Student"] }, error ? /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: load }) : loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "rise grid gap-4" }, summary && pct < LOW_ATTENDANCE_HINT && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" }, "Heads up: your attendance is ", pct, "% \u2014 below the ", LOW_ATTENDANCE_HINT, "% institutional guide. Talk to your teacher if sessions are missing."), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Stat, { label: "Overall attendance", value: `${pct}%`, hint: "Submitted sessions \xB7 LATE counts as attended", accent: "linear-gradient(120deg,#4f46e5,#7c3aed)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Present / Late", value: `${(summary?.present ?? 0) + (summary?.late ?? 0)}`, hint: `Absent ${summary?.absent ?? 0} \xB7 Excused ${summary?.excused ?? 0}`, accent: "linear-gradient(120deg,#10b981,#14b8a6)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Sessions counted", value: `${summary?.total ?? 0}`, hint: "Excused excluded from percentage", accent: "linear-gradient(120deg,#f59e0b,#f97316)" })), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: "Balance", subtitle: "Where your time went." }, summary ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-6" }, /* @__PURE__ */ React.createElement(Donut, { percentage: pct, label: "present" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-48 flex-1" }, /* @__PURE__ */ React.createElement(StatusBars, { data: [
    { label: "Present", value: summary.present, color: "#10b981" },
    { label: "Late", value: summary.late, color: "#f59e0b" },
    { label: "Absent", value: summary.absent, color: "#ef4444" },
    { label: "Excused", value: summary.excused, color: "#6366f1" }
  ] }))) : /* @__PURE__ */ React.createElement(EmptyState, { title: "No attendance yet", hint: "Records appear after your teacher submits." })), /* @__PURE__ */ React.createElement(Card, { title: "Trend", subtitle: "Present % per day (last 10 days with records)." }, /* @__PURE__ */ React.createElement(Trend, { points: trend }))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: "By subject", subtitle: "Present + Late over total per subject." }, bySubject.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No records" }) : /* @__PURE__ */ React.createElement(StatusBars, { data: bySubject.map((s) => ({ label: `${s.label} \xB7 ${s.pct}%`, value: s.value, color: s.pct < 75 ? "#ef4444" : "#6366f1" })) })), /* @__PURE__ */ React.createElement(Card, { title: `History (${history.length})` }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Status filter" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Status filter", className: "rounded-lg border px-3 py-2 text-sm", value: status, onChange: (e) => setStatus(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All"), /* @__PURE__ */ React.createElement("option", { value: "PRESENT" }, "PRESENT"), /* @__PURE__ */ React.createElement("option", { value: "ABSENT" }, "ABSENT"), /* @__PURE__ */ React.createElement("option", { value: "LATE" }, "LATE"), /* @__PURE__ */ React.createElement("option", { value: "EXCUSED" }, "EXCUSED")))), history.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No records", hint: "Try a different filter." }) : /* @__PURE__ */ React.createElement(Table, { caption: "My attendance", headers: ["Date \xB7 Subject", "Status"] }, history.slice(0, 30).map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, r.session_date ?? `Session ${r.session}`, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, r.subject_name ?? "", " \xB7 ", r.classroom_name ?? "")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: r.status === "PRESENT" ? "green" : r.status === "ABSENT" ? "red" : "amber" }, r.status)))))))));
}
export {
  StudentDashboard
};
