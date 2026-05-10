# mta-api — a Claude Code plugin for MTA API integration

Built for the MTA platform engineer who is tired of answering the same API integration questions.

This plugin lets external and internal developers integrate the MTA real-time feeds inside Claude Code: ask a question in plain English, get correct working code grounded in MTA's live docs, validate it against MTA-specific best practices, and leave structured feedback that the platform team uses to prioritize docs and API improvements.

---

## What this plugin includes

- **Agent — `mta-integration-guide`** — answers integration questions ("how do I get real-time L train arrivals?"), maps lines to the correct feed group, generates working code, surfaces auth and rate-limit gotchas.
- **Skill — `mta-validate`** — reviews integration code against the MTA best-practices checklist (auth header placement, polling cadence, backoff, timeouts, GTFS-RT parsing, caching, empty-feed handling). Returns pass/warn/fail per rule with suggested fixes.
- **MCP server — `mta-docs`** — live-fetches MTA's own [official GTFS documentation repo](https://github.com/nymta/gtfs-documentation) and the [canonical NYCT GTFS-RT proto](https://api.mta.info/nyct-subway.proto.txt). Plus a curated registry of feed-group URLs and auth notes (the parts MTA doesn't publish in a structured form).
- **Slash commands** — `/mta-validate` (validate code) and `/mta-feedback` (standalone feedback).

Everything stays in sync with MTA: when a new doc lands in `nymta/gtfs-documentation`, the plugin picks it up on the next call — no plugin update needed.

---

## Install (under 5 minutes)

**Requirements:** Claude Code, Node.js ≥ 18.

In Claude Code, run:

```
/plugin marketplace add <this-repo-url>
/plugin install mta-api@mta-marketplace
/reload-plugins
```

That's it. No `npm install`, no settings.json edits — the MCP server is vanilla Node (zero deps) and auto-starts when the plugin loads.

### Verify it loaded

```
/plugin
```

You should see **mta-api** in the *Installed* tab with a green check and an empty *Errors* tab.

Then try:

```
/mta-validate
```

…which should prompt for code to validate.

```
@mta-integration-guide how do I get real-time L train arrivals?
```

…should kick off the integration agent.

---

## Try it

Ask the agent a real question:

> "How do I get real-time L train arrivals in Python?"

The agent will call `list_feed_groups` and `get_feed_group` to find the right feed (`subway-l`), `get_auth_overview` to surface the API-key requirement, and generate runnable Python using `gtfs-realtime-bindings` with proper timeout, error handling, and a `TODO: caching` marker.

Paste that code back and run `/mta-validate`. The skill will walk the seven best-practice rules, flag what's missing (probably the caching layer and an exponential-backoff retry), and prompt you for structured feedback on what was confusing.

---

## The framework — build your own plugin

The MTA plugin is one instance of a pattern. Here's how to spot the next one in your org.

### The real skill isn't building — it's thinking

Most engineers approach plugin building backwards. They start with "what can I build?" Start instead with "what toil am I watching people endure?"

### Three questions

**1. What repetitive task is stealing time from high-value work?**

Look for the thing engineers do over and over that doesn't feel like "real work." For the MTA platform engineer: developers kept asking the same API integration questions. The platform engineer kept answering them. That's the toil.

**2. What signal are you missing because of that toil?**

When you're drowning answering questions, you can't see the pattern. For the MTA: no visibility into _where_ the API was actually confusing. That's the hidden feedback.

**3. What would change if you solved it?**

If developers could self-serve _and_ you got structured feedback on what was hard, what becomes possible? For the MTA: faster adoption, API improvements informed by real usage, the platform engineer's time back.

### The MTA example, mapped to the framework

| Step | MTA-specific answer |
|---|---|
| Toil | Platform engineer answering repetitive API questions |
| Hidden signal | No data on what's actually confusing developers |
| Solution | Plugin that guides developers + captures feedback |
| Outcome | Self-service adoption + actionable API improvements + reclaimed time |

### Apply this to your problem

