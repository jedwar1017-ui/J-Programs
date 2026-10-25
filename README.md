# J-Programs — Growth OS project control desk

A working, **local-first web application** for tracking software projects and their real release gates.

## Features implemented
- Seed list of eleven Growth OS areas (editable locally)
- Add project; change lifecycle gate; update an evidence note
- Filter by project name, lane, or verification gate
- JSON backup download and JSON restore with basic schema validation
- Local browser persistence; no account, API key or cloud backend
- Read-only public GitHub Actions monitor for four repositories, initiated by a button; distinguishes passed, failed, pending and unavailable. It needs internet access when clicked.
- Accessible responsive layout, no external runtime dependency

## Run and test
For local use: `python -m http.server 8000` then visit http://localhost:8000.
On a Node 22+ device: `node --test tests/*.test.mjs`.
The browser stores your project edits **on that browser/device only**. Import/export a JSON backup to move data; exports may contain private notes and should not be shared publicly.

## Evidence policy
A passing static/code check is not a Windows installation test. Stage names are authoritative only as manually recorded; evidence note is required before declaring a real-world verification. This project is a tracker, not a remote PC access or GitHub synchronization tool.

## Product path
Next: connect a private repo through a secure authenticated backend for read-only commit/test status; only after permissions and threat-model review. The current prototype does not use or request tokens.
