# RideGems — Phase 0 Setup Summary (Plumbing)

Completed: July 27, 2026

## Goal of Phase 0
Prove the whole pipeline works before building real features: **edit code → push to GitHub → auto-deploy live on Vercel.**

✅ **Phase 0 is complete.**

---

## Accounts created
1. **GitHub** — github.com — username: `danhorRG`
   - Free plan (default, no setup needed)
   - This is where the project's code lives
2. **Vercel** — vercel.com
   - Signed up via "Continue with GitHub" (auto-linked)
   - Hobby (free) plan
   - Hosts the live site
3. **Supabase** — supabase.com
   - Account/org created, no project created yet (that happens in Phase 2)
   - Will hold the database
4. **MapTiler** — maptiler.com
   - Free tier account created, API key available in dashboard when needed
   - Will provide map tiles (Phase 1)

## Software installed (Windows machine)
- **Git for Windows** — git-scm.com/downloads/win
- **Claude Code** — installed via:
  ```powershell
  irm https://claude.ai/install.ps1 | iex
  ```
  - Installed to `C:\Users\danho\.local\bin\claude.exe`
  - Had to manually add this folder to the Windows **PATH** (System Properties → Advanced → Environment Variables → User PATH → New) so the `claude` command would be recognized in any terminal
- **Node.js LTS** — installed automatically by Claude Code via winget during project setup

## Project created
- **Location:** `F:\Projects\ridegems`
- **Stack:** Next.js, TypeScript, Tailwind CSS, ESLint, App Router, `src/` directory
- Git repository initialized locally, initial commit made
- Connected to GitHub remote: **https://github.com/danhorRG/ridegems**
- Pushed to `main` branch, tracking set up

## Deployment
- Project imported into Vercel from GitHub (`Add New` → `Project` → import `ridegems`)
- Vercel auto-detected Next.js settings, no manual config needed
- First deploy succeeded — live at a `*.vercel.app` URL showing the default Next.js starter page ("Congratulations!" screen)

## Key concepts learned
- **PATH**: the list of folders Windows checks when you type a command, so it can find the program
- **Terminal / PowerShell prompt** (`PS C:\Users\danho>`): just shows you're ready for input, not something to delete
- **Personal Access Token / browser auth**: how GitHub verifies who you are when pushing code from a tool instead of a password
- **node_modules**: a folder of code libraries a project depends on — this is what actually takes up disk space, not Claude Code itself

## What's next: Phase 1 — Static map & filters
- Interactive map with a handful of hand-entered sample routes, mobile-first
- Filter UI: difficulty / distance / elevation / surface, working against the static sample set
- Will use the MapTiler API key set up today
