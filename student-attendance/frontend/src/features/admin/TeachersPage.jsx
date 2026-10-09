import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Button, Card, Field } from "../../components/ui";
import { Dialog } from "../../components/dialog";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { unwrap } from "../../types";
function TeachersPage() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState({ teacher: "", classroom: "", subject: "", academic_year: "" });
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ classroom: "", subject: "", is_active: true });
  const [fTeacher, setFTeacher] = useState("");
  const [fClass, setFClass] = useState("");
  const [fSubject, setFSubject] = useState("");
  const fTeacherRef = useRef("");
  const fClassRef = useRef("");
  const fSubjectRef = useRef("");
  const fetchAssignments = async (t, c, s) => {
    const qp = new URLSearchParams({ page_size: "200" });
    if (t) qp.set("teacher", t);
    if (c) qp.set("classroom", c);
    if (s) qp.set("subject", s);
    setAssignments(unwrap(await api(`/api/v1/assignments/?${qp.toString()}`)));
  };
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, c, s, years] = await Promise.all([
        api("/api/v1/admin/users/?page_size=200"),
        api("/api/v1/classrooms/?page_size=200"),
        api("/api/v1/subjects/?page_size=200"),
        api("/api/v1/academic-years/?page_size=200")
      ]);
      await fetchAssignments(fTeacherRef.current, fClassRef.current, fSubjectRef.current);
      const all = unwrap(users);
      setTeachers(all.filter((u) => u.role === "TEACHER"));
      setRooms(unwrap(c));
      setSubjects(unwrap(s));
      const y = unwrap(years)[0];
      if (y && !form.academic_year) setForm((f) => ({ ...f, academic_year: String(y.id) }));
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
  const roomYear = (id) => {
    const room = rooms.find((c) => String(c.id) === String(id));
    return room ? room.academic_year : null;
  };
  const pickFilter = (which, v) => {
    if (which === "teacher") {
      setFTeacher(v);
      fTeacherRef.current = v;
    }
    if (which === "class") {
      setFClass(v);
      fClassRef.current = v;
    }
    if (which === "subject") {
      setFSubject(v);
      fSubjectRef.current = v;
    }
    const t = which === "teacher" ? v : fTeacherRef.current;
    const c = which === "class" ? v : fClassRef.current;
    const s = which === "subject" ? v : fSubjectRef.current;
    void fetchAssignments(t, c, s).catch((err) => setError(err instanceof ApiError ? err.message : "Filter failed."));
  };
  const clearFilters = () => {
    setFTeacher("");
    setFClass("");
    setFSubject("");
    fTeacherRef.current = "";
    fClassRef.current = "";
    fSubjectRef.current = "";
    void fetchAssignments("", "", "");
  };
  const create = async (ev) => {
    ev.preventDefault();
    setOk(null);
    setError(null);
    setBusy(true);
    try {
      await api("/api/v1/assignments/", {
        method: "POST",
        body: JSON.stringify({
          teacher: Number(form.teacher),
          classroom: Number(form.classroom),
          subject: Number(form.subject),
          academic_year: Number(roomYear(form.classroom) ?? form.academic_year)
        })
      });
      setOk("Teacher assigned.");
      setForm({ teacher: "", classroom: "", subject: "", academic_year: form.academic_year });
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };
  const openEdit = (a) => {
    setEditing(a);
    setEditForm({ classroom: String(a.classroom), subject: String(a.subject), is_active: a.is_active });
  };
  const saveEdit = async () => {
    if (!editing) return;
    setOk(null);
    setError(null);
    setBusy(true);
    try {
      const year = roomYear(editForm.classroom);
      await api(`/api/v1/assignments/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          classroom: Number(editForm.classroom),
          subject: Number(editForm.subject),
          academic_year: Number(year),
          is_active: editForm.is_active
        })
      });
      setOk("Assignment updated.");
      setEditing(null);
      await load();
    } catch (err) {
      setOk(null);
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/assignments/${id}/`, { method: "DELETE" });
      setOk("Assignment removed.");
      setConfirmId(null);
      await load();
    } catch (err) {
      setOk(null);
      setError((err instanceof ApiError ? err.message : "Delete failed.") + " (Sessions reference it \u2014 unassign only when unused.)");
      setConfirmId(null);
    }
  };
  const sel = "rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white";
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Teachers", crumbs: ["Home", "Admin", "Teachers"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: load })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: "Assign teacher", subtitle: "One teacher can take the same subject in many classes." }, /* @__PURE__ */ React.createElement("form", { onSubmit: create, className: "grid gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Teacher" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Teacher", className: sel, value: form.teacher, onChange: (e) => setForm({ ...form, teacher: e.target.value }), required: true }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select\u2026"), teachers.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.username, t.employee_number ? ` (${t.employee_number})` : "")))), /* @__PURE__ */ React.createElement(Field, { label: "Class" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Class", className: sel, value: form.classroom, onChange: (e) => setForm({ ...form, classroom: e.target.value }), required: true }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select\u2026"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "Subject" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Subject", className: sel, value: form.subject, onChange: (e) => setForm({ ...form, subject: e.target.value }), required: true }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select\u2026"), subjects.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.name)))), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: busy }, "Assign"))), /* @__PURE__ */ React.createElement(Card, { title: `Teaching assignments (${assignments.length})` }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex flex-wrap items-center gap-1.5", "aria-label": "Assignment filters" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Filter by teacher", className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700", value: fTeacher, onChange: (e) => pickFilter("teacher", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All teachers"), teachers.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.username))), /* @__PURE__ */ React.createElement("select", { "aria-label": "Filter by class", className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700", value: fClass, onChange: (e) => pickFilter("class", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All classes"), rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section))), /* @__PURE__ */ React.createElement("select", { "aria-label": "Filter by subject", className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700", value: fSubject, onChange: (e) => pickFilter("subject", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All subjects"), subjects.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.name))), (fTeacher || fClass || fSubject) && /* @__PURE__ */ React.createElement("button", { onClick: clearFilters, className: "rounded-full px-3 py-1.5 text-xs font-medium text-primary-700 underline" }, "Clear")), assignments.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No assignments", hint: "Try different filters, or assign above." }) : /* @__PURE__ */ React.createElement(Table, { caption: "Assignments", headers: ["Teacher", "Class / Subject", "Active", "", ""] }, assignments.map((a) => /* @__PURE__ */ React.createElement("tr", { key: a.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, a.teacher_username ?? a.teacher), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, a.classroom_display ?? a.classroom, " \xB7 ", a.subject_display ?? a.subject), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${a.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}` }, a.is_active ? "Yes" : "No")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => openEdit(a) }, "Edit")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, confirmId === a.id ? /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5" }, /* @__PURE__ */ React.createElement(Button, { variant: "danger", onClick: () => remove(a.id) }, "Confirm"), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setConfirmId(null) }, "Keep")) : /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setConfirmId(a.id) }, "Remove"))))))), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: editing ? `Edit assignment #${editing.id}` : "Edit assignment",
      open: !!editing,
      onClose: () => setEditing(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditing(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveEdit, loading: busy }, "Save"))
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, "Teacher: ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, editing?.teacher_username ?? ""), " (change via Remove + re-assign)"), /* @__PURE__ */ React.createElement(Field, { label: "Class" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Edit class", className: sel, value: editForm.classroom, onChange: (e) => setEditForm({ ...editForm, classroom: e.target.value }) }, rooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "Subject" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Edit subject", className: sel, value: editForm.subject, onChange: (e) => setEditForm({ ...editForm, subject: e.target.value }) }, subjects.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.name)))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: editForm.is_active, onChange: (e) => setEditForm({ ...editForm, is_active: e.target.checked }) }), " Active assignment"))
  ));
}
export {
  TeachersPage
};
