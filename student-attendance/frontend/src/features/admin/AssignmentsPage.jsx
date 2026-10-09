import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Button, Card, Field } from "../../components/ui";
import { Dialog } from "../../components/dialog";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { unwrap } from "../../types";
function AssignmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [bye, setBye] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ classroom: "", status: "ACTIVE" });
  const [enrollFilter, setEnrollFilter] = useState("ACTIVE");
  const [enrollClass, setEnrollClass] = useState("");
  const enrollFilterRef = useRef("ACTIVE");
  const enrollClassRef = useRef("");
  const [promoteFrom, setPromoteFrom] = useState("");
  const [promoteTo, setPromoteTo] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const fetchEnrollments = async (status, classroom) => {
    const qp = new URLSearchParams({ page_size: "200" });
    if (status) qp.set("status", status);
    if (classroom) qp.set("classroom", classroom);
    const e = await api(`/api/v1/enrollments/?${qp.toString()}`);
    setEnrollments(unwrap(e));
  };
  const pickEnrollFilter = (s) => {
    setEnrollFilter(s);
    enrollFilterRef.current = s;
    void fetchEnrollments(s, enrollClassRef.current);
  };
  const pickEnrollClass = (c) => {
    setEnrollClass(c);
    enrollClassRef.current = c;
    void fetchEnrollments(enrollFilterRef.current, c);
  };
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, c] = await Promise.all([
        api("/api/v1/admin/users/?page_size=200"),
        api("/api/v1/classrooms/?page_size=200")
      ]);
      await fetchEnrollments(enrollFilterRef.current, enrollClassRef.current);
      const all = unwrap(users);
      setStudents(all.filter((u) => u.role === "STUDENT"));
      setRooms(unwrap(c));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openEdit = (e) => {
    setEditing(e);
    setEditForm({ classroom: String(e.classroom), status: e.status });
  };
  const saveEdit = async () => {
    if (!editing) return;
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/enrollments/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ classroom: Number(editForm.classroom), status: editForm.status })
      });
      setOk(`Moved ${editing.student_username ?? "student"} to the new class.`);
      setEditing(null);
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  };
  const doDelete = async () => {
    if (!bye) return;
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/enrollments/${bye.id}/`, { method: "DELETE" });
      setOk(`Removed enrollment ${bye.id}.`);
      setBye(null);
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Delete failed.");
      setBye(null);
    }
  };
  const doClearInactive = async () => {
    if (!enrollClassRef.current) return;
    setClearBusy(true);
    setOk(null);
    setError(null);
    try {
      const res = await api(
        `/api/v1/enrollments/clear-inactive/?classroom=${enrollClassRef.current}`,
        { method: "DELETE" }
      );
      setOk(`Cleared ${res.deleted} inactive enrollment(s) from ${res.classroom}.`);
      setClearArmed(false);
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Clear failed.");
      setClearArmed(false);
    } finally {
      setClearBusy(false);
    }
  };
  const inactiveCount = enrollments.filter((e) => e.status !== "ACTIVE").length;
  const doPromote = async () => {
    if (!promoteFrom || !promoteTo || promoteFrom === promoteTo) {
      setOk(null);
      setError("Pick two different classes.");
      return;
    }
    setPromoteBusy(true);
    setOk(null);
    setError(null);
    try {
      const toRoom = rooms.find((c) => String(c.id) === String(promoteTo));
      const res = await api("/api/v1/enrollments/promote/", { method: "POST", body: JSON.stringify({ from_classroom: Number(promoteFrom), to_classroom: Number(promoteTo), academic_year: Number(toRoom && toRoom.academic_year) }) });
      const skipped = (res.skipped || []).map((sk) => {
        const who = students.find((x) => x.id === sk.student);
        return (who ? who.username : "#" + sk.student) + " (" + sk.reason + ")";
      });
      setOk("Promoted " + res.moved + " student(s)" + (skipped.length ? ". Skipped: " + skipped.join("; ") + "." : ". Old enrollments set inactive."));
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Promote failed.");
    } finally {
      setPromoteBusy(false);
    }
  };
  const sel = "rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white";
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Student enrollments", crumbs: ["Home", "Admin", "Enrollments"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: load })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, /* @__PURE__ */ React.createElement(Card, { title: `Enrollments (${enrollments.length})`, subtitle: "Wrong class? Edit the row. Students join classes at creation or upload." }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex flex-wrap items-center gap-1.5", role: "radiogroup", "aria-label": "Enrollment status filter" }, ["ACTIVE", "INACTIVE", ""].map((st) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: st || "ALL",
      role: "radio",
      "aria-checked": enrollFilter === st,
      onClick: () => pickEnrollFilter(st),
      className: `rounded-full px-3 py-1.5 text-xs font-medium ${enrollFilter === st ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
    },
    st || "ALL"
  )), /* @__PURE__ */ React.createElement("select", { "aria-label": "Filter by class", className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700", value: enrollClass, onChange: (e) => pickEnrollClass(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All classes"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section))), enrollClass && inactiveCount > 0 && !clearArmed && /* @__PURE__ */ React.createElement("button", { onClick: () => setClearArmed(true), className: "rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100" }, "Clear ", inactiveCount, " inactive"), clearArmed && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600" }, "Delete ", inactiveCount, " inactive row(s)? Attendance history is kept."), /* @__PURE__ */ React.createElement("button", { onClick: doClearInactive, disabled: clearBusy, className: "rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white" }, clearBusy ? "Clearing\u2026" : "Confirm clear"), /* @__PURE__ */ React.createElement("button", { onClick: () => setClearArmed(false), className: "rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 underline" }, "Keep"))), enrollments.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No enrollments", hint: "Try a different filter, or add students in Users." }) : /* @__PURE__ */ React.createElement(Table, { caption: "Enrollments", headers: ["ID", "Student", "Class", "Status", "", ""] }, enrollments.map((e) => /* @__PURE__ */ React.createElement("tr", { key: e.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs text-primary-700" }, e.student_number || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, e.student_username ?? e.student), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, e.classroom_display ?? e.classroom), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${e.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}` }, e.status)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => openEdit(e) }, "Edit")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setBye({ kind: "enrollment", id: e.id, label: `enrollment ${e.id}` }) }, "Remove")))))), /* @__PURE__ */ React.createElement(Card, { title: "Promote class \u2014 next year", subtitle: "Move every active student up. Old enrollments become inactive, new ones are created." }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 md:grid-cols-3" }, /* @__PURE__ */ React.createElement(Field, { label: "From class" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Promote from", className: sel, value: promoteFrom, onChange: (e) => setPromoteFrom(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select\u2026"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "To class" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Promote to", className: sel, value: promoteTo, onChange: (e) => setPromoteTo(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select\u2026"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-end" }, /* @__PURE__ */ React.createElement(Button, { onClick: doPromote, loading: promoteBusy, disabled: !promoteFrom || !promoteTo }, "Promote"))))), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: editing ? `Edit enrollment #${editing.id}` : "Edit enrollment",
      open: !!editing,
      onClose: () => setEditing(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditing(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveEdit }, "Save"))
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Class (fixes wrong-class mistakes)" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Enrollment class", className: sel, value: editForm.classroom, onChange: (e) => setEditForm({ ...editForm, classroom: e.target.value }) }, rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "Status" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Enrollment status", className: sel, value: editForm.status, onChange: (e) => setEditForm({ ...editForm, status: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "ACTIVE" }, "ACTIVE"), /* @__PURE__ */ React.createElement("option", { value: "INACTIVE" }, "INACTIVE"))))
  ), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: bye ? `Remove ${bye.label}?` : "Remove",
      open: !!bye,
      onClose: () => setBye(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setBye(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { variant: "danger", onClick: doDelete }, "Remove"))
    },
    "Attendance history is kept \u2014 only this enrollment row is removed."
  ));
}
export {
  AssignmentsPage
};
