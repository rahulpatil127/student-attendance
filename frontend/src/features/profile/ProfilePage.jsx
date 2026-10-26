import React from "react";
import { useEffect, useState } from "react";
import { AppShell } from "../../layouts/AppShell";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, Field, Input } from "../../components/ui";
import { ErrorState, Loading } from "../../components/feedback";
function ProfilePage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollError, setEnrollError] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [ok, setOk] = useState(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setEnrollError(null);
      try {
        if (user?.role === "STUDENT" && !user?.is_superuser) {
          const e = await api("/api/v1/students/me/enrollments/");
          if (!cancelled) setEnrollments(e);
        } else {
          if (!cancelled) setEnrollments([]);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            setEnrollError("Session expired. Please sign in again.");
          } else {
            setEnrollError(e instanceof ApiError ? e.message : "Failed to load enrollments.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.is_superuser]);
  const changePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setOk(null);
    setBusy(true);
    try {
      await api("/api/v1/auth/password/change/", { method: "POST", body: JSON.stringify({ old_password: oldPw, new_password: newPw }) });
      setOk("Password updated.");
      setOldPw("");
      setNewPw("");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ React.createElement(AppShell, { title: "Profile", crumbs: ["Home", "Profile"] }, loading ? /* @__PURE__ */ React.createElement(Loading, null) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, { title: user?.username ?? "Profile", subtitle: `${user?.role} \xB7 ${user?.email}` }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, "Name: ", user?.first_name, " ", user?.last_name), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-mono text-xs text-primary-700" }, "ID: ", user?.student_number || user?.employee_number || "—"), user?.role === "STUDENT" && !user?.is_superuser && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-slate-800" }, "Enrollments (", enrollments.length, ")"), enrollError ? /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-red-600" }, enrollError) : enrollments.map((en) => /* @__PURE__ */ React.createElement("p", { key: en.id }, en.classroom_display ?? `Class ${en.classroom}`, " \u2014 ", en.status)))), /* @__PURE__ */ React.createElement(Card, { title: "Change password", subtitle: "Min 8 chars, validated server-side." }, pwError && /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement(ErrorState, { message: pwError })), ok && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mb-2 text-sm text-green-700" }, ok), /* @__PURE__ */ React.createElement("form", { onSubmit: changePassword, className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Current password" }, /* @__PURE__ */ React.createElement(Input, { type: "password", value: oldPw, onChange: (ev) => setOldPw(ev.target.value), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "New password" }, /* @__PURE__ */ React.createElement(Input, { type: "password", value: newPw, onChange: (ev) => setNewPw(ev.target.value), required: true })), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: busy }, "Update")))));
}
export {
  ProfilePage
};
