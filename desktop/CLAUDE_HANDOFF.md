# Growth OS Desktop — Claude engineering handoff

## Source of truth
The existing `main` J-Programs web app remains canonical. This branch is for a Windows 11 desktop adaptation, tracked in GitHub issue #3. Preserve the current web interface, tests, data export/import, and CI status monitor. Claude handles production implementation and Windows build/testing; ChatGPT plans, independently reviews and tracks release gates.

## Interim desktop prototype
A portable **Windows PowerShell 5.1 / Windows Forms** app named `GrowthOS_Desktop_Portable.zip` has been provided directly in the ChatGPT conversation. It runs as a native Windows window through `Run_GrowthOS.cmd`, uses local JSON storage, and supports project tracking, evidence notes, import/export and optional public CI checks. It is not committed here or certified on the user's Windows computer. The user can provide this zip to Claude as reference or use it as a temporary offline app.

## Production architecture
Use a minimal **Tauri 2 + WebView2** shell based directly on the existing browser UI (not a second tracker codebase). Preserve browser-local JSON export and compatibility; a new embedded webview has independent storage, so migration must be explicit export/import. No remote scripts in a privileged WebView, local server, API keys or automatic GitHub write access. Add signed/reviewed distribution later if needed; do not call CI-produced unsigned binaries publicly certified releases.

## Definition of done
- Build artifact (Windows x64) from CI, with hash and version
- Project data survives restart; import/export round trip passes Unicode / 200-record boundary
- Evidence guardrail remains enforced
- Github monitoring is opt-in and gracefully handles offline/rate limits
- Keyboard/tab, high DPI and narrow-window usability verified
- Actual Windows 11 user launch, persistence, uninstall/reinstall and recovery verified
- Startup time, idle RAM and installed size recorded and compared to Edge (claims of speed based only on measurement)
- PR to `main` with tests and rollback plan; human approves merge

## Important
The user's finance and personal sensitive details must NOT be put in this public repository. @Pets stays in its independent digital landscape.
