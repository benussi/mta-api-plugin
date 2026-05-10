#!/usr/bin/env node
// MTA Docs MCP Server — vanilla Node, zero deps.
//
// Speaks the Model Context Protocol over stdio (newline-delimited JSON-RPC 2.0).
// Exposes tools that live-fetch from:
//   - github.com/nymta/gtfs-documentation (official MTA docs repo, auto-discovered)
//   - api.mta.info/nyct-subway.proto.txt (canonical NYCT GTFS-RT proto extensions)
// Plus a curated registry of feed groups + auth (data MTA doesn't publish in scrapable form).

import { FEED_GROUPS, AUTH_OVERVIEW, BEST_PRACTICES } from "./registry.js";

const NYMTA_REPO = "nymta/gtfs-documentation";
const PROTO_URL = "https://api.mta.info/nyct-subway.proto.txt";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchWithCache(url, options = {}) {
  const key = `${url}|${options.json ? "json" : "text"}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.body;
  const res = await fetch(url, {
    headers: { "User-Agent": "mta-api-plugin/0.1.0", ...(options.headers || {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const body = options.json ? await res.json() : await res.text();
  cache.set(key, { at: Date.now(), body });
  return body;
}

const tools = {
  discover_mta_docs: {
    description:
      "Live-fetches the file tree of MTA's official GTFS documentation repo (nymta/gtfs-documentation). Use this first to see what documentation MTA publishes. Returns a list of doc paths with sizes.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const tree = await fetchWithCache(
        `https://api.github.com/repos/${NYMTA_REPO}/git/trees/main?recursive=1`,
        { json: true },
      );
      const docs = tree.tree
        .filter((n) => n.type === "blob" && n.path.endsWith(".md"))
        .map((n) => ({ path: n.path, size_bytes: n.size }));
      return {
        source: `github.com/${NYMTA_REPO}`,
        fetched_at: new Date().toISOString(),
        docs,
        note: "Use get_mta_doc(path) to fetch the content of any doc.",
      };
    },
  },

  get_mta_doc: {
    description:
      "Live-fetches the raw content of a doc from MTA's official documentation repo. Pass a path returned by discover_mta_docs (e.g. 'feeds/subway/gtfs-rt/stations_affected.md').",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path inside nymta/gtfs-documentation" } },
      required: ["path"],
    },
    handler: async ({ path }) => {
      const url = `https://raw.githubusercontent.com/${NYMTA_REPO}/main/${path}`;
      const content = await fetchWithCache(url);
      return { source: url, fetched_at: new Date().toISOString(), path, content };
    },
  },

  get_proto_spec: {
    description:
      "Live-fetches the canonical NYCT GTFS-RT proto extensions file from api.mta.info. This is the authoritative schema for MTA-specific fields beyond standard GTFS-RT (e.g. NyctTripDescriptor.train_id, NyctStopTimeUpdate.scheduled_track).",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const content = await fetchWithCache(PROTO_URL);
      return { source: PROTO_URL, fetched_at: new Date().toISOString(), content };
    },
  },

  list_feed_groups: {
    description:
      "Lists all MTA GTFS-RT feed groups (curated). Each group covers a specific set of subway lines / rail systems and has its own feed URL. Use get_feed_group(name) for full details on one.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => ({
      source: "curated registry (MTA does not publish this catalog in scrapable form)",
      groups: Object.entries(FEED_GROUPS).map(([name, g]) => ({
        name,
        lines: g.lines,
        description: g.description,
      })),
    }),
  },

  get_feed_group: {
    description:
      "Returns full integration details for one feed group: URL, auth, format, lines covered, description.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Feed group name from list_feed_groups (e.g. 'subway-ace', 'lirr', 'alerts').",
        },
      },
      required: ["name"],
    },
    handler: async ({ name }) => {
      const group = FEED_GROUPS[name];
      if (!group) {
        throw new Error(
          `Unknown feed group '${name}'. Available: ${Object.keys(FEED_GROUPS).join(", ")}`,
        );
      }
      return { name, ...group };
    },
  },

  get_auth_overview: {
    description:
      "Returns how to register for an MTA API key, where it goes in requests, rate-limit guidance, and the terms-of-use URL.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => AUTH_OVERVIEW,
  },

  get_best_practices: {
    description:
      "Returns the checklist of MTA integration best practices used by the mta-validate skill: auth header placement, polling cadence, backoff, timeouts, protobuf parsing, caching, handling empty feeds.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => ({ best_practices: BEST_PRACTICES }),
  },
};

// --- JSON-RPC plumbing over stdio ---

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(req) {
  const { id, method, params } = req;
  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "mta-docs", version: "0.1.0" },
        },
      });
    }
    if (method === "tools/list") {
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          tools: Object.entries(tools).map(([name, t]) => ({
            name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      });
    }
    if (method === "tools/call") {
      const tool = tools[params.name];
      if (!tool) return error(id, -32601, `Unknown tool: ${params.name}`);
      const result = await tool.handler(params.arguments || {});
      return send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    }
    if (method === "notifications/initialized") return; // no-op
    if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
    error(id, -32601, `Method not found: ${method}`);
  } catch (e) {
    error(id, -32603, e.message || String(e));
  }
}

let buf = "";
const inflight = new Set();
let stdinClosed = false;

function track(value) {
  if (!value || typeof value.finally !== "function") return;
  inflight.add(value);
  value.finally(() => {
    inflight.delete(value);
    if (stdinClosed && inflight.size === 0) process.exit(0);
  });
}

const MAX_BUF_BYTES = 10 * 1024 * 1024;

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  if (buf.length > MAX_BUF_BYTES) {
    process.stderr.write(`dropping oversized input (>${MAX_BUF_BYTES}B)\n`);
    buf = "";
    return;
  }
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      track(handle(JSON.parse(line)));
    } catch (e) {
      process.stderr.write(`parse error: ${e.message}\n`);
    }
  }
});
process.stdin.on("end", () => {
  stdinClosed = true;
  if (inflight.size === 0) process.exit(0);
});
