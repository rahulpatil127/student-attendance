import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../../layouts/AppShell";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, Field, Input } from "../../components/ui";
function SignIn() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setFormError("Enter both username and password.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch {
      setFormError("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ React.createElement(AuthLayout, null, /* @__PURE__ */ React.createElement(Card, { title: "Sign in", subtitle: "Use the account provisioned by your administrator." }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "flex flex-col gap-4", noValidate: true }, /* @__PURE__ */ React.createElement(Field, { label: "Username", error: void 0 }, /* @__PURE__ */ React.createElement(Input, { id: "username", autoComplete: "username", value: username, onChange: (e) => setUsername(e.target.value), required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Password" }, /* @__PURE__ */ React.createElement(Input, { id: "password", type: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), required: true })), (formError || error) && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-red-600" }, formError ?? error), /* @__PURE__ */ React.createElement(Button, { type: "submit", loading: busy }, "Sign in"))));
}
export {
  SignIn
};
