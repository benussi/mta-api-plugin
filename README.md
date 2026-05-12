# mta-api Claude Code plugin

MTA real-time feed integration for Claude Code. One integration agent, one validation skill, eight validation rules, two slash commands, and an MCP server that fetches official MTA documentation live.

For the MTA platform engineer running developer experience, and for consumer-side engineering teams integrating MTA feeds into their own product (airline post-landing guidance, hotel arrival flows, ride-share pickup routing, travel apps).

For the meta-pattern (when to build a plugin like this for another API, how to size the impact, where the long arc goes), see [`GUIDE.md`](./GUIDE.md).

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

The agent calls the MCP server to look up the feed group, surfaces the relevant authentication notes (optional today, recommended at scale), and generates runnable Python using `gtfs-realtime-bindings` with a timeout, error handling, and TODO markers for caching and exponential-backoff retry.

### Validate code against the eight rules

```
/mta-validate
```

Paste the code to validate. Returns pass/warn/fail per rule with suggested fixes.

### Submit standalone feedback

```
/mta-feedback
```

Three structured questions about the integration experience. Output is JSON written to `feedback/` (in production this becomes a POST to your internal feedback endpoint; see `GUIDE.md`).

## MCP tools

Server name: `mta-docs`. Exposed under namespace `mcp__plugin_mta-api_mta-docs__*`.

| Tool | Returns | Source |
|---|---|---|
| `discover_mta_docs` | File tree of `nymta/gtfs-documentation` | Live, GitHub API |
| `get_mta_doc` | Raw content of a doc by path | Live, GitHub raw |
| `get_proto_spec` | NYCT GTFS-realtime proto extensions | Live, `api.mta.info` |
| `list_feed_groups` | Feed-group catalogue (subway-ace, subway-l, lirr, mnr, alerts, …) | Curated |
| `get_feed_group` | Full integration details for one feed group | Curated |
| `get_auth_overview` | Auth state, rate-limit guidance, terms URL | Curated |
| `get_best_practices` | The eight validation rules | Curated |

The curated layer is curated because MTA does not publish the catalogue in any structured form (see `GUIDE.md` for the longer story). Responses are cached for five minutes.

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

Pulled live by the validation skill via `get_best_practices`, so the agent and skill share one source of truth.

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
├── GUIDE.md
└── README.md
```

## Sources

The MCP server fetches live from:

- [github.com/nymta/gtfs-documentation](https://github.com/nymta/gtfs-documentation), the official MTA GTFS documentation repository.
- [api.mta.info/nyct-subway.proto.txt](https://api.mta.info/nyct-subway.proto.txt), the canonical NYCT GTFS-realtime extensions specification.

Cross-referenced when generating code: [gtfs.org/documentation/realtime/reference](https://gtfs.org/documentation/realtime/reference/).
