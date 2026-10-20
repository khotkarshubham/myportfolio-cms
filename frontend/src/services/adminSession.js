// Display-only account details. The server's HttpOnly cookie authorizes requests.
const values = new Map();
export const adminSession = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
};

// Remove keys written by previous releases without relying on browser storage.
for (const name of ["localStorage", "sessionStorage"]) {
  try {
    for (const key of ["admin_token", "admin_role", "admin_email", "profile_updated_at"]) window[name].removeItem(key);
  } catch { /* Storage can be disabled by the browser. */ }
}
