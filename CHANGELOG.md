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

### [Changed] - 2026-06-15T16:30:00 - Switched to OpenAI-only with gpt-5.4

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