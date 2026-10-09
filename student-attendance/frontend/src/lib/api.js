const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
const SESSION_EXPIRED_EVENT = "attendance:session-expired";
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}
async function ensureCsrf() {
  let token = getCookie("csrftoken");
  if (token) return token;
  await fetch(`${BASE}/api/v1/auth/csrf/`, { credentials: "include" });
  token = getCookie("csrftoken");
  return token;
}
class ApiError extends Error {
  status;
  payload;
  constructor(status, payload) {
    super(typeof payload === "object" && payload && "detail" in payload ? String(payload.detail) : `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}
async function api(path, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers ?? {}
  };
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = await ensureCsrf() ?? getCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  if (res.status === 401) {
    if (path !== "/api/v1/auth/me/") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { status: res.status, path } }));
    }
  }
  if (res.status === 204) return void 0;
  const text = await res.text();
  const data = text ? JSON.parse(text) : void 0;
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
function apiBase() {
  return BASE || "(same-origin proxy)";
}
export {
  ApiError,
  SESSION_EXPIRED_EVENT,
  api,
  apiBase,
  ensureCsrf
};
