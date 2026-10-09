import React from "react";
import { useEffect, useMemo, useState } from "react";
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
function AttendancePage() {
  const { classroomId } = useParams();
  const cid = Number(classroomId);
  const [assignments, setAssignments] = useState([]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});
  const [session, setSession] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [reason, setReason] = useState("");
  const [confirmLoss, setConfirmLoss] = useState(false);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, r] = await Promise.all([
          api("/api/v1/teacher/assignments/"),
          api(`/api/v1/classes/${cid}/students/`)
        ]);
        const mine = a.filter((x) => x.classroom === cid);
        setAssignments(mine);
        if (mine[0]) setSubject(String(mine[0].subject));
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
  const loadSession = async () => {
    setError(null);
    setOk(null);
    try {
      const list = await api(`/api/v1/attendance/sessions/?classroom=${cid}&subject=${subject}&date=${date}`);
      const found = unwrap(list)[0] ?? null;
      setSession(found);
      if (found) {
        const m = { ...marks };
        found.records.forEach((r) => m[r.student] = r.status);
        setMarks(m);
        const au = await api(`/api/v1/attendance/sessions/${found.id}/audit/`);
        setAudit(au.events);
      } else {
        setAudit([]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lookup failed.");
    }
  };
  useEffect(() => {
    if (subject && date && roster.length > 0) void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, date]);
  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const records = Object.entries(marks).map(([student, status]) => ({ student: Number(student), status }));
      const created = await api("/api/v1/attendance/sessions/", {
        method: "POST",
        body: JSON.stringify({ classroom: cid, subject: Number(subject), date, records })
      });
      setSession(created);
      setOk(`Draft saved (${created.records.length} records). Review counts, then submit.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed. Duplicate session may exist \u2014 submit or correct it instead.");
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
      setOk("Submitted. Corrections now require an administrator.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Submit failed.");
    } finally {
      setSaving(false);
    }
  };
  const correct = async () => {
    if (!session) return;
    if (reason.trim().length < 5) {
      setError("Correction reason (min 5 chars) is required.");
      return;
    }
    setSaving(true);
    try {
      const records = Object.entries(marks).map(([student, status]) => ({ student: Number(student), status }));
      const updated = await api(`/api/v1/attendance/sessions/${session.id}/corrections/`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim(), records })
      });
      setSession(updated);
      setOk("Correction saved with audit trail.");
      setReason("");
      await loadHistory();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Correction failed (submitted sessions: admin only).");
    } finally {
      setSaving(false);
    }
  };
  const [history, setHistory] = useState([]);
  const loadHistory = async () => {
    try {
      const list = await api(
        `/api/v1/attendance/sessions/?classroom=${cid}${subject ? `&subject=${subject}` : ""}`
      );
      setHistory(unwrap(list).slice(0, 8));
    } catch {
      // history best-effort; marking still works without it
    }
  };
  useEffect(() => {
    if (!loading && subject) void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, subject, session?.id]);
  return /* @__PURE__ */ React.createElement(AppShell, { title: `Attendance \u2014 Class ${cid}`, crumbs: ["Home", "Teacher", `Class ${cid}`] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-800" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, { label: "Loading roster\u2026" }) : roster.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No students enrolled" }) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, /* @__PURE__ */ React.createElement(Card, { title: "Session", subtitle: "Select subject and date. Unsaved changes are lost on navigation." }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Subject" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Subject", className: "rounded-lg border px-3 py-2 text-sm", value: subject, onChange: (e) => setSubject(e.target.value) }, assignments.map((a) => /* @__PURE__ */ React.createElement("option", { key: a.id, value: a.subject }, a.subject_display ?? `Subject ${a.subject}`)))), /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: date, onChange: (e) => {
    setDate(e.target.value);
    setConfirmLoss(true);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "Status" }, /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: session?.status === "SUBMITTED" ? "green" : "amber" }, session ? session.status : "NEW DRAFT")))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-sm text-slate-600" }, "Counts: ", STATUSES.map((s) => `${s} ${counts[s] ?? 0}`).join(" \xB7 "))), /* @__PURE__ */ React.createElement(Card, { title: `Roster (${roster.length})`, subtitle: "Tap a status per student. Bulk actions below." }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => {
    const m = {};
    roster.forEach((s) => m[s.id] = "PRESENT");
    setMarks(m);
  } }, "All present"), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => {
    const m = {};
    roster.forEach((s) => m[s.id] = "ABSENT");
    setMarks(m);
  } }, "All absent")), /* @__PURE__ */ React.createElement(Table, { caption: "Roster", headers: ["ID", "Student", "Status"] }, roster.map((s) => /* @__PURE__ */ React.createElement("tr", { key: s.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs text-primary-700" }, s.student_number || "—"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, s.username, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, s.first_name, " ", s.last_name)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { role: "radiogroup", "aria-label": `Status for ${s.username}`, className: "flex flex-wrap gap-1" }, STATUSES.map((st) => /* @__PURE__ */ React.createElement("button", { key: st, role: "radio", "aria-checked": marks[s.id] === st, onClick: () => setMarks({ ...marks, [s.id]: st }), className: `rounded-full px-2.5 py-1 text-xs font-medium ${marks[s.id] === st ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}` }, st))))))), confirmLoss && /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs text-amber-700" }, "Date changed \u2014 review marks before saving.")), /* @__PURE__ */ React.createElement(Card, { title: "Review & submit" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(Button, { onClick: saveDraft, loading: saving }, "Save draft"), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: submit, disabled: !session || session.status !== "DRAFT" }, "Submit")), /* @__PURE__ */ React.createElement("div", { className: "mt-3 grid gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Correction reason (required for corrections)", hint: "Min 5 chars. Audited with before/after." }, /* @__PURE__ */ React.createElement(Input, { value: reason, onChange: (e) => setReason(e.target.value), placeholder: "e.g. verified late arrival" })), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: correct, disabled: !session }, "Save correction")), audit.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-medium" }, "Audit trail"), /* @__PURE__ */ React.createElement("ul", { className: "mt-1 space-y-1 text-sm text-slate-600" }, audit.map((a, i) => /* @__PURE__ */ React.createElement("li", { key: i }, new Date(a.timestamp).toLocaleString(), " \u2014 ", a.actor, " \u2014 ", a.action))))), /* @__PURE__ */ React.createElement(Card, { title: "Recent sessions", subtitle: "Latest for this class + subject. Pick a date above to load one." }, history.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No sessions yet", hint: "Save your first draft above." }) : /* @__PURE__ */ React.createElement(Table, { caption: "Recent sessions", headers: ["Date", "Status", "Present"] }, history.map((h) => /* @__PURE__ */ React.createElement("tr", { key: h.id, className: session?.id === h.id ? "bg-primary-50" : void 0 }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, h.date), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: h.status === "SUBMITTED" ? "green" : "amber" }, h.status)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, h.counts ? `${(h.counts.PRESENT ?? 0) + (h.counts.LATE ?? 0)}/${h.counts.TOTAL ?? h.records.length}` : h.records.length)))))));
}
export {
  AttendancePage
};
