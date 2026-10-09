import React, { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError, ensureCsrf } from "../../lib/api";
import { Badge, Button, Card, Field, Input } from "../../components/ui";
import { Dialog } from "../../components/dialog";
import { EmptyState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { unwrap } from "../../types";
function errMsg(e) {
  if (e instanceof ApiError) {
    const p = e.payload;
    if (p?.detail) return String(p.detail);
    const first = Object.entries(p ?? {})[0];
    if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1].join(", ") : String(first[1])}`;
  }
  return e instanceof Error ? e.message : "Request failed.";
}
const ROLES = ["", "ADMIN", "TEACHER", "STUDENT"];
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "STUDENT", student_number: "", employee_number: "", classroom: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", role: "STUDENT", is_active: true });
  const [deleting, setDeleting] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkClass, setBulkClass] = useState("");
  const load = async (overrides) => {
    const rf = overrides && "role" in overrides ? overrides.role : roleFilter;
    const af = overrides && "active" in overrides ? overrides.active : activeFilter;
    const cf = overrides && "classroom" in overrides ? overrides.classroom : classFilter;
    const sq = overrides && "search" in overrides ? overrides.search : appliedSearch;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page_size: "200" });
      if (rf) q.set("role", rf);
      if (af) q.set("is_active", af);
      if (cf) q.set("classroom", cf);
      if (sq) q.set("search", sq);
      const qs = q.toString();
      const [d, c] = await Promise.all([
        api(`/api/v1/admin/users/${qs ? `?${qs}` : ""}`),
        api("/api/v1/classrooms/?page_size=200")
      ]);
      setUsers(unwrap(d));
      setClassrooms(unwrap(c));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { username: form.username, email: form.email, password: form.password, role: form.role };
      if (form.role === "STUDENT" && form.classroom) payload.classroom = Number(form.classroom);
      const u = await api("/api/v1/admin/users/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (form.role === "STUDENT" && !form.classroom) {
        const body = { user: u.id, status: "ACTIVE" };
        if (form.student_number.trim()) body.student_number = form.student_number.trim();
        await api("/api/v1/student-profiles/", { method: "POST", body: JSON.stringify(body) });
      }
      if (form.role === "TEACHER") {
        const body = { user: u.id };
        if (form.employee_number.trim()) body.employee_number = form.employee_number.trim();
        await api("/api/v1/teacher-profiles/", { method: "POST", body: JSON.stringify(body) });
      }
      setSuccess(`Created ${u.username}${form.classroom ? " and enrolled." : "."}`);
      setForm({ username: "", email: "", password: "", role: "STUDENT", student_number: "", employee_number: "", classroom: "" });
      await load();
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };
  const openEdit = (u) => {
    setEditing(u);
    setEditForm({ first_name: u.first_name, last_name: u.last_name, role: u.role, is_active: u.is_active });
  };
  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      await api(`/api/v1/admin/users/${editing.id}/`, { method: "PATCH", body: JSON.stringify(editForm) });
      setSuccess(`Updated ${editing.username}.`);
      setEditing(null);
      await load();
    } catch (e) {
      setSuccess(null);
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      await api(`/api/v1/admin/users/${deleting.id}/`, { method: "DELETE" });
      setSuccess(`Deleted ${deleting.username}.`);
      setDeleting(null);
      await load();
    } catch (e) {
      setSuccess(null);
      setError(errMsg(e) + " (Records with attendance history are protected \u2014 deactivate instead.)");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };
  const pickRole = (r) => {
    setRoleFilter(r);
    void load({ role: r });
  };
  const pickClass = (c) => {
    setClassFilter(c);
    void load({ classroom: c });
  };
  const runSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search);
    void load({ search });
  };
  const clearFilters = () => {
    setRoleFilter("");
    setActiveFilter("");
    setClassFilter("");
    setSearch("");
    setAppliedSearch("");
    void load({ role: "", active: "", classroom: "", search: "" });
  };
  const downloadTemplate = () => {
    const csv = "username,firstname,lastname,email\nsara,Sara,Khan,sara@example.com\narjun,Arjun,Mehta,arjun@example.com\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const uploadBulk = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkBusy(true);
    setError(null);
    setSuccess(null);
    setBulkResult(null);
    try {
      const token = await ensureCsrf();
      const fd = new FormData();
      fd.append("file", bulkFile);
      if (bulkClass) fd.append("classroom", bulkClass);
      const res = await fetch("/api/v1/admin/users/bulk/", {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: token ? { "X-CSRFToken": token } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(res.status, data);
      setBulkResult(data);
      setSuccess(`Bulk upload: ${data.created.length} created${data.errors.length ? `, ${data.errors.length} failed` : ""}. Password = firstname, IDs auto-generated.`);
      setBulkFile(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBulkBusy(false);
    }
  };
  const filtered = roleFilter || activeFilter || appliedSearch || classFilter;
  return /* @__PURE__ */ React.createElement(AppShell, { title: "User management", crumbs: ["Home", "Admin", "Users"] }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: "Create user", subtitle: "Admin-managed accounts only. Min password 8 chars." }, /* @__PURE__ */ React.createElement("form", { onSubmit: create, className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Username" }, /* @__PURE__ */ React.createElement(Input, { value: form.username, onChange: (e) => setForm({ ...form, username: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Email" }, /* @__PURE__ */ React.createElement(Input, { type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Password", hint: "Min 8 chars." }, /* @__PURE__ */ React.createElement(Input, { type: "password", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Role" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Role", className: "rounded-lg border border-slate-300 px-3 py-2 text-sm", value: form.role, onChange: (e) => setForm({ ...form, role: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "STUDENT" }, "STUDENT"), /* @__PURE__ */ React.createElement("option", { value: "TEACHER" }, "TEACHER"), /* @__PURE__ */ React.createElement("option", { value: "ADMIN" }, "ADMIN"))), form.role === "STUDENT" && /* @__PURE__ */ React.createElement(Field, { label: "Class (optional)", hint: "Enrolls immediately — skips the Assignments step." }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Creation class", className: "rounded-lg border border-slate-300 px-3 py-2 text-sm", value: form.classroom, onChange: (e) => setForm({ ...form, classroom: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "No class yet"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), form.role === "STUDENT" && /* @__PURE__ */ React.createElement(Field, { label: "Student number (optional)", hint: "Blank = auto ID like S021." }, /* @__PURE__ */ React.createElement(Input, { value: form.student_number, onChange: (e) => setForm({ ...form, student_number: e.target.value }), placeholder: "S003" })), form.role === "TEACHER" && /* @__PURE__ */ React.createElement(Field, { label: "Employee number (optional)", hint: "Blank = auto ID like T006." }, /* @__PURE__ */ React.createElement(Input, { value: form.employee_number, onChange: (e) => setForm({ ...form, employee_number: e.target.value }), placeholder: "T003" })), error && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-red-600" }, error), success && /* @__PURE__ */ React.createElement("p", { role: "status", className: "text-sm text-green-700" }, success), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: busy }, "Create"))), /* @__PURE__ */ React.createElement(Card, { title: `Accounts (${users.length})`, subtitle: "Edit inline, deactivate instead of deleting history." }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5", role: "radiogroup", "aria-label": "Role filter" }, ROLES.map((r) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: r || "ALL",
      role: "radio",
      "aria-checked": roleFilter === r,
      onClick: () => pickRole(r),
      className: `rounded-full px-3 py-1.5 text-xs font-medium ${roleFilter === r ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
    },
    r || "ALL"
  )), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Active filter",
      className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700",
      value: activeFilter,
      onChange: (e) => {
        setActiveFilter(e.target.value);
        void load({ active: e.target.value });
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Active: any"),
    /* @__PURE__ */ React.createElement("option", { value: "true" }, "Active only"),
    /* @__PURE__ */ React.createElement("option", { value: "false" }, "Inactive only")
  ), /* @__PURE__ */ React.createElement("select", { "aria-label": "Class filter", className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700", value: classFilter, onChange: (e) => pickClass(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All classes"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section))), (roleFilter || activeFilter || classFilter) && /* @__PURE__ */ React.createElement("button", { onClick: clearFilters, className: "rounded-full px-3 py-1.5 text-xs font-medium text-primary-700 underline" }, "Clear")), /* @__PURE__ */ React.createElement("form", { onSubmit: runSearch, className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Input, { "aria-label": "Search users", placeholder: "Search name, username, email\u2026", value: search, onChange: (e) => setSearch(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { variant: "secondary", type: "submit" }, "Search"))), loading ? /* @__PURE__ */ React.createElement(Loading, null) : users.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: filtered ? "No matches" : "No users", hint: filtered ? "Try different filters." : void 0 }) : /* @__PURE__ */ React.createElement(Table, { caption: "Users", headers: ["Username", "Role", "ID", "Class", "Active", "Actions"] }, users.map((u) => /* @__PURE__ */ React.createElement("tr", { key: u.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, u.username, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, u.email)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement(Badge, { tone: u.role === "ADMIN" ? "blue" : u.role === "TEACHER" ? "amber" : "slate" }, u.role)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs text-primary-700" }, u.student_number || u.employee_number || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-xs text-slate-600" }, u.classes || "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, u.is_active ? "Yes" : "No"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => openEdit(u) }, "Edit"), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setDeleting(u) }, "Delete")))))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement(Card, { title: "Bulk add students \u2014 Excel / CSV upload", subtitle: "Columns: username, firstname, lastname (optional), email. Password = firstname. IDs auto-generate. Max 500 rows, 2 MB." }, /* @__PURE__ */ React.createElement("form", { onSubmit: uploadBulk, className: "flex flex-col gap-3 sm:flex-row sm:items-end" }, /* @__PURE__ */ React.createElement(Field, { label: "Enroll all into class (optional)" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Bulk class", className: "rounded-lg border border-slate-300 px-3 py-2 text-sm", value: bulkClass, onChange: (e) => setBulkClass(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "No class — accounts only"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, "-", c.section)))), /* @__PURE__ */ React.createElement(Field, { label: "File (.xlsx or .csv)" }, /* @__PURE__ */ React.createElement(Input, { type: "file", accept: ".xlsx,.xls,.csv", onChange: (e) => setBulkFile(e.target.files?.[0] ?? null), required: true })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", type: "button", onClick: downloadTemplate }, "Template"), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: bulkBusy, disabled: !bulkFile }, "Upload"))), bulkResult && /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-sm" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-slate-800" }, "Created ", bulkResult.created.length, " of ", bulkResult.total), bulkResult.created.length > 0 && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-slate-600" }, bulkResult.created.slice(0, 10).map((c) => `${c.username} (${c.student_number})${c.renamed_from ? ` ← ${c.renamed_from}` : ""}${c.enrolled_in ? ` → ${c.enrolled_in}` : ""}`).join(", "), bulkResult.created.length > 10 ? ` +${bulkResult.created.length - 10} more` : ""), bulkResult.errors.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mt-2 space-y-1" }, bulkResult.errors.map((e, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "rounded-lg bg-red-50 px-3 py-1.5 text-red-700" }, "Row ", e.row, " (", e.username || "?", "): ", e.reason)))))), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: editing ? `Edit ${editing.username}` : "Edit user",
      open: !!editing,
      onClose: () => setEditing(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditing(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveEdit, loading: busy }, "Save"))
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "First name" }, /* @__PURE__ */ React.createElement(Input, { value: editForm.first_name, onChange: (e) => setEditForm({ ...editForm, first_name: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "Last name" }, /* @__PURE__ */ React.createElement(Input, { value: editForm.last_name, onChange: (e) => setEditForm({ ...editForm, last_name: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "Role" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Edit role", className: "rounded-lg border border-slate-300 px-3 py-2 text-sm", value: editForm.role, onChange: (e) => setEditForm({ ...editForm, role: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "STUDENT" }, "STUDENT"), /* @__PURE__ */ React.createElement("option", { value: "TEACHER" }, "TEACHER"), /* @__PURE__ */ React.createElement("option", { value: "ADMIN" }, "ADMIN"))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: editForm.is_active, onChange: (e) => setEditForm({ ...editForm, is_active: e.target.checked }) }), " Active account"))
  ), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: deleting ? `Delete ${deleting.username}?` : "Delete user",
      open: !!deleting,
      onClose: () => setDeleting(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setDeleting(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { variant: "danger", onClick: confirmDelete, loading: busy }, "Delete"))
    },
    "Users with attendance history cannot be deleted (protected). Deactivate them instead \u2014 deletion is only for mistakenly created accounts."
  ));
}
export {
  UsersPage
};
