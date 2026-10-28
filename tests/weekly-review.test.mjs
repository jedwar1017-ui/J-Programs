import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SEED} from "../registry.mjs";
import {buildWeeklyReview, escapeMarkdown, quotedBlock, formatUtc, REVIEW_FILENAME} from "../weekly-review.mjs";

const NOW = new Date("2026-10-26T22:50:30Z");
const copy = items => items.map(x => ({...x}));
const headings = md => md.split("\n").filter(l => /^ {0,3}#{1,6}(\s|$)/.test(l));
const projectHeadings = md => headings(md).filter(l => l.startsWith("### "));
// Setext headings: a non-blank line followed by a line of only = or - characters.
const setextUnderlines = md => md.split("\n").filter((l, i, a) => /^ {0,3}(=+|-+)\s*$/.test(l) && i > 0 && a[i - 1].trim() !== "" && l.trim() !== "---");

test("filename is fixed", () => assert.equal(REVIEW_FILENAME, "j-programs-weekly-review.md"));

test("full seed register: every project listed with counts and UTC date", () => {
  const md = buildWeeklyReview(copy(SEED), NOW);
  assert.match(md, /^# J-Programs weekly review\n/);
  assert.match(md, /Generated: 2026-10-26 22:50 UTC/);
  assert.match(md, new RegExp("Total projects: " + SEED.length));
  assert.match(md, /In progress: 0/);
  assert.match(md, /Verified with evidence: 0/);
  assert.equal(projectHeadings(md).length, SEED.length);
  for (const p of SEED) assert.ok(md.includes(escapeMarkdown(p.name)), p.name);
  assert.equal((md.match(/> Not provided/g) || []).length, SEED.length);
});

test("eleven-project register includes a user-added project", () => {
  const items = [...copy(SEED), {id: "local-1", name: "Weekend Kiosk", lane: "income", stage: "source-ready", evidence: "Draft only"}];
  assert.equal(items.length, 11);
  const md = buildWeeklyReview(items, NOW);
  assert.equal(projectHeadings(md).length, 11);
  assert.match(md, /### 11\. Weekend Kiosk/);
  assert.match(md, /Total projects: 11/);
  assert.match(md, /In progress: 1/);
});

test("lane, stage and evidence shown for each project", () => {
  const md = buildWeeklyReview([{id: "a", name: "Movie Assistant", lane: "build", stage: "native-built", evidence: "CI run 123 passed"}], NOW);
  assert.match(md, /- Lane: build/);
  assert.match(md, /- Stage: native built/);
  assert.match(md, /> CI run 123 passed/);
});

test("empty or whitespace-only evidence reads Not provided", () => {
  const md = buildWeeklyReview([{id: "a", name: "A", lane: "build", stage: "idea", evidence: "   \n  "}], NOW);
  assert.match(md, /> Not provided/);
});

test("verified only with evidence, labelled user-recorded, never independently audited", () => {
  const md = buildWeeklyReview([
    {id: "a", name: "Done", lane: "build", stage: "real-task-verified", evidence: "Played a movie in VLC on my PC"},
    {id: "b", name: "Claimed", lane: "build", stage: "real-task-verified", evidence: ""},
  ], NOW);
  assert.match(md, /Verified with evidence: 1 \(user-recorded, not independently audited\)/);
  assert.match(md, /Verification: User-recorded verification \(not independently audited\)/);
  assert.match(md, /Marked verified but no evidence given — not counted as verified/);
  assert.doesNotMatch(md, /independently (verified|audited result)/i);
});

test("static-checked and native-built are never presented as device tests", () => {
  const md = buildWeeklyReview([
    {id: "a", name: "S", lane: "build", stage: "static-checked", evidence: "lint ok"},
    {id: "b", name: "N", lane: "build", stage: "native-built", evidence: "exe built"},
  ], NOW);
  assert.equal((md.match(/Not real-device tested/g) || []).length, 2);
  assert.doesNotMatch(md, /User-recorded verification/);
});

test("markdown injection in names and notes cannot create headings or sections", () => {
  const evil = [
    {id: "a", name: "# Fake heading\n## Another", lane: "build", stage: "idea",
      evidence: "## Injected section\n### 99. Fake project\n- Stage: real task verified\n```\ncode\n```\n<script>alert(1)</script>\n[link](javascript:alert(1))\n| a | b |\nUnderline\n===\nNext\n---\n> quote"},
    {id: "b", name: "Normal", lane: "create", stage: "idea", evidence: ""},
  ];
  const md = buildWeeklyReview(evil, NOW);
  const h = headings(md);
  assert.deepEqual(h, ["# J-Programs weekly review", "## Summary", "## Projects", "### 1. \\# Fake heading \\#\\# Another", "### 2. Normal"]);
  assert.deepEqual(setextUnderlines(md), []);
  assert.ok(!md.includes("<script>"));
  assert.ok(!/^```/m.test(md));
  assert.ok(!/^- Stage: real task verified/m.test(md));
  // Every injected line stays inside the quoted evidence block.
  const block = md.split("- Evidence or blocker:")[1].split("### 2.")[0].trim().split("\n");
  for (const line of block) assert.ok(line.startsWith(">"), line);
});

test("unicode and line breaks are preserved readably", () => {
  const md = buildWeeklyReview([{id: "a", name: "Café 🎬 プロジェクト", lane: "create", stage: "idea", evidence: "Línea uno ✅\nLine two 🚧\n\nAfter blank"}], NOW);
  assert.match(md, /### 1\. Café 🎬 プロジェクト/);
  assert.match(md, /> Línea uno ✅\\\n> Line two 🚧\n>\n> After blank/);
});

test("control characters are replaced visibly, not silently dropped", () => {
  assert.equal(quotedBlock("a\u0000b\u001Bc\u0090d"), "> a\uFFFDb\uFFFDc\uFFFDd");
});

test("does not mutate the register", () => {
  const items = [{id: "a", name: "A *b*", lane: "build", stage: "real-task-verified", evidence: "x"}, ...copy(SEED)];
  const before = JSON.stringify(items);
  Object.freeze(items); items.forEach(Object.freeze);
  buildWeeklyReview(items, NOW);
  assert.equal(JSON.stringify(items), before);
});

test("legacy @Pets record is kept out of the software report, matching the dashboard", () => {
  const md = buildWeeklyReview([...copy(SEED), {id: "p", name: "@Pets", lane: "create", stage: "idea", evidence: ""}], NOW);
  assert.doesNotMatch(md, /Pets/);
  assert.match(md, new RegExp("Total projects: " + SEED.length));
});

test("empty register still produces a valid report", () => {
  const md = buildWeeklyReview([], NOW);
  assert.match(md, /Total projects: 0/);
  assert.match(md, /No projects are stored in this browser/);
});

test("invalid register or date is rejected, not silently exported", () => {
  assert.throws(() => buildWeeklyReview([{id: "a"}], NOW), /Invalid/);
  assert.throws(() => formatUtc("not a date"), /Invalid report date/);
});

test("page wiring: button exists beside backup controls and app uses full register with no network", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
  const review = readFileSync(new URL("../weekly-review.mjs", import.meta.url), "utf8");
  assert.match(html, /id="backup"[^>]*>Export backup<\/button><button id="weekly-review" type="button">Download weekly review<\/button>/);
  assert.match(app, /buildWeeklyReview\(state\.items\)/);
  assert.match(app, /revokeObjectURL\(url\)/);
  assert.doesNotMatch(review + app, /fetch\(|XMLHttpRequest|localStorage\.setItem\([^)]*review/i);
});

test("Unicode line separators cannot smuggle a heading onto its own line", () => {
  for (const sep of ["\u2028", "\u2029", "\u0085"]) {
    const md = buildWeeklyReview([{...SEED[0], name: "Safe" + sep + "# Fake name", evidence: "ok" + sep + "## Fake note"}], NOW);
    assert.ok(!/[\u2028\u2029\u0085]/.test(md), "separator must not survive");
    assert.equal(md.split("\n").filter(l => /^ {0,3}#{1,6}(\s|$)/.test(l)).length, 4);
    assert.match(md, /^### 1\. Safe \\# Fake name$/m);
    assert.match(md, /^> ok\\$\n^> \\#\\# Fake note$/m);
  }
});

test("bidi override controls are removed so text cannot be visually reordered", () => {
  const md = buildWeeklyReview([{...SEED[0], name: "Report \u202Etxt.exe", evidence: "\u2066note\u2069 שלום"}], NOW);
  assert.ok(!/[\u202A-\u202E\u2066-\u2069]/.test(md));
  assert.match(md, /Report txt\\\.exe/);
  assert.match(md, /> note שלום/);
});

test("fuzzed hostile text never adds headings, setext underlines or unquoted note lines", () => {
  const chars = [..."#=-*_`~>|[]()!<&\\\n \t🦊é"], seps = ["\u2028", "\u2029", "\u0085", "\r", "\u202E"];
  let seed = 7; const rand = n => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  for (let i = 0; i < 2000; i++) {
    let t = "x"; const len = 1 + rand(60);
    for (let j = 0; j < len; j++) t += rand(8) ? chars[rand(chars.length)] : seps[rand(seps.length)];
    const md = buildWeeklyReview([{...SEED[0], name: t.slice(0, 100), evidence: t}, SEED[1]], NOW);
    const lines = md.split("\n");
    assert.equal(lines.filter(l => /^ {0,3}#{1,6}(\s|$)/.test(l)).map(l => l.match(/#+/)[0].length).join(), "1,2,2,3,3", t);
    lines.forEach((l, k) => assert.ok(!/^ {0,3}(=+|-+)\s*$/.test(l) || (l === "---" && lines[k - 1] === ""), t));
    const start = lines.indexOf("- Evidence or blocker:") + 2;
    for (let k = start; lines[k] !== "" && k < lines.length; k++) assert.ok(lines[k].startsWith(">"), t);
  }
});
