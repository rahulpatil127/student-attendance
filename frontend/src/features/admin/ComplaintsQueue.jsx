import React, { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Badge, Button, Card, Field } from "../../components/ui";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
const STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
const TONE = { OPEN: "amber", IN_REVIEW: "blue", RESOLVED: "green", REJECTED: "red" };
function ComplaintsQueue() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const load = async (status) => {
    setLoading(true);
    setError(null);
    try {
      const q = status ? `?status=${status}` : "";
      const d = await api(`/api/v1/complaints/${q}`);
      setItems(d.results ?? d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(filter);
  }, [filter]);
  const resolve = async (c) => {
    const d = drafts[c.id] ?? {};
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/complaints/${c.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: d.status ?? (c.status === "OPEN" ? "IN_REVIEW" : c.status),
          admin_reply: d.reply ?? c.admin_reply ?? ""
        })
      });
      setOk(`Updated complaint #${c.id}.`);
      await load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete complaint #${c.id} "${c.title}"?`)) return;
    try {
      await api(`/api/v1/complaints/${c.id}/`, { method: "DELETE" });
      setOk(`Deleted complaint #${c.id}.`);
      await load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  };
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Complaint queue", crumbs: ["Home", "Admin", "Complaints"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: () => load(filter) })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800" }, ok), /* @__PURE__ */ React.createElement(Card, { title: "Filter" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5", role: "radiogroup", "aria-label": "Status filter" }, ["", ...STATUSES].map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s || "ALL",
      role: "radio",
      "aria-checked": filter === s,
      onClick: () => setFilter(s),
      className: `rounded-full px-3 py-1.5 text-xs font-medium ${filter === s ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`
    },
    s || "ALL"
  )))), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, loading ? /* @__PURE__ */ React.createElement(Loading, null) : items.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "Queue is clear", hint: "No complaints with this status. Nice." }) : /* @__PURE__ */ React.createElement("ul", { className: "grid gap-3" }, items.map((c) => {
    const d = drafts[c.id] ?? {};
    return /* @__PURE__ */ React.createElement("li", { key: c.id, className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-display font-bold" }, "#", c.id, " ", c.title), /* @__PURE__ */ React.createElement(Badge, { tone: TONE[c.status] ?? "slate" }, c.status.replace("_", " ")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-500" }, "by ", c.student_username, " \xB7 ", c.category, " \xB7 ", new Date(c.created_at).toLocaleString()), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => remove(c) }, "Delete")), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm text-slate-600" }, c.body), /* @__PURE__ */ React.createElement("div", { className: "mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto] md:items-end" }, /* @__PURE__ */ React.createElement(Field, { label: "Office reply" }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        "aria-label": `Reply to complaint ${c.id}`,
        className: "min-h-16 rounded-lg border border-slate-300 px-3 py-2 text-sm",
        defaultValue: c.admin_reply,
        onChange: (e) => setDrafts({ ...drafts, [c.id]: { ...d, reply: e.target.value } }),
        placeholder: "Write the resolution\u2026"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Status" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": `Status for complaint ${c.id}`,
        className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
        value: d.status ?? c.status,
        onChange: (e) => setDrafts({ ...drafts, [c.id]: { ...d, status: e.target.value } })
      },
      STATUSES.map((s) => /* @__PURE__ */ React.createElement("option", { key: s, value: s }, s))
    )), /* @__PURE__ */ React.createElement(Button, { onClick: () => resolve(c), loading: busy }, "Save")));
  }))));
}
export {
  ComplaintsQueue
};
