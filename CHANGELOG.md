# Changelog

All notable changes to this project will be documented in this file.

Based on [Keep a Changelog](https://keepachangelog.com/) • Uses [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) timestamps

---

## [Unreleased]



<!--
=======================================================
  📝 ADD NEW ENTRIES BELOW THIS LINE
=======================================================
-->

### [Security] - 2026-06-15T18:00:00 - Added security headers and error boundary

**[Hardened production config: security headers, global error boundary, removed unused dependency]**

- **Why**: Production-readiness audit (The Closer) identified missing hardening
- **What**: Added 6 HTTP security headers (HSTS, X-Frame-Options, etc.) to next.config.ts, disabled X-Powered-By and production source maps, created global error.tsx with styled "Court Adjourned" UI, removed unused @supabase/supabase-js
- **Files**: `next.config.ts`, `src/app/error.tsx`, `package.json`
- **Impact**: Production app now sets security headers on every response and gracefully handles runtime errors

### [Fixed] - 2026-06-15T18:00:00 - TypeScript type escapes and code quality

**[Fixed 4 type escapes, removed unused import, updated outdated comment]**

- **Why**: `window as any`, `as React.CSSProperties`, and outdated comments reduce code quality
- **What**: Fixed webkitAudioContext type escape with typed property access, replaced CSSProperties type assertions with intersection types, removed unused useRef import, updated store.ts comment
- **Files**: `src/components/court-components.tsx`, `src/app/verdict/[id]/page.tsx`, `src/lib/store.ts`
- **Impact**: Cleaner types across the codebase, no `any` escapes in non-validation code

<!--
=======================================================
  📝 ADD NEW ENTRIES ABOVE THIS LINE
-->

**[Removed all Anthropic code, set OpenAI gpt-5.4 as the only AI model]**

- **Why**: User requested OpenAI only, no Anthropic
- **What**: Removed `generateWithClaude()` function and all Anthropic API references from the trial generation route
- **Files**: `src/app/api/trial/route.ts`
- **Impact**: Cleaner codebase, single AI provider

### [Added] - 2026-06-15T16:00:00 - Character image infrastructure with SVG fallback

**[Added CharacterImage component for user-created portraits and decorative assets]**

- **Why**: User wants to replace SVG character portraits with their own images
- **What**: Created CharacterImage wrapper + inline image fallback for CourtSeal, InteractiveGavel, CourtroomBackground, and all 4 portrait components
- **Files**: `src/components/court-components.tsx`, `public/images/.gitkeep`
- **Impact**: Users can drop PNG files into public/images/ to auto-replace SVGs

<!--
=======================================================
  📝 ADD NEW ENTRIES ABOVE THIS LINE
-->

---

## Release History

<!-- Move entries here when releasing versions -->