function isAdminUser(u) {
  return !!u && (u.role === "ADMIN" || u.is_superuser === true);
}
function unwrap(data) {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
export {
  isAdminUser,
  unwrap
};
