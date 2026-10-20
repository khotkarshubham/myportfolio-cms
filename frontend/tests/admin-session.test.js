import test from "node:test";
import assert from "node:assert/strict";

test("admin display state works when browser storage is disabled and does not persist", async () => {
  globalThis.window = new Proxy({}, { get() { throw new Error("Storage disabled"); } });
  try {
    const { adminSession } = await import("../src/services/adminSession.js");
    assert.equal(adminSession.getItem("admin_role"), null);
    adminSession.setItem("admin_role", "editor");
    assert.equal(adminSession.getItem("admin_role"), "editor");
    const freshModule = await import("../src/services/adminSession.js?new-page");
    assert.equal(freshModule.adminSession.getItem("admin_role"), null);
    adminSession.clear();
    assert.equal(adminSession.getItem("admin_role"), null);
  } finally { delete globalThis.window; }
});
