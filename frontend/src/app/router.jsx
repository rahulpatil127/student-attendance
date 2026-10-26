import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loading } from "../components/feedback";
import { AuthLayout } from "../layouts/AppShell";
import { SignIn } from "../features/auth/SignIn";
import { Landing } from "../features/landing/Landing";
import { Dashboard, Forbidden, NotFound } from "../features/dashboard/Dashboard";
import { DesignSystem } from "../features/design/DesignSystem";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { UsersPage } from "../features/admin/UsersPage";
import { AcademicsPage } from "../features/admin/AcademicsPage";
import { AssignmentsPage } from "../features/admin/AssignmentsPage";
import { TeachersPage } from "../features/admin/TeachersPage";
import { ComplaintsQueue } from "../features/admin/ComplaintsQueue";
import { TeacherDashboard } from "../features/teacher/TeacherDashboard";
import { AttendancePage } from "../features/teacher/AttendancePage";
import { DailyAttendancePage } from "../features/teacher/DailyAttendancePage";
import { StudentDashboard } from "../features/student/StudentDashboard";
import { ComplaintsPage } from "../features/student/ComplaintsPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { isAdminUser } from "../types";
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return /* @__PURE__ */ React.createElement(AuthLayout, null, /* @__PURE__ */ React.createElement(Loading, { label: "Restoring session\u2026" }));
  if (!user) return /* @__PURE__ */ React.createElement(Navigate, { to: "/sign-in", replace: true });
  return children;
}
function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return /* @__PURE__ */ React.createElement(AuthLayout, null, /* @__PURE__ */ React.createElement(Loading, null));
  if (!user) return /* @__PURE__ */ React.createElement(Navigate, { to: "/sign-in", replace: true });
  if (!roles.includes(user.role) && !isAdminUser(user)) return /* @__PURE__ */ React.createElement(Forbidden, null);
  return children;
}
function Home() {
  const { user, loading } = useAuth();
  if (loading) return /* @__PURE__ */ React.createElement(AuthLayout, null, /* @__PURE__ */ React.createElement(Loading, null));
  if (!user) return /* @__PURE__ */ React.createElement(Landing, null);
  if (isAdminUser(user)) return /* @__PURE__ */ React.createElement(AdminDashboard, null);
  if (user.role === "TEACHER") return /* @__PURE__ */ React.createElement(TeacherDashboard, null);
  return /* @__PURE__ */ React.createElement(StudentDashboard, null);
}
function Router() {
  return /* @__PURE__ */ React.createElement(Routes, null, /* @__PURE__ */ React.createElement(Route, { path: "/sign-in", element: /* @__PURE__ */ React.createElement(SignIn, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/forbidden", element: /* @__PURE__ */ React.createElement(Forbidden, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/", element: /* @__PURE__ */ React.createElement(Home, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/design", element: /* @__PURE__ */ React.createElement(RequireAuth, null, /* @__PURE__ */ React.createElement(DesignSystem, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(AdminDashboard, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin/users", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(UsersPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin/academics", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(AcademicsPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin/teachers", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(TeachersPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin/assignments", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(AssignmentsPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin/complaints", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["ADMIN"] }, /* @__PURE__ */ React.createElement(ComplaintsQueue, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/teacher/daily/:classroomId", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["TEACHER"] }, /* @__PURE__ */ React.createElement(DailyAttendancePage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/teacher/classes/:classroomId", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["TEACHER"] }, /* @__PURE__ */ React.createElement(AttendancePage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/complaints", element: /* @__PURE__ */ React.createElement(RequireRole, { roles: ["STUDENT"] }, /* @__PURE__ */ React.createElement(ComplaintsPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/reports", element: /* @__PURE__ */ React.createElement(RequireAuth, null, /* @__PURE__ */ React.createElement(ReportsPage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/profile", element: /* @__PURE__ */ React.createElement(RequireAuth, null, /* @__PURE__ */ React.createElement(ProfilePage, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/dashboard", element: /* @__PURE__ */ React.createElement(RequireAuth, null, /* @__PURE__ */ React.createElement(Dashboard, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "*", element: /* @__PURE__ */ React.createElement(NotFound, null) }));
}
export {
  Router
};
