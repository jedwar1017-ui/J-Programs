# J-Programs — Growth OS project control desk

**Canonical public Growth OS dashboard.** A working, local-first web application for tracking software projects and their real release gates. The public `growth-os` repository is a superseded starter/index, not a second app. Authoritative private project records and Movie Assistant source are in `jedwar1017-ui/Program-creation` (restricted access).

## Features implemented
- Seed list of ten Growth OS software and work areas (editable locally; @Pets is a separate landscape)
- Add project; change lifecycle gate; update an evidence note
- Filter by project name, lane, or verification gate
- JSON backup download and JSON restore with basic schema validation
- Local browser persistence; no account, API key or cloud backend
- Read-only public GitHub Actions monitor for three software repositories, initiated by a button; distinguishes passed, failed, pending and unavailable. It needs internet access when clicked.
- **Download weekly review:** one button saves `j-programs-weekly-review.md`, a Markdown report of every stored project (ignores the search filter) with UTC date, totals, in-progress and evidence-backed verified counts, and each project's lane, stage and evidence note. Missing notes read *Not provided*; verified items are labelled *user-recorded*, never independently audited. Names and notes are escaped so typed text cannot add headings or sections. Made entirely in the browser: no upload, no network, no change to saved data.
- Accessible responsive layout, no external runtime dependency

## Run and test
For local use: `python -m http.server 8000` then visit http://localhost:8000.
On a Node 22+ device: `node --test tests/*.test.mjs`.
The browser stores your project edits **on that browser/device only**. Import/export a JSON backup to move data; exports and weekly reviews may contain private notes and should not be shared publicly.

## Evidence policy
A passing static/code check is not a Windows installation test. Stage names are authoritative only as manually recorded; evidence note is required before declaring a real-world verification. This project is a tracker, not a remote PC access or GitHub synchronization tool.

## Product path
Next: connect a private repo through a secure authenticated backend for read-only commit/test status; only after permissions and threat-model review. The current prototype does not use or request tokens.
