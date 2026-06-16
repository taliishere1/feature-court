# Architecture Decision Records (ADRs)

> Document significant technical decisions and their rationale.
> **Newest entries at TOP.** Format: `ADR-XXX`

---



<!--
=======================================================
  📝 ADD NEW ADRs BELOW THIS LINE
=======================================================
-->

## ADR-004 — Single AI Provider: OpenAI Only (2026-06-16)

**Status:** Accepted

### Context

The codebase had two AI providers: OpenAI (for primary trial generation) and Anthropic Claude (unused fallback path). Having multiple providers added code complexity, maintenance burden, and required managing two API keys. The user explicitly requested OpenAI only.

### Decision

Removed all Anthropic API code (`generateWithClaude()` function, Anthropic SDK import, fallback logic), leaving OpenAI as the sole AI provider for trial generation.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Remove Anthropic** | Simpler code, one API key, less maintenance | No fallback | Selected: user requested it |
| Keep both | Fallback if one fails | Twice the code, two API keys, maintenance burden | Rejected: user explicitly wants single provider |

### Consequences

**Positive:**
- Simpler codebase, single API path
- No need to manage two API keys or SDKs

**Negative:**
- No automatic fallback if OpenAI is down

### Related

- Code: `src/app/api/trial/route.ts`

---

## ADR-003 — AI Model: gpt-5.4 (2026-06-16)

**Status:** Accepted

### Context

The model was previously set to `gpt-4o-mini` after the Responses API migration. The user requires `gpt-5.4` as the only model for trial generation.

### Decision

Set the model to `gpt-5.4` in `openai.responses.create()` calls.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **gpt-5.4** | User requirement | None | Selected: user mandate |
| gpt-4o-mini | Faster, cheaper | User rejected it | Rejected |

### Consequences

**Positive:**
- User's preferred model

### Related

- Code: `src/app/api/trial/route.ts:188`

---

## ADR-002 — OpenAI Responses API Migration (2026-06-16)

**Status:** Accepted

### Context

The Chat Completions API (`openai.chat.completions.create()`) has been deprecated by OpenAI. The codebase was using the deprecated endpoint with `model`, `messages`, `temperature`, etc.

### Decision

Migrated to the new Responses API (`openai.responses.create()`) with `model`, `instructions` (replaces system message), and `input` (replaces messages array). Uses `response.output_text` instead of `response.choices[0]?.message?.content`.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Responses API** | Current API, better streaming, future-proof | Requires SDK update | Selected: OpenAI's recommended path |
| Chat Completions | Works today | Deprecated, will be removed | Rejected: deprecated |

### Consequences

**Positive:**
- Uses current OpenAI SDK
- Simpler response access (`response.output_text`)

### Related

- Code: `src/app/api/trial/route.ts`

---

## ADR-001 — Security Headers via next.config.ts (2026-06-15)

**Status:** Accepted

### Context

A production-readiness audit (The Closer) identified that the application was not setting any security headers (HSTS, X-Frame-Options, etc.) on HTTP responses. For a production Next.js app, these headers are essential defense-in-depth measures.

### Decision

Add security headers via Next.js `async headers()` in `next.config.ts` rather than at the edge/CDN layer. This ensures headers are applied consistently regardless of deployment target.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Edge/CDN headers | Better performance, no app overhead | Ties to specific platform (Vercel, Cloudflare) | Rejected: platform lock-in |
| **next.config.ts headers** | Framework-native, portable, simple | Headers added at response time | Selected: simplest, most portable |
| Middleware-based | Most flexible, can be dynamic | More complex, per-request overhead | Rejected: overkill for static headers |

### Consequences

**Positive:**
- Consistent security headers on every response
- No platform dependency — works on Vercel, Netlify, self-hosted, etc.
- Simple, declarative configuration

**Negative:**
- Headers added at app level rather than edge (slightly slower for cached pages)

**Neutral:**
- CSP intentionally left out of config; should be added at edge if needed (Google Fonts requires `style-src 'unsafe-inline'`)

### Related

- Code: `next.config.ts`
- Docs: `docs/CLOSER_REPORT_2026-06-15.md`



<!--
=======================================================
  📝 ADD NEW ADRs ABOVE THIS LINE
=======================================================
-->

---

## 📋 ADR Template (for AI reference)

<!--
Copy this template for each new decision:

## ADR-XXX — [Decision Title] (YYYY-MM-DD)

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

### Context

What situation, problem, or question prompted this decision?
What constraints or requirements exist?

### Decision

What we decided to do. Be specific.

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Option A | ... | ... | Rejected: [reason] |
| Option B | ... | ... | Rejected: [reason] |
| **Chosen** | ... | ... | Selected: [reason] |

### Consequences

**Positive:**
- [benefit]

**Negative:**
- [tradeoff]

**Neutral:**
- [implication]

### Related

- Code: `path/to/implementation`
- Docs: `docs/related-doc.md`
- Issue: #XXX

---
-->