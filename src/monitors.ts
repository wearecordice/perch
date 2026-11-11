import type { Monitor } from "./types"

/**
 * What this installation watches — Cordice on its home server (11 November 2026).
 *
 * The one file you edit to make Perch yours, and the one list both halves use: the worker probes
 * these and the page is built from them, so a component cannot be on one and missing from the
 * other. TypeScript rather than YAML: a typo is caught when the worker is built, not at three in
 * the morning.
 *
 * One model of components across every monitor. Cordice's server checks each of its dependencies
 * for real, with its own credentials (which never leave it), and answers GET /healthz/<component>
 * with 200 or 503 — server/crates/cordice-api/src/health.rs in the monorepo. Perch (the public
 * page), Phare (alerts to the team) and Upptime (a second record, github.com/wearecordice/status)
 * all watch the same addresses, so they agree.
 *
 * Adding a component: a check in health.rs, an entry here, the same monitor in Phare.
 *
 * Ids are the primary key of everything recorded, so a service that was renamed keeps its id and
 * its history. Names say what a person uses, never which provider is behind it. Every entry asserts
 * on text only the right service would answer: a 200 proves something answered (a Cloudflare error
 * page is also a page), not that the right thing did.
 */
export const monitors: Monitor[] = [
    {
        id: "web-client",
        name: "Web app",
        description: "app.cordice.org in the browser.",
        request: { protocol: "http", url: "https://app.cordice.org/" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "<title>Cordice</title>" },
        ],
    },
    {
        id: "api",
        name: "API",
        description: "Accounts, chats, servers and messages — what every app talks to.",
        // Readiness: the database answers and the encryption keys are available.
        request: { protocol: "http", url: "https://api.cordice.org/readyz" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "ready" },
        ],
    },
    {
        id: "events",
        name: "Messages in real time",
        description: "The live connection that delivers new messages, typing and calls.",
        // The gateway's own host. Not the socket: a WebSocket handshake cannot be made by this
        // probe, so the gateway answers this path itself.
        request: { protocol: "http", url: "https://gw.cordice.org/healthz" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "ok" },
        ],
    },
    {
        id: "voice",
        name: "Voice and video calls",
        description: "Calls, voice channels and screen sharing.",
        // The call server's API, reached by our server with its own keys (ListRooms).
        request: { protocol: "http", url: "https://api.cordice.org/healthz/calls" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "operational" },
        ],
        degradedAfterMs: 4_000,
    },
    {
        id: "file-service",
        name: "Files and media",
        description: "Photos, videos, voice messages and attachments.",
        // The user-file bucket, reached by our server with its keys.
        request: { protocol: "http", url: "https://api.cordice.org/healthz/storage" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "operational" },
        ],
        degradedAfterMs: 4_000,
    },
    {
        id: "mail",
        name: "Sign-in codes by email",
        description: "Whether a sign-in code can leave right now.",
        // The server connects to the mail relay and is greeted. (Until November this id watched
        // our own mail server's port; the history is kept.)
        request: { protocol: "http", url: "https://api.cordice.org/healthz/email" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "operational" },
        ],
        degradedAfterMs: 4_000,
    },
    {
        id: "gif-search",
        name: "GIF search",
        description: "Gifoteka, our own GIF catalog.",
        // Our own service, not running yet: it launches with its own domain and legal pages
        // (deploy/gifcat/README.md in the monorepo). Then: enabled: true.
        request: { protocol: "http", url: "https://api.cordice.org/healthz/gifs" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "operational" },
        ],
        enabled: false,
    },
    {
        id: "short-links",
        name: "Short links",
        description: "crdc.xyz links to people, chats and invites.",
        // The root goes on to the website; the page's own name is what proves the chain.
        request: { protocol: "http", url: "https://crdc.xyz/" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "Cordice" },
        ],
    },
    {
        id: "website",
        name: "Website",
        request: { protocol: "http", url: "https://cordice.org/" },
    },
    {
        id: "developer-documentation",
        name: "Developer documentation",
        request: { protocol: "http", url: "https://developers.cordice.org/" },
    },
]

/** What is probed and shown: everything that has launched. */
export const active: Monitor[] = monitors.filter((m) => m.enabled !== false)
