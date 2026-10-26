import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Badge, Button, Card, Field, Input } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { unwrap } from "../../types";
const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function DailyAttendancePage() {
  const { classroomId } = useParams();
  const cid = Number(classroomId);
  const [roster, setRoster] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api(`/api/v1/classes/${cid}/students/`);
        setRoomName(`${r.classroom.name}-${r.classroom.section}`);
        setRoster(r.students);
        const init = {};
        r.students.forEach((s) => init[s.id] = "PRESENT");
        setMarks(init);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load roster.");
      } finally {
        setLoading(false);
      }
    })();
  }, [cid]);
  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    Object.values(marks).forEach((s) => {
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [marks]);
  const loadSession = async (day) => {
    setError(null);
    setOk(null);
    try {
      const list = await api(`/api/v1/attendance/sessions/?classroom=${cid}&date=${day}`);
      const found = unwrap(list).find((s) => s.subject === null) ?? null;
      setSession(found);
      if (found) {
        const m = {};
        found.records.forEach((r) => m[r.student] = r.status);
        setMarks((prev) => ({ ...prev, ...m }));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lookup failed.");
    }
  };
  useEffect(() => {
    if (roster.length > 0) void loadSession(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const records = Object.entries(marks).map(([student, status]) => ({ student: Number(student), status }));
      const created = await api("/api/v1/attendance/sessions/", {
        method: "POST",
        body: JSON.stringify({ classroom: cid, date, records })
      });
      setSession(created);
      setOk(`Whole-day draft saved (${created.records.length} students). Submit to lock it.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed \u2014 a whole-day session may already exist for this date.");
    } finally {
      setSaving(false);
    }
  };
  const submit = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updated = await api(`/api/v1/attendance/sessions/${session.id}/submit/`, { method: "POST" });
      setSession(updated);
      setOk("Whole-day attendance submitted. This is the college day count.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Submit failed.");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement(AppShell, { title: `Whole day \u2014 ${roomName || `Class ${cid}`}`, crumbs: ["Home", "Teacher", "Whole day"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, { label: "Loading roster\u2026" }) : roster.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No students enrolled" }) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, /* @__PURE__ */ React.createElement(Card, { title: "Today's college attendance", subtitle: "One marking for the whole day, first period. Counts as days present." }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Status" }, /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: session?.status === "SUBMITTED" ? "green" : "amber" }, session ? session.status : "NEW DRAFT"))), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-slate-600" }, "Counts: ", STATUSES.map((s) => `${s} ${counts[s] ?? 0}`).join(" \xB7 ")))), /* @__PURE__ */ React.createElement(Card, { title: `Roster (${roster.length})` }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => {
    const m = {};
    roster.forEach((s) => m[s.id] = "PRESENT");
    setMarks(m);
  } }, "All present"), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => {
    const m = {};
    roster.forEach((s) => m[s.id] = "ABSENT");
    setMarks(m);
  } }, "All absent")), /* @__PURE__ */ React.createElement(Table, { caption: "Whole-day roster", headers: ["ID", "Student", "Today"] }, roster.map((s) => /* @__PURE__ */ React.createElement("tr", { key: s.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs text-primary-700" }, s.student_number || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, s.username, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, s.first_name, " ", s.last_name)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { role: "radiogroup", "aria-label": `Whole-day status for ${s.username}`, className: "flex flex-wrap gap-1" }, STATUSES.map((st) => /* @__PURE__ */ React.createElement("button", { key: st, role: "radio", "aria-checked": marks[s.id] === st, onClick: () => setMarks({ ...marks, [s.id]: st }), className: `rounded-full px-2.5 py-1 text-xs font-medium ${marks[s.id] === st ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}` }, st)))))))), /* @__PURE__ */ React.createElement(Card, { title: "Review & submit" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(Button, { onClick: saveDraft, loading: saving }, "Save draft"), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: submit, disabled: !session || session.status !== "DRAFT" }, "Submit")))));
}
export {
  DailyAttendancePage
};
