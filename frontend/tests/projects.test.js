import test from "node:test";
import assert from "node:assert/strict";
import { safeProjectLink, projectTypes } from "../src/utils/projects.js";
import { contentSecurityPolicy } from "../security-policy.js";
test("project actions never render executable or credential-bearing URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.test",
    "https://user:pass@example.com",
    {},
    "",
  ])
    assert.equal(safeProjectLink(value), "");
  assert.equal(
    safeProjectLink("https://github.com/user/repo"),
    "https://github.com/user/repo",
  );
  assert.equal(Object.keys(projectTypes).length, 5);
});

test("built frontend CSP limits scripts and includes only the configured API origin", () => {
  const policy = contentSecurityPolicy("https://api.example.com/api");
  assert.match(policy, /script-src 'self';/);
  assert.match(policy, /connect-src 'self' https:\/\/api.example.com /);
  assert.match(policy, /object-src 'none'/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.throws(() => contentSecurityPolicy("javascript:alert(1)"));
  assert.throws(() => contentSecurityPolicy("https://user:pass@example.com"));
});
