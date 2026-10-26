import React, { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Button, Card, Field, Input } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { Donut, Stat, StatusBars, Trend } from "../../components/charts";
import { useAuth } from "../../hooks/useAuth";
import { isAdminUser } from "../../types";
import { unwrap } from "../../types";
function paramsOf(classroom, subject, dateFrom, dateTo, split) {
  const q = new URLSearchParams();
  if (classroom) q.set("classroom", classroom);
  if (subject) q.set("subject", subject);
  if (dateFrom) q.set("date_from", dateFrom);
  if (dateTo) q.set("date_to", dateTo);
  if (subject && split) q.set("by_subject", "1");
  return q.toString();
}
function ReportsPage() {
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [rows, setRows] = useState([]);
  const [daily, setDaily] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        if (user?.role === "TEACHER" && !admin) {
          const [c, a] = await Promise.all([
            api("/api/v1/teacher/classes/"),
            api("/api/v1/teacher/assignments/")
          ]);
          setRooms(c);
          const seen = /* @__PURE__ */ new Map();
          a.forEach((x) => {
            if (!seen.has(x.subject)) {
              seen.set(x.subject, String(x.subject_display ?? `Subject ${x.subject}`).split(" [")[0]);
            }
          });
          setSubjects([...seen.entries()].map(([id, name]) => ({ id, name })));
        } else if (admin) {
          const [c, s] = await Promise.all([
            api("/api/v1/classrooms/?page_size=200"),
            api("/api/v1/subjects/?page_size=200")
          ]);
          setRooms(unwrap(c));
          setSubjects(unwrap(s));
        }
      } catch {
        // options best-effort; table still loads unfiltered
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const load = async (c, s, df, dt) => {
    setLoading(true);
    setError(null);
    try {
      const q = paramsOf(c, s, df, dt, true);
      const [sum, sess] = await Promise.all([
        api(`/api/v1/reports/attendance/summary/?${q}`),
        user?.role === "STUDENT" && !admin ? Promise.resolve([]) : api(`/api/v1/attendance/sessions/?${q}${q ? "&" : ""}page_size=200`)
      ]);
      setRows(sum.results);
      setSessions(unwrap(sess));
      if (c) {
        const dq = new URLSearchParams({ classroom: c });
        if (df) dq.set("date_from", df);
        if (dt) dq.set("date_to", dt);
        try {
          const day = await api(`/api/v1/reports/attendance/daily-summary/?${dq.toString()}`);
          setDaily(day.results);
        } catch {
          setDaily([]);
        }
      } else {
        setDaily([]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(classroom, subject, dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroom, subject, dateFrom, dateTo]);
  const totals = (() => {
    const t = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    rows.forEach((r) => {
      t.present += r.present;
      t.absent += r.absent;
      t.late += r.late;
      t.excused += r.excused;
      t.total += r.total;
    });
    const denom = t.total - t.excused;
    const pct = denom > 0 ? Math.round((t.present + t.late) / denom * 100) : 0;
    return { ...t, pct };
  })();
  const trend = (() => {
    const m = /* @__PURE__ */ new Map();
    sessions.forEach((s) => {
      const counts = s.counts ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, TOTAL: 0 };
      const total = counts.TOTAL ?? s.records.length;
      const attended = (counts.PRESENT ?? 0) + (counts.LATE ?? 0);
      const e = m.get(s.date) ?? { total: 0, attended: 0 };
      e.total += total;
      e.attended += attended;
      m.set(s.date, e);
    });
    return [...m.entries()].sort(([a], [b]) => a < b ? -1 : 1).slice(-12).map(([x, v]) => ({ x: x.slice(5), y: v.total ? Math.round(v.attended / v.total * 100) : 0 }));
  })();
  const scopeLabel = () => {
    const room = rooms.find((c) => String(c.id) === String(classroom));
    const subj = subjects.find((s) => String(s.id) === String(subject));
    const parts = [room ? `${room.name}-${room.section}` : "All classes", subj ? subj.name : "All subjects"];
    if (dateFrom || dateTo) parts.push(`${dateFrom || "\u2026"} \u2192 ${dateTo || "\u2026 "}`.trim());
    return parts.join(" \xB7 ");
  };
  const download = async () => {
    const q = paramsOf(classroom, subject, dateFrom, dateTo, true);
    const res = await fetch(`/api/v1/reports/attendance/export.csv?${q}`, { credentials: "include" });
    if (!res.ok) {
      setError(`Export failed (${res.status}).`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadDays = async () => {
    if (!classroom) return;
    const dq = new URLSearchParams({ classroom });
    if (dateFrom) dq.set("date_from", dateFrom);
    if (dateTo) dq.set("date_to", dateTo);
    const res = await fetch(`/api/v1/reports/attendance/daily-export.csv?${dq.toString()}`, { credentials: "include" });
    if (!res.ok) {
      setError(`Days export failed (${res.status}).`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily_attendance_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const sel = "rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white";
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Reports & analytics", crumbs: ["Home", "Reports"] }, /* @__PURE__ */ React.createElement(Card, { title: "What to look at", subtitle: "Pick a class or subject \u2014 everything below updates instantly. No dates: current members only. With dates: full history." }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 md:grid-cols-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Class" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Class", className: sel, value: classroom, onChange: (e) => setClassroom(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "Subject" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Subject", className: sel, value: subject, onChange: (e) => setSubject(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All"), subjects.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.name)))), /* @__PURE__ */ React.createElement(Field, { label: "From" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: dateFrom, onChange: (e) => setDateFrom(e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "To" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: dateTo, onChange: (e) => setDateTo(e.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: download }, "Export CSV"), (classroom || subject || dateFrom || dateTo) && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setClassroom("");
        setSubject("");
        setDateFrom("");
        setDateTo("");
      },
      className: "rounded-lg px-3 py-2 text-sm font-medium text-primary-700 underline"
    },
    "Reset filters"
  ), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-xs text-slate-500", role: "status" }, !loading && `Showing: ${scopeLabel()} (${rows.length})`))), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, error ? /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: () => load(classroom, subject, dateFrom, dateTo) }) : loading ? /* @__PURE__ */ React.createElement(Loading, null) : rows.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No data", hint: "Try a different class, subject, or date range." }) : /* @__PURE__ */ React.createElement("div", { className: "rise grid gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Stat, { label: "Overall present", value: `${totals.pct}%`, hint: `${totals.present + totals.late} attended of ${totals.total - totals.excused} counted`, accent: "linear-gradient(120deg,#4f46e5,#7c3aed)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Records", value: `${totals.total}`, hint: `Absent ${totals.absent} \xB7 Late ${totals.late} \xB7 Excused ${totals.excused}`, accent: "linear-gradient(120deg,#10b981,#14b8a6)" }), /* @__PURE__ */ React.createElement(Stat, { label: "Students", value: `${rows.length}`, hint: "In current filter scope", accent: "linear-gradient(120deg,#f59e0b,#f97316)" })), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: "Distribution", subtitle: "Share of all statuses in scope." }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-6" }, /* @__PURE__ */ React.createElement(Donut, { percentage: totals.pct, label: "present" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-48 flex-1" }, /* @__PURE__ */ React.createElement(StatusBars, { data: [
    { label: "Present", value: totals.present, color: "#10b981" },
    { label: "Late", value: totals.late, color: "#f59e0b" },
    { label: "Absent", value: totals.absent, color: "#ef4444" },
    { label: "Excused", value: totals.excused, color: "#6366f1" }
  ] })))), trend.length > 0 && /* @__PURE__ */ React.createElement(Card, { title: "Daily trend", subtitle: "Present % per session day." }, /* @__PURE__ */ React.createElement(Trend, { points: trend, height: 140 }))), /* @__PURE__ */ React.createElement(Card, { title: "Class-teacher days", subtitle: "Whole-day college attendance per student in the selected class.", actions: /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: downloadDays, disabled: !classroom }, "Export days CSV") }, !classroom ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, "Pick a class above to see whole-day counts.") : daily.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, "No whole-day sessions for this filter yet.") : /* @__PURE__ */ React.createElement(Table, { caption: "Daily days", headers: ["ID", "Student", "Days present", "Days total", "%"] }, daily.map((d) => /* @__PURE__ */ React.createElement("tr", { key: d.student }, React.createElement("td", { className: "px-4 py-2 font-mono text-xs" }, d.student_number || "—"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-medium" }, d.username), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, d.days_present), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, d.days_total), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full px-2 py-0.5 text-xs font-semibold inline-block " + (d.percentage < 75 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800") }, d.percentage, "%")))))), /* @__PURE__ */ React.createElement(Card, { title: `Students (${rows.length})`, actions: /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: download }, "Export this view (CSV)") }, /* @__PURE__ */ React.createElement(Table, { caption: "Summary", headers: ["ID", "Student", "Subject", "Present", "Absent", "Late", "Excused", "%"] }, rows.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.student }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs" }, r.student_number || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-medium" }, r.username), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-xs text-slate-600" }, r.subject_name || "All"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, r.present), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, r.absent), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, r.late), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, r.excused), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("span", { className: `inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.percentage < 75 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"}` }, r.percentage, "%")))))))));
}
export {
  ReportsPage
};
