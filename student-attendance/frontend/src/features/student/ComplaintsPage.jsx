import React, { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { isAdminUser } from "../../types";
import { Badge, Button, Card, Field, Input } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
const CATEGORIES = ["FACILITY", "TEACHER", "TRANSPORT", "FOOD", "SAFETY", "OTHER"];
const TONE = { OPEN: "amber", IN_REVIEW: "blue", RESOLVED: "green", REJECTED: "red" };
function ComplaintsPage() {
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState({ title: "", category: "FACILITY", body: "" });
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api("/api/v1/complaints/");
      setItems(d.results ?? d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api("/api/v1/complaints/", { method: "POST", body: JSON.stringify(form) });
      setOk("Sent! The office will review it and reply here.");
      setForm({ title: "", category: "FACILITY", body: "" });
      await load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Complaint box", crumbs: ["Home", "Student", "Complaints"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: load })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", null, admin ? /* @__PURE__ */ React.createElement(Card, { title: "Review queue", subtitle: "You are an admin \u2014 resolve complaints in the queue." }, /* @__PURE__ */ React.createElement(Button, { onClick: () => window.location.href = "/admin/complaints" }, "Open queue")) : /* @__PURE__ */ React.createElement(Card, { title: "Write to the office", subtitle: "Facilities, transport, food, safety \u2014 anything. Only you and the admin see it." }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Title" }, /* @__PURE__ */ React.createElement(Input, { value: form.title, maxLength: 120, onChange: (e) => setForm({ ...form, title: e.target.value }), placeholder: "e.g. Leaking tap in washroom", required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Category" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Category", className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm", value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }) }, CATEGORIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c)))), /* @__PURE__ */ React.createElement(Field, { label: "Details", hint: "Max 2000 characters." }, /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Details", className: "min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm", value: form.body, maxLength: 2e3, onChange: (e) => setForm({ ...form, body: e.target.value }), placeholder: "Where, when, what happened\u2026", required: true })), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: busy }, "Send complaint")))), /* @__PURE__ */ React.createElement(Card, { title: `My complaints (${items.length})` }, items.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "Nothing here yet", hint: "Your complaints and office replies appear here." }) : /* @__PURE__ */ React.createElement("ul", { className: "flex flex-col gap-3" }, items.map((c) => /* @__PURE__ */ React.createElement("li", { key: c.id, className: "rounded-xl border border-slate-200 p-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, c.title), /* @__PURE__ */ React.createElement(Badge, { tone: TONE[c.status] ?? "slate" }, c.status.replace("_", " ")), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-xs text-slate-400" }, new Date(c.created_at).toLocaleDateString(), " \xB7 ", c.category)), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm text-slate-600" }, c.body), c.admin_reply && /* @__PURE__ */ React.createElement("p", { className: "mt-2 rounded-lg bg-indigo-50 p-2.5 text-sm text-indigo-900" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Office reply: "), c.admin_reply)))))));
}
export {
  ComplaintsPage
};
