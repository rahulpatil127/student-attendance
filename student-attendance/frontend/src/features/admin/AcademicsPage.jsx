import React from "react";
import { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { Button, Card, Field, Input } from "../../components/ui";
import { Dialog } from "../../components/dialog";
import { EmptyState, ErrorState, Loading } from "../../components/feedback";
import { Table } from "../../components/table";
import { unwrap } from "../../types";
function msg(e) {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : "Failed.";
}
function AcademicsPage() {
  const [years, setYears] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [yearForm, setYearForm] = useState({ name: "", start_date: "", end_date: "" });
  const [roomForm, setRoomForm] = useState({ name: "", section: "A", academic_year: "" });
  const [subForm, setSubForm] = useState({ name: "", code: "" });
  const [editYear, setEditYear] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [bye, setBye] = useState(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [y, c, s] = await Promise.all([
        api("/api/v1/academic-years/?page_size=200"),
        api("/api/v1/classrooms/?page_size=200"),
        api("/api/v1/subjects/?page_size=200")
      ]);
      const yl = unwrap(y);
      setYears(yl);
      setRooms(unwrap(c));
      setSubjects(unwrap(s));
      if (yl[0] && !roomForm.academic_year) setRoomForm((f) => ({ ...f, academic_year: String(yl[0].id) }));
    } catch (e) {
      setOk(null);
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submitYear = async (e) => {
    e.preventDefault();
    setOk(null);
    setError(null);
    try {
      await api("/api/v1/academic-years/", { method: "POST", body: JSON.stringify({ ...yearForm, is_active: false }) });
      setOk("Year created.");
      setYearForm({ name: "", start_date: "", end_date: "" });
      await load();
    } catch (e2) {
      setOk(null);
      setError(msg(e2));
    }
  };
  const submitRoom = async (e) => {
    e.preventDefault();
    setOk(null);
    setError(null);
    try {
      await api("/api/v1/classrooms/", { method: "POST", body: JSON.stringify({ name: roomForm.name, section: roomForm.section, academic_year: Number(roomForm.academic_year) }) });
      setOk("Class created.");
      setRoomForm({ name: "", section: "A", academic_year: roomForm.academic_year });
      await load();
    } catch (e2) {
      setOk(null);
      setError(msg(e2));
    }
  };
  const submitSubject = async (e) => {
    e.preventDefault();
    setOk(null);
    setError(null);
    try {
      await api("/api/v1/subjects/", { method: "POST", body: JSON.stringify({ ...subForm, is_active: true }) });
      setOk("Subject created.");
      setSubForm({ name: "", code: "" });
      await load();
    } catch (e2) {
      setOk(null);
      setError(msg(e2));
    }
  };
  const saveYear = async () => {
    if (!editYear) return;
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/academic-years/${editYear.id}/`, { method: "PATCH", body: JSON.stringify({ name: editYear.name, start_date: editYear.start_date, end_date: editYear.end_date, is_active: editYear.is_active }) });
      setOk("Year updated.");
      setEditYear(null);
      await load();
    } catch (e) {
      setOk(null);
      setError(msg(e));
    }
  };
  const saveRoom = async () => {
    if (!editRoom) return;
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/classrooms/${editRoom.id}/`, { method: "PATCH", body: JSON.stringify({ name: editRoom.name, section: editRoom.section, is_active: editRoom.is_active }) });
      setOk("Class updated.");
      setEditRoom(null);
      await load();
    } catch (e) {
      setOk(null);
      setError(msg(e));
    }
  };
  const saveSub = async () => {
    if (!editSub) return;
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/subjects/${editSub.id}/`, { method: "PATCH", body: JSON.stringify({ name: editSub.name, code: editSub.code, is_active: editSub.is_active }) });
      setOk("Subject updated.");
      setEditSub(null);
      await load();
    } catch (e) {
      setOk(null);
      setError(msg(e));
    }
  };
  const doDelete = async () => {
    if (!bye) return;
    const path = bye.kind === "year" ? "academic-years" : bye.kind === "room" ? "classrooms" : "subjects";
    setOk(null);
    setError(null);
    try {
      await api(`/api/v1/${path}/${bye.id}/`, { method: "DELETE" });
      setOk(`Deleted ${bye.label}.`);
      setBye(null);
      await load();
    } catch (e) {
      setOk(null);
      setError(msg(e) + " (Referenced records are protected.)");
      setBye(null);
    }
  };
  const rowBtns = "flex gap-1.5";
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Academic setup", crumbs: ["Home", "Admin", "Academics"] }, error && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(ErrorState, { message: error, onRetry: load })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-3 text-sm text-green-700" }, ok), loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement(Card, { title: `Years (${years.length})` }, /* @__PURE__ */ React.createElement("form", { onSubmit: submitYear, className: "mb-3 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { placeholder: "2025-26", value: yearForm.name, onChange: (e) => setYearForm({ ...yearForm, name: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Start" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: yearForm.start_date, onChange: (e) => setYearForm({ ...yearForm, start_date: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "End" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: yearForm.end_date, onChange: (e) => setYearForm({ ...yearForm, end_date: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Button, { type: "submit" }, "Add year")), years.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No years" }) : /* @__PURE__ */ React.createElement(Table, { caption: "Years", headers: ["Name", "Actions"] }, years.map((y) => /* @__PURE__ */ React.createElement("tr", { key: y.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, y.name, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, y.start_date, " \u2192 ", y.end_date, y.is_active ? " \xB7 active" : "")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { className: rowBtns }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditYear({ ...y }) }, "Edit"), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setBye({ kind: "year", id: y.id, label: y.name }) }, "Delete"))))))), /* @__PURE__ */ React.createElement(Card, { title: `Classes (${rooms.length})` }, /* @__PURE__ */ React.createElement("form", { onSubmit: submitRoom, className: "mb-3 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { placeholder: "Class 10", value: roomForm.name, onChange: (e) => setRoomForm({ ...roomForm, name: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Section" }, /* @__PURE__ */ React.createElement(Input, { value: roomForm.section, onChange: (e) => setRoomForm({ ...roomForm, section: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Year" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Year", className: "rounded-lg border px-3 py-2 text-sm", value: roomForm.academic_year, onChange: (e) => setRoomForm({ ...roomForm, academic_year: e.target.value }) }, years.map((y) => /* @__PURE__ */ React.createElement("option", { key: y.id, value: y.id }, y.name)))), /* @__PURE__ */ React.createElement(Button, { type: "submit" }, "Add class")), rooms.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No classes" }) : /* @__PURE__ */ React.createElement(Table, { caption: "Classes", headers: ["Class", "Actions"] }, rooms.map((c) => /* @__PURE__ */ React.createElement("tr", { key: c.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, c.name, "-", c.section, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, c.academic_year_name ?? "")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { className: rowBtns }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditRoom({ ...c }) }, "Edit"), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setBye({ kind: "room", id: c.id, label: `${c.name}-${c.section}` }) }, "Delete"))))))), /* @__PURE__ */ React.createElement(Card, { title: `Subjects (${subjects.length})` }, /* @__PURE__ */ React.createElement("form", { onSubmit: submitSubject, className: "mb-3 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { placeholder: "Maths", value: subForm.name, onChange: (e) => setSubForm({ ...subForm, name: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Code" }, /* @__PURE__ */ React.createElement(Input, { placeholder: "MATH-10", value: subForm.code, onChange: (e) => setSubForm({ ...subForm, code: e.target.value }), required: true })), /* @__PURE__ */ React.createElement(Button, { type: "submit" }, "Add subject")), subjects.length === 0 ? /* @__PURE__ */ React.createElement(EmptyState, { title: "No subjects" }) : /* @__PURE__ */ React.createElement(Table, { caption: "Subjects", headers: ["Subject", "Actions"] }, subjects.map((s) => /* @__PURE__ */ React.createElement("tr", { key: s.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, s.name, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, s.code)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { className: rowBtns }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditSub({ ...s }) }, "Edit"), /* @__PURE__ */ React.createElement(Button, { variant: "ghost", onClick: () => setBye({ kind: "sub", id: s.id, label: s.name }) }, "Delete")))))))), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: "Edit year",
      open: !!editYear,
      onClose: () => setEditYear(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditYear(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveYear }, "Save"))
    },
    editYear && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { value: editYear.name, onChange: (e) => setEditYear({ ...editYear, name: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "Start" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: editYear.start_date, onChange: (e) => setEditYear({ ...editYear, start_date: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "End" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: editYear.end_date, onChange: (e) => setEditYear({ ...editYear, end_date: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: editYear.is_active, onChange: (e) => setEditYear({ ...editYear, is_active: e.target.checked }) }), " Active year"))
  ), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: "Edit class",
      open: !!editRoom,
      onClose: () => setEditRoom(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditRoom(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveRoom }, "Save"))
    },
    editRoom && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { value: editRoom.name, onChange: (e) => setEditRoom({ ...editRoom, name: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "Section" }, /* @__PURE__ */ React.createElement(Input, { value: editRoom.section, onChange: (e) => setEditRoom({ ...editRoom, section: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: editRoom.is_active, onChange: (e) => setEditRoom({ ...editRoom, is_active: e.target.checked }) }), " Active"))
  ), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: "Edit subject",
      open: !!editSub,
      onClose: () => setEditSub(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setEditSub(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { onClick: saveSub }, "Save"))
    },
    editSub && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { value: editSub.name, onChange: (e) => setEditSub({ ...editSub, name: e.target.value }) })), /* @__PURE__ */ React.createElement(Field, { label: "Code" }, /* @__PURE__ */ React.createElement(Input, { value: editSub.code, onChange: (e) => setEditSub({ ...editSub, code: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: editSub.is_active, onChange: (e) => setEditSub({ ...editSub, is_active: e.target.checked }) }), " Active"))
  ), /* @__PURE__ */ React.createElement(
    Dialog,
    {
      title: bye ? `Delete ${bye.label}?` : "Delete",
      open: !!bye,
      onClose: () => setBye(null),
      actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setBye(null) }, "Cancel"), /* @__PURE__ */ React.createElement(Button, { variant: "danger", onClick: doDelete }, "Delete"))
    },
    "Items referenced by attendance are protected and cannot be deleted \u2014 deactivate them instead."
  ));
}
export {
  AcademicsPage
};
