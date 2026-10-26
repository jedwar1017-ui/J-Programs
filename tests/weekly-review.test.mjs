import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEED } from "../registry.mjs";
import { createWeeklyReview } from "../weekly-review.mjs";

const date = new Date("2026-10-25T12:34:00Z");
const make = (records) => createWeeklyReview(records, date);

test("reports eleven representative records (ten seed + one local), not only filtered subset", () => {
  const extra = { id:"local-11", name:"Unfiltered unique project", lane:"build", stage:"idea", evidence:"" };
  const full = [...SEED, extra];
  const result = make(full);
  assert.equal(full.length, 11);
  assert.match(result, /Total projects:\*\* 11/);
  assert.match(result, /### Project 11/);
  assert.match(result, /Unfiltered unique project/);
  assert.match(result, /Earn Now/);
});

test("includes UTC creation time, and represents empty register", () => {
  assert.match(make([]), /2026-10-25 12:34 UTC/);
  assert.match(make([]), /No projects recorded/);
  assert.match(make([]), /Total projects:\*\* 0/);
});

test("missing evidence is explicitly Not provided", () => {
  const text = make([SEED[0]]);
  assert.match(text, /\*\*Evidence \/ blocker\*\*\n\nNot provided/);
  assert.match(text, /Not independently verified/);
});

test("only final stage plus evidence receives user-recorded verification, never audited", () => {
  const records = [
    { ...SEED[0], stage:"real-task-verified", evidence:"Real device test was recorded" },
    { ...SEED[1], stage:"real-task-verified", evidence:"  " },
    { ...SEED[2], stage:"native-built", evidence:"CI compiled" },
    { ...SEED[3], stage:"static-checked", evidence:"Lint passed" },
    { ...SEED[4], stage:"installed", evidence:"Blocker" }
  ];
  const result = make(records);
  assert.match(result, /verified:\*\* 1/);
  assert.match(result, /In progress:\*\* 3/);
  assert.equal((result.match(/User-recorded verification \(not independently audited\)/g) || []).length, 1);
  assert.match(result, /CI compiled/);
});

test("untrusted markdown headings, HTML, tilde fences and Unicode remain literal", () => {
  const name = "Unicode 🦊\n# Fake title\n~~~\n<script>bad</script>";
  const evidence = "Details 👀\n## fake section\n~~~~~~~~~~\n- fake list";
  const text = make([{ ...SEED[0], name, evidence }]);
  assert.ok(text.includes(name));
  assert.ok(text.includes(evidence));
  assert.match(text, /~{4,}\nUnicode/);
  assert.match(text, /~{11,}\nDetails/);
  assert.equal((text.match(/^### Project \d+$/gm) || []).length, 1);
});

test("line endings normalize without dropping content", () => {
  const text = make([{ ...SEED[0], evidence:"first\r\nsecond\rthird" }]);
  assert.ok(text.includes("first\nsecond\nthird"));
  assert.ok(!text.includes("\r"));
});

test("report generation does not mutate records, evidence or lifecycle stage", () => {
  const input = structuredClone(SEED);
  const before = structuredClone(input);
  make(input);
  assert.deepEqual(input, before);
});

test("invalid project records and invalid dates are rejected", () => {
  assert.throws(() => make([{ ...SEED[0], stage:"fake-stage" }]), /Invalid/);
  assert.throws(() => createWeeklyReview(SEED, "not-a-date"), /Invalid report date/);
});

test("browser entry points have a keyboard-operable export button and local report module", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
  assert.match(html, /<button[^>]+id="weekly-review"[^>]*>Download weekly review<\/button>/);
  assert.match(app, /createWeeklyReview\(state\.items\)/);
  assert.match(app, /j-programs-weekly-review\.md/);
  assert.match(app, /URL\.revokeObjectURL/);
});
