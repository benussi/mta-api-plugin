# mta-api Claude Code plugin

Integrate the MTA real-time feeds into your application from inside Claude Code. The plugin ships an integration agent that generates working code, a validation skill that checks code against eight MTA-specific rules, a structured feedback channel, and an MCP server that serves the live MTA documentation and a curated catalogue of feed URLs.

Works for any application consuming the MTA real-time feeds: airline post-landing guidance, hotel arrival flows, ride-share pickup routing, real-estate transit-access displays, journey planners, transit dashboards.

## Install

Requirements: Claude Code, Node 18 or higher.

```
/plugin marketplace add https://github.com/benussi/mta-api-plugin
/plugin install mta-api@mta-marketplace
/reload-plugins
```

No `npm install`, no settings.json edits. The MCP server is plain Node with zero dependencies and starts automatically with the plugin.

Verify with `/plugin`. `mta-api` should show in the Installed tab and the Errors tab should be empty.

## Usage

### Ask the integration agent

```
@mta-integration-guide how do I get real-time L train arrivals in Python?
```

The agent looks up the L line's feed group via the MCP server, surfaces the relevant authentication notes, and generates runnable Python using `gtfs-realtime-bindings` with a timeout, error handling, and TODO markers for caching and exponential-backoff retry.

The same shape works for any line, any rail system (LIRR, Metro-North), service alerts, and any of the language stacks Claude Code can produce.

### Validate code against the eight rules

```
/mta-validate
```

Paste the code to validate. Returns pass/warn/fail per rule with suggested fixes. The rules are pulled live from the MCP server, so the agent and the validation step always agree.

### Submit feedback

```
/mta-feedback
```

Three structured questions about the integration experience. Output is JSON written to `feedback/` for the MTA platform team.

## MCP tools

Server name: `mta-docs`. Exposed under namespace `mcp__plugin_mta-api_mta-docs__*`.

| Tool | Returns | Source |
|---|---|---|
| `discover_mta_docs` | File tree of the MTA GTFS documentation repository | Live, GitHub API |
| `get_mta_doc` | Raw content of a doc by path | Live, GitHub raw |
| `get_proto_spec` | NYCT GTFS-realtime proto extensions | Live, `api.mta.info` |
| `list_feed_groups` | Feed-group catalogue (subway-ace, subway-l, lirr, mnr, alerts, …) | Curated |
| `get_feed_group` | Full integration details for one feed group | Curated |
| `get_auth_overview` | Auth state, rate-limit guidance, terms URL | Curated |
| `get_best_practices` | The eight validation rules | Curated |

Live responses are cached for five minutes.

## Validation rules

| Rule id | Checks |
|---|---|
| `use-get-not-head` | HTTP method against feed URLs. HEAD returns 403 even when GET works. |
| `url-encode-feed-path` | `%2F` between path segments (e.g. `nyct%2Fgtfs-l`). `/` returns 404. |
| `respect-cadence` | Polling interval. Feeds update every ~30s. |
| `backoff` | Retry strategy on 429/5xx (exponential plus jitter, capped attempts). |
| `timeouts` | Explicit HTTP request timeout, target 5–10s. |
| `gtfs-rt-parse` | Body parsed as GTFS-realtime protobuf, not JSON. |
| `cache` | Caching layer with TTL matching the feed cadence. |
| `handle-empty` | Code guards against empty `stop_time_update` and missing fields. |

## Feed-group catalogue

Subway groups: `subway-ace`, `subway-bdfm`, `subway-g`, `subway-jz`, `subway-l`, `subway-nqrw`, `subway-numbered` (1–7, S), `subway-si`.

Rail and other: `lirr`, `mnr`, `alerts`.

Each entry returns its URL, the lines covered, format (`GTFS-RT (protobuf)` for most, `GTFS-RT Service Alerts (protobuf)` for `alerts`), and auth notes. Call `get_feed_group(name)` for the full record.

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

## Sources

The MCP server fetches live from:

- [github.com/nymta/gtfs-documentation](https://github.com/nymta/gtfs-documentation), the official MTA GTFS documentation repository.
- [api.mta.info/nyct-subway.proto.txt](https://api.mta.info/nyct-subway.proto.txt), the canonical NYCT GTFS-realtime extensions specification.

Cross-referenced when generating code: [gtfs.org/documentation/realtime/reference](https://gtfs.org/documentation/realtime/reference/).
