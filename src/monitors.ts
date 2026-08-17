import type { Monitor } from "./types"

/**
 * What this installation watches.
 *
 * The one file you edit to make Perch yours. It is TypeScript rather than YAML
 * on purpose: a typo in a monitor is caught when the worker is built, not at
 * three in the morning when the check that was silently never running turns
 * out to have been the important one.
 *
 * These are Cordice's. Replace them.
 *
 * Note how few of them trust a status code on its own. Every one of these
 * paths goes through the same reverse proxy, and a proxy whose backend has
 * gone will answer the front page with a 200 — so where a service says
 * something only it would say, the monitor asks for that instead.
 */
export const monitors: Monitor[] = [
    {
        id: "web-client",
        name: "Web client",
        request: { protocol: "http", url: "https://app.cordice.org/" },
    },
    {
        id: "api",
        name: "API",
        description: "Accounts, servers, channels and messages.",
        request: { protocol: "http", url: "https://app.cordice.org/api/" },
        // The discovery document touches configuration, the database and the
        // file service's address, so a good answer here means rather more than
        // a static page would.
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "features" },
        ],
    },
    {
        id: "events",
        name: "Events",
        description: "The live connection that delivers messages.",
        // Not the socket itself: a WebSocket handshake cannot be made over the
        // HTTP this probe speaks, and the proxy would answer 502 — the same
        // 502 a dead service returns. The service answers this path itself.
        request: { protocol: "http", url: "https://app.cordice.org/ws/health" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "ok" },
        ],
    },
    {
        id: "voice",
        name: "Voice",
        description: "Voice channels, video and screen sharing.",
        request: { protocol: "http", url: "https://app.cordice.org/livekit/" },
    },
    {
        id: "file-service",
        name: "File service",
        description: "Uploads, avatars and attachments.",
        request: { protocol: "http", url: "https://app.cordice.org/autumn/" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "file server" },
        ],
    },
    {
        id: "link-previews",
        name: "Link previews",
        request: { protocol: "http", url: "https://app.cordice.org/january/" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "media proxy" },
        ],
    },
    {
        id: "gif-search",
        name: "GIF search",
        request: { protocol: "http", url: "https://app.cordice.org/gifbox/" },
        assertions: [
            { type: "status", in: [200] },
            { type: "body", contains: "Gifbox" },
        ],
    },
    {
        id: "mail",
        name: "Mail",
        description: "Password resets, reports and anything else we send.",
        // There is no page to fetch. What a sending or collecting client needs
        // to find is a port that answers, so that is what is tested.
        request: { protocol: "tcp", host: "mail.cordice.org", port: 465 },
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