1. Walk your team. What task repeats daily that feels like "someone has to do this"?
2. Ask: what would we _know_ if we had time to think about it?
3. Design a plugin that automates the toil **and** surfaces the signal.
4. Wire it to Claude Code with an agent (for the work), a skill (for the rules), an MCP server (for the data), and slash commands (for the entry points).

That's the whole pattern.

---

## Measuring impact: time saved

Before you build, make a simple estimate. You'll need it to justify the investment and to know if it worked.

For the MTA plugin:

- **Average time to answer one API integration question:** 15 minutes
- **Metric:** plugin usage — count of `/mta-validate` and agent-driven sessions per week
- **Weekly time saved:** (15 min) × (interactions deflected to the plugin)
- **Realistic scale:** 20 external teams + 5 internal teams, each using it ~2× weekly = 50 interactions × 15 min = **750 minutes (12.5 hours)** of platform engineer time reclaimed per week.

Adapt to your toil: how many times per week does it happen? How long is one instance? If a plugin cuts that by 80%, what's the value? That's your business case.

---

## What I scoped out (deliberately)

To ship in a 90-minute build, two things are skeletons:

1. **Feedback collection sink.** The skill and `/mta-feedback` slash command write structured JSON to `${CLAUDE_PLUGIN_ROOT}/feedback/`. In production, replace the file write with a POST to your internal feedback endpoint (Linear, an internal API, or a Claude Managed Agents queue). The JSON shape is already designed for that handoff.

2. **Dreaming-based rule extraction.** The next step — see below — is to run a Claude Managed Agent over collected feedback to extract patterns and propose new validation rules automatically.

These are skeletonized, not absent: you can see the wiring and extend it.

---

## With more time

Wire feedback collection to **Claude Managed Agents with dreaming** so the validation agent improves over time. As real submissions accumulate, a dreaming-extracted pattern ("8 developers in two weeks confused `feed_id` with `feed_group_name`") becomes a new validation rule automatically. The MTA platform engineer reviews dreaming-extracted patterns monthly and either accepts them as new rules or addresses the root cause in the API docs.

This is the loop: **plugin captures friction → dreaming extracts patterns → platform engineer fixes API or docs → plugin gets smarter**.

---

## Distribution

This repo is the artifact. Drop the install instructions into whatever channels your developers already use — internal docs portal, Slack, package manager, or just the GitHub link. The README is the on-ramp; the plugin itself just needs to work cleanly when they follow it.

---

## Plugin structure

```
mta-plugin/
├── .claude-plugin/
│   ├── plugin.json              # manifest + MCP server config
│   └── marketplace.json         # makes this repo installable as a marketplace
├── agents/
│   └── mta-integration-guide.md # the integration-helping agent
├── skills/
│   └── mta-validate/
│       └── SKILL.md             # validation rules + feedback skeleton
├── commands/
│   ├── mta-validate.md          # /mta-validate
│   └── mta-feedback.md          # /mta-feedback
├── mcp-server/
│   ├── package.json
│   └── src/
│       ├── index.js             # JSON-RPC over stdio, zero deps
│       └── registry.js          # curated feed-group catalog + best practices
└── README.md
```

---

## Sources this plugin pulls from live

- **MTA's official GTFS docs repo:** [github.com/nymta/gtfs-documentation](https://github.com/nymta/gtfs-documentation) — discovered + fetched live via the GitHub API and raw content endpoint.
- **NYCT GTFS-RT proto extensions:** [api.mta.info/nyct-subway.proto.txt](https://api.mta.info/nyct-subway.proto.txt) — the canonical schema for MTA-specific fields.
- **GTFS spec:** [gtfs.org/documentation/realtime/reference](https://gtfs.org/documentation/realtime/reference/) — referenced when generating examples.

The feed-group catalog (URLs, line coverage, auth notes) is curated because MTA does not publish it in any structured/scrapable form — the human-readable index is bot-blocked, and the feed endpoints themselves require registration. The curated layer is small, defensible, and tested against real probes.
