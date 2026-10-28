import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {webFiles} from "../desktop/prepare-web.mjs";

const read = p => JSON.parse(readFileSync(new URL("../desktop/src-tauri/" + p, import.meta.url), "utf8"));
const conf = read("tauri.conf.json");
const caps = read("capabilities/default.json");

test("desktop bundles exactly the web app files the page loads", () => {
  assert.deepEqual(webFiles(), ["app.mjs", "github-status.mjs", "index.html", "registry.mjs", "weekly-review.mjs"]);
});
test("installer is per-user (no admin) and the app loads local files only", () => {
  assert.equal(conf.bundle.windows.nsis.installMode, "currentUser");
  assert.equal(conf.build.frontendDist, "../web-dist");
  assert.equal(conf.build.devUrl, undefined);
});
test("content security policy blocks remote scripts and only allows GitHub API calls", () => {
  const csp = conf.app.security.csp;
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /connect-src 'self' https:\/\/api\.github\.com;/);
  assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*https?:/);
});
test("page permissions: core events and https links only (no files, shell or http plugin)", () => {
  const ids = caps.permissions.map(p => typeof p === "string" ? p : p.identifier);
  assert.deepEqual(ids, ["core:default", "opener:allow-open-url"]);
  assert.deepEqual(caps.permissions[1].allow, [{url: "https://*"}]);
});
