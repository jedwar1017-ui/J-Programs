# AI Build-Off · ChatGPT vs Claude
**Project:** J-Programs Growth OS. **Scope:** First controlled experiment; other repositories remain unchanged.
**Canonical release:** `main` only after a human-reviewed pull request.

## The same challenge for both AIs
Implement an offline **Weekly Project Review** feature in the existing local-first project dashboard. A user should be able to generate and download a readable Markdown progress report from **all locally stored projects**, not only those matching the search filter. No cloud API, login, network request or new dependency may be added.

### Required outcomes
1. Add a keyboard-operable `Download weekly review` button beside existing backup controls, usable at 375 px mobile width.
2. On click, generate a UTF-8 Markdown file `j-programs-weekly-review.md` reflecting the current local register, with creation date; total, in-progress and *evidence-backed* verified counts; and one subsection for each project showing name, lane, stage, and its evidence/blocker note.
3. Missing evidence must read **Not provided**. Never imply a real-device test happened just because a stage says `static-checked` or `native-built`. If marked `real-task-verified` with evidence, label it **User-recorded verification**—not an independently audited result.
4. Names/notes can include Unicode, line breaks, markdown formatting and arbitrary user text. Output must retain readable content without allowing a project name to create unintended report headings/sections. Prevent report text from introducing unexpected structural headings through untrusted input.
5. The report reflects the full live register even if the UI is filtered and must NOT modify the register, stage, search, or saved data.
6. Use the browser's existing Blob + download pattern; revoke object URLs, with accessible success/error status. No confidential note is uploaded anywhere.
7. Add zero-dependency `node --test` coverage for representative cases: 11 seed projects, empty evidence, verified-vs-unverified, Unicode/Markdown injection, and immutability. Existing tests must still pass.
8. Update README with accurate feature and privacy limitations.

### Identical starting line
Two branches fork from a single reviewed `main` commit:
- `ai/claude`
- `ai/chatgpt`

**Phase A: Independent design.** Each AI works only on its own branch and runs the same acceptance conditions. Do not copy the other branch before first test submission if a fair head-to-head is wanted.
**Phase B: Cross-review.** After both submit, both AIs may read, critique and adapt the other's approach. Sharing *after* first submission improves quality.
**Phase C: Release.** Compare branches with real GitHub diff, unit tests, edge cases, mobile/browser QA and maintenance. User reviews final pull request into `main`. Never merge both branches blindly.

### Neutral 100-point rubric
- 35: Required behavior and export output (tested)
- 25: Test coverage and edge cases
- 15: Privacy/security and evidence honesty
- 15: Mobile + keyboard usability (real-browser QA)
- 10: Simplicity/maintainability

Scores are awarded from observed evidence, not model identity. Equal test results may yield a tie. Neither AI may self-certify real mobile testing without evidence.

### Branch / release rules
- Make changes only in your own `ai/*` branch.
- Keep `main` stable; no force-push or history rewrite, and no automatic merges.
- Each proposal: code diff, tests, risks, and a PR targeted at `main` when ready.
- CI green ≠ live deployment; preserve evidence boundaries.
- Do not commit API keys, personal financial information, or private logs into this public repo.
