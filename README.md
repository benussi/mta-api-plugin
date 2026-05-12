# mta-api Claude Code plugin

For the MTA platform engineer who keeps answering the same integration questions and has no structured sense of which bits developers are actually getting stuck on.

Three pieces. An integration agent that answers questions and generates working code. A validation skill that checks code against MTA-specific gotchas I found by probing the live endpoints. A feedback step that captures what the developer struggled with, so the platform team finally has data on what to fix.

## Why MTA?

Two reasons.

First, the integration layer is enterprise-relevant. The feeds are open. No API key, no partnership contract. Companies like United telling a landed passenger which train to catch from JFK, hotels surfacing arrival directions, ride-share platforms routing pickups near subway entrances, real-estate apps showing transit access. This isn't civic tech; it's the integration layer those enterprise teams actually need.

Second, it's a deliberately harder case to demonstrate the pattern on. Most other enterprise APIs already have official Claude Code plugins (Stripe, Twilio, Datadog, GitHub, Salesforce, Atlassian). MTA doesn't. The documentation page checks request headers, so anything that doesn't look like a real browser gets a 403 back. The list of which subway lines map to which feed URL isn't published in any structured form. And the endpoints have probe-discovered gotchas: HEAD returns 403 even when GET works, the path needs `%2F` not `/`. If the pattern holds up here, it holds up anywhere a customer brings you.

## What's in it

Four pieces do the actual work.

`agents/mta-integration-guide.md`. Answers integration questions, maps subway lines to the right feed, generates working code, and surfaces auth and rate-limit considerations before the developer hits them.

`skills/mta-validate/SKILL.md`. Reviews integration code against an eight-rule checklist grounded in real probes against the MTA endpoints. The rules cover the HEAD-vs-GET gotcha, the `%2F`-encoded path, polling cadence, backoff, timeouts, GTFS-realtime parsing, caching, and empty-feed handling. Returns pass/warn/fail per rule with suggested fixes.

`mcp-server/src/`. A zero-dependency Node MCP server. It fetches the official MTA GTFS documentation repository on GitHub and the canonical NYCT extensions specification from api.mta.info live, and serves a curated registry of feed-group URLs and the best-practices rules used by the validation skill.

Two slash commands: `/mta-validate` and `/mta-feedback`. Both wired to the skill and to the structured-feedback writer.

## Install

Requirements: Claude Code, Node 18 or higher.

In Claude Code:

```
/plugin marketplace add https://github.com/benussi/mta-api-plugin
/plugin install mta-api@mta-marketplace
/reload-plugins
```

No `npm install`, no settings.json edits. The MCP server is plain Node with zero dependencies and starts automatically when the plugin loads.

Verify it loaded:

```
/plugin
```

`mta-api` should show in the Installed tab with a green tick, and the Errors tab should be empty. After that, `/mta-validate` should prompt for code, and `@mta-integration-guide how do I get real-time L train arrivals?` should start the integration agent.

## A quick example

Ask the agent something real:

> How do I get real-time L train arrivals in Python?

It will call the MCP server to look up the L line's feed group, surface the relevant authentication notes (optional today, worth registering for at scale), and generate runnable Python using `gtfs-realtime-bindings`. The generated code includes a timeout, error handling, and TODO markers for the caching layer and an exponential-backoff retry.

Paste the generated code back and run `/mta-validate`. The skill walks all eight rules, flags whatever's missing (probably the caching layer and the retry), and asks for structured feedback on what was confusing.

## The framework: build your own

The MTA plugin is one instance of a pattern. The work of spotting the next one in your organisation comes down to three questions.

The first question is about toil. What repetitive task is stealing time from higher-value work? For the MTA platform engineer, the toil was answering the same integration questions over and over.

The second question is about signal. What are you missing because you're too busy answering questions to think about the pattern? For the MTA, there was no visibility into where the API was actually confusing developers.

The third question is about outcome. What would change if developers could self-serve and you got structured feedback on what was hard? Faster adoption, API improvements informed by real usage, the platform engineer's time back.

The design work after that is straightforward. Walk the team and find the task that repeats daily and feels like "someone has to do this." Ask what you'd know if you had the time to think about it. Then build a plugin that automates the toil and captures the signal, with the four-piece shape: agent for the work, skill for the rules, MCP server for the data, slash commands for the entry points.

## Measuring impact

Before building, do the maths. For the MTA plugin: fifteen minutes per integration question, twenty-five teams using the plugin twice a week. That's twelve and a half hours of platform engineer time reclaimed every week.

Adapt to your case. How many times a week does the toil happen? How long is one instance? If a plugin cuts that by eighty percent, what's the value? That's your business case before any code gets written.

## With more time

Two things are skeletons today and should be wired up properly in production.

The first is the feedback collection sink. The `/mta-feedback` command currently writes structured JSON to a local `feedback/` directory. In production this would be a POST to your internal feedback endpoint, whether that's Linear, an internal API, or a Claude Managed Agents queue. The JSON shape is already designed for that handoff.

The second is dreaming-based rule extraction. As feedback piles up, a managed Agent extracts patterns on whatever cadence makes sense. Something like: eight developers in two weeks confused `feed_id` with `feed_group_name`. That becomes a new validation rule automatically. The platform engineer reviews patterns monthly and either accepts them as new rules or addresses the root cause in the documentation.

Together this is the long arc. The plugin captures friction, dreaming extracts patterns, the platform engineer fixes the API or the docs, the plugin gets smarter.

## Distribution

This repository is the artifact. Drop the install instructions into whatever channels your developers already use: internal documentation portal, Slack, package manager, or the GitHub link directly. The README is the on-ramp. The plugin itself just needs to work cleanly when developers follow it.

## Plugin structure

```
mta-plugin/
├── .claude-plugin/
│   ├── plugin.json              # manifest + MCP server config
│   └── marketplace.json         # makes this repo installable as a marketplace
├── agents/
│   └── mta-integration-guide.md
├── skills/
│   └── mta-validate/
│       └── SKILL.md
├── commands/
│   ├── mta-validate.md
│   └── mta-feedback.md
├── mcp-server/
│   ├── package.json
│   └── src/
│       ├── index.js             # JSON-RPC over stdio, zero deps
│       └── registry.js          # curated feed catalogue + best practices
└── README.md
```

## Sources this plugin pulls from live

The official MTA GTFS documentation repository at [github.com/nymta/gtfs-documentation](https://github.com/nymta/gtfs-documentation), discovered and fetched live via the GitHub API and raw content endpoint.

The canonical NYCT GTFS-realtime extensions specification at [api.mta.info/nyct-subway.proto.txt](https://api.mta.info/nyct-subway.proto.txt).

The GTFS specification at [gtfs.org/documentation/realtime/reference](https://gtfs.org/documentation/realtime/reference/), referenced when generating examples.

The feed-group catalogue (which subway lines map to which URL, plus auth and rate-limit notes) is curated. MTA does not publish this in any structured form: the documentation page checks request headers and turns away basic automated requests with a 403, and the catalogue has no canonical machine-readable version. The curated layer is small, defensible, and tested against real probes.
