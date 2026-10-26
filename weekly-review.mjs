import { validate, summarize } from "./registry.mjs";

// Keep user-supplied names and evidence inside Markdown code fences.
// A dynamically long tilde fence prevents text from closing the block.
function literalBlock(value) {
  const content = String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "\uFFFD");
  const longest = (content.match(/~+/g) || []).reduce((n, hit) => Math.max(n, hit.length), 0);
  const fence = "~".repeat(Math.max(3, longest + 1));
  return fence + "\n" + content + "\n" + fence;
}

export function createWeeklyReview(input, createdAt = new Date()) {
  const items = validate(input);
  const stamp = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(stamp.getTime())) throw new TypeError("Invalid report date");
  const count = summarize(items);
  const lines = [
    "# J-Programs Weekly Project Review",
    "",
    "Created (UTC): " + stamp.toISOString().replace("T", " ").slice(0, 16) + " UTC",
    "",
    "- **Total projects:** " + count.total,
    "- **In progress:** " + count.inProgress,
    "- **Evidence-backed, user-recorded verified:** " + count.verified,
    "",
    "Verification is user-recorded and not independently audited. Code or cloud build checks alone do not establish device functionality.",
    "This report includes all locally stored records, regardless of the current search filter, and may contain private notes.",
    ""
  ];
  if (items.length === 0) lines.push("No projects recorded.", "");
  for (const [index, project] of items.entries()) {
    const hasEvidence = project.evidence.trim().length > 0;
    const verified = project.stage === "real-task-verified" && hasEvidence;
    lines.push(
      "### Project " + (index + 1),
      "",
      "**Name**",
      "",
      literalBlock(project.name),
      "",
      "- **Lane:** " + project.lane,
      "- **Stage:** " + project.stage,
      "- **Verification:** " + (verified ? "User-recorded verification (not independently audited)" : "Not independently verified"),
      "",
      "**Evidence / blocker**",
      "",
      hasEvidence ? literalBlock(project.evidence) : "Not provided",
      ""
    );
  }
  return lines.join("\n").trimEnd() + "\n";
}
