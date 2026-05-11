---
name: mta-validate
description: Validates MTA API integration code against MTA-specific best practices and captures structured feedback on developer pain points. Use when a developer pastes integration code, asks "is this right?", asks for a code review of MTA integration, or invokes `/mta-validate`. Checks auth header placement, polling cadence, backoff, timeouts, GTFS-RT parsing, caching, empty-feed handling. Returns findings as pass/warn/fail with citations to the best-practices registry.
---

# mta-validate

Validates code that integrates the MTA real-time feeds and captures structured feedback on what was confusing or missing in the docs.

## When this skill runs

Invoke this skill when:

- A developer pastes code that calls `api-endpoint.mta.info/...` or imports `gtfs-realtime-bindings`
- The user runs `/mta-validate`
- The user asks for a review of MTA integration code

## How to validate

### Step 1: Pull the current best-practices checklist

Call the MCP tool `mcp__plugin_mta-api_mta-docs__get_best_practices`. This returns the live checklist with `id`, `title`, and `detail` for each rule. Always re-pull this — it's the source of truth and may update.

### Step 2: For each rule, classify the code as pass / warn / fail

Walk the rules in order. For each, decide:

| Rule id | What to look for |
|---|---|
| `auth-header` | The request must send `x-api-key` as an HTTP **header**. Fail if it's passed as a query param (`?key=...`) — MTA's new endpoint does not accept that. Fail if no auth is sent at all. |
| `respect-cadence` | Look for polling loops. Fail if interval < 15s. Warn if 15-30s. Pass if >= 30s or driven by an event/webhook. |
| `backoff` | On error paths (catch blocks, retry logic), check for backoff with jitter. Warn if retries exist with fixed delay. Fail if retries are immediate or unbounded. Pass if no retries (acceptable). |
| `timeouts` | The HTTP client must set a request timeout. Fail if missing (default fetch/requests/axios hangs forever). Pass if 5-10s. Warn if >30s or <2s. |
| `gtfs-rt-parse` | The response must be parsed as GTFS-RT protobuf, not `response.json()` or text. Fail if `JSON.parse`/`res.json()` is called on the body. Pass if `FeedMessage.decode` or equivalent is used. |
| `cache` | Look for any caching layer (in-memory map with TTL, Redis, etc.) wrapping the feed call. Warn if absent. Pass if present. Not a hard fail — depends on traffic. |
| `handle-empty` | The code must not assume `trip_update.stop_time_update` is non-empty or that any specific stop appears. Warn if there's an unguarded `.find()` / array index without a null check. |

### Step 3: Output a structured report

Format:

```
MTA Integration Validation
==========================

Summary: N pass, M warn, K fail

[FAIL] auth-header — API key is in query string, not header
  Detail: MTA's new endpoint requires `x-api-key` as an HTTP header.
          Query-param keys are silently rejected with 403.
  Suggested fix: <inline diff or pseudocode>

[WARN] respect-cadence — Polling every 5 seconds
  Detail: Feeds publish every ~30s. Polling faster wastes calls.
  Suggested fix: Increase interval to 30s, or move to event-driven.

[PASS] timeouts — 8s timeout set on fetch
...
```

### Step 4: Capture feedback (skeleton)

After delivering the report, prompt the developer:

> The MTA platform team uses your answers to improve the docs and onboarding.
> Quick — anything about this integration that was confusing or that you had to work around?
>
> 1. What documentation did you wish existed?
> 2. Did anything in the API behave differently than the docs suggested?
> 3. What took longer than it should have?

Redact secrets from the developer's responses before writing — same rules as `/mta-feedback`:

- Strip strings matching `x-api-key:\s*\S+`, `MTA_API_KEY=\S+`, or bare 32+ char hex/base64 tokens
- Replace pasted code snippets with `[code redacted — full code reviewed inline]`
- Strip email addresses and `Authorization:` header values

Then structure as JSON matching the shape below and write to:

```
${CLAUDE_PLUGIN_ROOT}/feedback/<timestamp>-<short-id>.json
```

```json
{
  "submitted_at": "ISO-8601 timestamp",
  "developer_team": "internal | external | unknown",
  "feed_group_used": "subway-ace | lirr | ... | unknown",
  "validation_findings": [
    { "rule_id": "auth-header", "status": "fail | warn | pass", "user_acknowledged": true }
  ],
  "open_text": {
    "missing_docs": "user's words, secrets/code redacted",
    "behavior_mismatch": "user's words, secrets/code redacted",
    "time_sink": "user's words, secrets/code redacted"
  },
  "code_excerpt_hash": "sha256 of validated code (privacy-preserving)",
  "source": "mta-validate-skill"
}
```

> **Skeleton note for the MTA platform engineer:** This local-file write is a
> placeholder. In production, replace it with a POST to your internal feedback
> endpoint (Linear / Sentry / internal API / Claude Managed Agents queue). The
> JSON shape stays the same so downstream tooling — including a future Claude
> Managed Agent with dreaming enabled — can extract patterns across
> submissions and propose new validation rules automatically.

## What NOT to validate

- Don't flag stylistic preferences (var naming, import order). Stick to rules in the live `get_best_practices` registry.
- Don't validate non-MTA code paths. If the developer pastes a 200-line file with only 20 lines touching MTA, focus on those 20.
- Don't run the code. Static review only.

## What NOT to do with feedback

- Don't ask the same question twice if the developer already volunteered an answer in their original message.
- Don't keep prompting if the developer skips the feedback questions. Once. Move on.
- Don't write feedback files containing the developer's full code or credentials — hash the code, drop any string matching `x-api-key` headers or env-var values.
