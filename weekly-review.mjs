// Weekly Project Review: builds a readable Markdown report from the local register.
// Pure function: no DOM, no network, never mutates its input.
import {validate, summarize, isSoftwareProject} from "./registry.mjs";

export const REVIEW_FILENAME = "j-programs-weekly-review.md";

const UNVERIFIED_STAGES = new Set(["static-checked", "native-built"]);

// Backslash-escape every ASCII punctuation character (CommonMark allows this for all of
// them). User text then cannot create headings, lists, quotes, code fences, tables,
// links, HTML or setext underlines; it always renders as the literal characters typed.
export function escapeMarkdown(text) {
  return String(text).replace(/[!-\/:-@\[-`{-~]/g, "\\$&");
}

// Normalise text before escaping:
// - Unicode line/paragraph separators (U+2028, U+2029, NEL U+0085) become real line breaks,
//   so editors that split on them cannot see an unescaped "# heading" line.
// - Bidi embedding/override/isolate controls are removed so text cannot be visually reordered.
// - Other control characters and lone surrogates become U+FFFD, so nothing is dropped silently.
function clean(text) {
  return String(text)
    .replace(/\r\n?|[\u0085\u2028\u2029]/g, "\n")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
}

// Single-line form for names used inside a heading.
export function inlineText(text) {
  return escapeMarkdown(clean(text).replace(/\s+/g, " ").trim());
}

// Multi-line note as a block quote; each line is escaped and line breaks are kept.
export function quotedBlock(text) {
  const lines = clean(text).replace(/^\n+|\n+$/g, "").split("\n").map(line => escapeMarkdown(line.replace(/\s+$/, "")));
  return lines.map((line, i) => {
    const next = lines[i + 1];
    const hardBreak = next !== undefined && next !== "" && line !== "" ? "\\" : "";
    return "> " + line + hardBreak;
  }).join("\n").replace(/> $/gm, ">");
}

function verificationLabel(project) {
  const hasEvidence = project.evidence.trim().length > 0;
  if (project.stage === "real-task-verified") {
    return hasEvidence ? "User-recorded verification (not independently audited)"
      : "Marked verified but no evidence given — not counted as verified";
  }
  if (UNVERIFIED_STAGES.has(project.stage)) return "Not real-device tested (a " + project.stage + " stage is not a device test)";
  return "Not verified";
}

export function formatUtc(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw Error("Invalid report date");
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

// items: the full local register (not the filtered view). now: report time.
export function buildWeeklyReview(items, now = new Date()) {
  const records = validate(items).filter(isSoftwareProject);
  const s = summarize(records);
  const out = [
    "# J-Programs weekly review",
    "",
    "Generated: " + formatUtc(now),
    "",
    "## Summary",
    "",
    "- Total projects: " + s.total,
    "- In progress: " + s.inProgress,
    "- Verified with evidence: " + s.verified + " (user-recorded, not independently audited)",
    "",
    "Stages such as static checked or native built mean code checks only, not a real-device test.",
    "",
    "## Projects",
  ];
  if (!records.length) out.push("", "No projects are stored in this browser.");
  records.forEach((p, i) => {
    out.push(
      "",
      "### " + (i + 1) + ". " + (inlineText(p.name) || "Untitled"),
      "",
      "- Lane: " + p.lane,
      "- Stage: " + p.stage.replaceAll("-", " "),
      "- Verification: " + verificationLabel(p),
      "- Evidence or blocker:",
      "",
      p.evidence.trim() ? quotedBlock(p.evidence) : "> Not provided",
    );
  });
  out.push("", "---", "", "Made offline from data stored in this browser. Nothing was uploaded. Keep this file private if notes are personal.", "");
  return out.join("\n");
}
