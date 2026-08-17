/**
 * The shapes Perch answers with, and a sample of them.
 *
 * The page is static and asks the worker for readings once it has loaded, so
 * these types are the contract between the two halves of this repository. The
 * sample is the same shape exactly — it is what the page draws before a worker
 * is reachable, and what the layout was built against.
 */

export type State = "up" | "degraded" | "down" | "unknown"

export interface MonitorSummary {
    id: string
    name: string
    description: string | null
    state: State
    /** Unix seconds of the newest reading, or null if there has never been one. */
    at: number | null
    ms: number | null
}

export interface Day {
    /** ISO date, UTC. */
    day: string
    up: number
    degraded: number
    down: number
    ms: number | null
}

/** A day with nothing recorded is not a good day; it is an unknown one. */
export function stateOfDay(day: Day | undefined): State {
    if (!day || day.up + day.degraded + day.down === 0) return "unknown"
    if (day.down > 0) return "down"
    if (day.degraded > 0) return "degraded"
    return "up"
}

/**
 * The share of checks that were not failures, over the whole window.
 *
 * Degraded counts as available on purpose: the service answered. A page that
 * calls a slow afternoon "downtime" is one nobody believes the third time.
 */
export function availability(days: Day[]): number | null {
    const total = days.reduce((n, d) => n + d.up + d.degraded + d.down, 0)
    if (total === 0) return null
    const bad = days.reduce((n, d) => n + d.down, 0)
    return ((total - bad) / total) * 100
}

/** Worst wins: the banner says the most serious thing that is true. */
export function overall(monitors: MonitorSummary[]): State {
    const order: State[] = ["up", "degraded", "down"]
    const known = monitors.map((m) => m.state).filter((s) => order.includes(s))
    if (known.length === 0) return "unknown"
    return known.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a))
}

/* ---------------------------------------------------------------------- *
 * Sample data, drawn until a worker answers. Delete when it does.         *
 * ---------------------------------------------------------------------- */

const NAMES: [string, string, string | null][] = [
    ["web-client", "Web client", null],
    ["api", "API", "Accounts, servers, channels and messages."],
    ["events", "Events", "The live connection that delivers messages."],
    ["voice", "Voice", "Voice channels, video and screen sharing."],
    ["file-service", "File service", "Uploads, avatars and attachments."],
    ["link-previews", "Link previews", null],
    ["gif-search", "GIF search", null],
    ["mail", "Mail", "Password resets, reports and anything else we send."],
    ["website", "Website", null],
    ["developer-documentation", "Developer documentation", null],
]

/** Deterministic, so the sample does not flicker between builds. */
function pseudoRandom(seed: number): () => number {
    let value = seed
    return () => {
        value = (value * 1103515245 + 12345) % 2147483648
        return value / 2147483648
    }
}

export function sampleMonitors(): MonitorSummary[] {
    const now = Math.floor(Date.now() / 1000)
    return NAMES.map(([id, name, description], i) => ({
        id: id!,
        name: name!,
        description: description ?? null,
        state: i === 3 ? ("degraded" as State) : ("up" as State),
        at: now - 60,
        ms: 20 + i * 11,
    }))
}

export function sampleDays(id: string, days = 90): Day[] {
    const random = pseudoRandom(id.length * 7919 + id.charCodeAt(0))
    const out: Day[] = []

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
        const roll = random()

        /* A few bad days, fewer terrible ones, and a gap at the start — which
           is what a monitor that has not existed for ninety days looks like,
           and the case a page usually forgets to draw. */
        if (i > days - 12) out.push({ day: date, up: 0, degraded: 0, down: 0, ms: null })
        else if (roll > 0.965)
            out.push({ day: date, up: 260, degraded: 12, down: 16, ms: 640 })
        else if (roll > 0.9)
            out.push({ day: date, up: 276, degraded: 12, down: 0, ms: 410 })
        else out.push({ day: date, up: 288, degraded: 0, down: 0, ms: 180 })
    }
    return out
}
