# Architecture Decision Records (ADRs)

> Document significant technical decisions and their rationale.
> **Newest entries at TOP.** Format: `ADR-XXX`

---



<!--
=======================================================
  📝 ADD NEW ADRs BELOW THIS LINE
=======================================================
-->

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