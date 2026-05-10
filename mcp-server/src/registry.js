// Curated registry of MTA GTFS-RT feed groups.
//
// Why curated: MTA does not publish the feed-group catalog (URLs, what lines
// each covers, auth requirements) in any scrapable/structured form. The
// human-readable index at mta.info/developers is Akamai bot-protected (403).
// The feed endpoints themselves return 403 without a registered key.
//
// What stays live: the proto spec and the nymta/gtfs-documentation repo are
// fetched live by the MCP server, so spec details auto-update as MTA edits them.

const BASE_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds";

const DEFAULTS = {
  format: "GTFS-RT (protobuf)",
  auth: "API key required as `x-api-key` header. Register at api.mta.info.",
};

const RAW_FEED_GROUPS = {
  "subway-ace": {
    lines: ["A", "C", "E"],
    url: `${BASE_URL}/nyct%2Fgtfs-ace`,
    description: "Real-time trip updates and vehicle positions for the A, C, and E subway lines.",
  },
  "subway-bdfm": {
    lines: ["B", "D", "F", "M"],
    url: `${BASE_URL}/nyct%2Fgtfs-bdfm`,
    description: "Real-time data for B, D, F, M lines.",
  },
  "subway-g": {
    lines: ["G"],
    url: `${BASE_URL}/nyct%2Fgtfs-g`,
    description: "Real-time data for the G line.",
  },
  "subway-jz": {
    lines: ["J", "Z"],
    url: `${BASE_URL}/nyct%2Fgtfs-jz`,
    description: "Real-time data for J, Z lines.",
  },
  "subway-nqrw": {
    lines: ["N", "Q", "R", "W"],
    url: `${BASE_URL}/nyct%2Fgtfs-nqrw`,
    description: "Real-time data for N, Q, R, W lines.",
  },
  "subway-l": {
    lines: ["L"],
    url: `${BASE_URL}/nyct%2Fgtfs-l`,
    description: "Real-time data for the L line.",
  },
  "subway-numbered": {
    lines: ["1", "2", "3", "4", "5", "6", "7", "S"],
    url: `${BASE_URL}/nyct%2Fgtfs`,
    description: "Real-time data for the numbered lines (1,2,3,4,5,6,7) and S shuttle.",
  },
  "subway-si": {
    lines: ["SIR"],
    url: `${BASE_URL}/nyct%2Fgtfs-si`,
    description: "Staten Island Railway real-time data.",
  },
  "alerts": {
    lines: ["ALL"],
    url: `${BASE_URL}/camsys%2Fall-alerts`,
    format: "GTFS-RT Service Alerts (protobuf)",
    description: "Service alerts across subway, bus, LIRR, and Metro-North.",
  },
  "lirr": {
    lines: ["LIRR"],
    url: `${BASE_URL}/lirr%2Fgtfs-lirr`,
    description: "Long Island Rail Road real-time trip data.",
  },
  "mnr": {
    lines: ["MNR"],
    url: `${BASE_URL}/mnr%2Fgtfs-mnr`,
    description: "Metro-North Railroad real-time trip data.",
  },
};

const FEED_GROUPS = Object.fromEntries(
  Object.entries(RAW_FEED_GROUPS).map(([k, v]) => [k, { ...DEFAULTS, ...v }]),
);

const AUTH_OVERVIEW = {
  registration_url: "https://api.mta.info/",
  how_to_register: [
    "Visit https://api.mta.info/ and create an account.",
    "Once registered, your API key is displayed in your account profile.",
    "Pass the key on every request via the header: `x-api-key: <YOUR_KEY>`.",
  ],
  rate_limits: {
    documented: false,
    practical_guidance: [
      "MTA does not publish rate limits, but feeds update roughly every 30 seconds.",
      "Polling more often than every 15 seconds wastes calls and may trigger throttling.",
      "Cache responses for the feed cadence rather than per-request.",
    ],
  },
  terms_url: "https://www.mta.info/developers/terms-and-conditions",
};

const BEST_PRACTICES = [
  {
    id: "auth-header",
    title: "Always send the API key as `x-api-key` header",
    detail: "MTA does not accept the key as a query parameter on the new api-endpoint.mta.info host.",
  },
  {
    id: "respect-cadence",
    title: "Poll no more often than the feed updates",
    detail: "Feeds publish every ~30s. Polling faster wastes calls without fresher data.",
  },
  {
    id: "backoff",
    title: "Exponential backoff on 429/5xx",
    detail: "Implement at least 2x backoff with jitter; surface the original error after 3 retries.",
  },
  {
    id: "timeouts",
    title: "Set an explicit timeout on requests",
    detail: "Default HTTP clients often hang indefinitely; use 5-10s for these feeds.",
  },
  {
    id: "gtfs-rt-parse",
    title: "Parse responses as GTFS-RT protobuf, not JSON",
    detail: "Use gtfs-realtime-bindings (Node), gtfs-realtime-bindings (Python), or the official .proto.",
  },
  {
    id: "cache",
    title: "Cache parsed responses for 15-30s",
    detail: "Avoids hammering the feed and matches its update cadence.",
  },
  {
    id: "handle-empty",
    title: "Handle empty/missing trip_update gracefully",
    detail: "Off-peak hours and service changes can produce sparse feeds; don't assume a stop will always appear.",
  },
];

export { FEED_GROUPS, AUTH_OVERVIEW, BEST_PRACTICES };
