import type { CollectionEntry } from "astro:content"

export type Incident = CollectionEntry<"incidents">
export type Severity = Incident["data"]["severity"]

/** Worst last, so an index comparison is a severity comparison. */
const RANK: Severity[] = ["maintenance", "degraded", "partial", "major"]

export const worse = (a: Severity, b: Severity): Severity =>
    RANK.indexOf(b) > RANK.indexOf(a) ? b : a

/** How a severity colours a day and an icon. Maintenance is not a failure. */
export const severityState = (severity: Severity) =>
    severity === "maintenance"
        ? "maintenance"
        : severity === "major"
          ? "down"
          : "degraded"

const iso = (date: Date) => date.toISOString().slice(0, 10)

/**
 * Whether an incident covers a given day.
 *
 * Inclusive at both ends, and an unresolved incident covers every day from its
 * start to today: something still broken is still broken this morning.
 */
export function activeOn(incident: Incident, day: string): boolean {
    const from = iso(incident.data.started)
    const to = incident.data.resolved ? iso(incident.data.resolved) : iso(new Date())
    return day >= from && day <= to
}

/** The incidents touching one monitor, newest first. */
export function forMonitor(incidents: Incident[], id: string): Incident[] {
    return incidents
        .filter((i) => i.data.affected.includes(id))
        .sort((a, b) => b.data.started.getTime() - a.data.started.getTime())
}

/**
 * "3 weeks ago", "just now".
 *
 * Written out rather than taken from Intl.RelativeTimeFormat so that the
 * server render and the browser cannot disagree about it — a status page that
 * changes its own words on hydration looks broken in a way nobody can
 * reproduce.
 */
export function ago(date: Date, now = new Date()): string {
    const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000))
    /* Each pair is "divide by this, and the answer is in these".
     *
     * The obvious way to write this table is to name the unit you are leaving
     * rather than the one you are entering, and it is wrong in a way that
     * reads perfectly: an incident six days old came out as "6 hours ago",
     * confident and off by a factor of twenty-four. */
    const steps: [number, string][] = [
        [60, "minute"],
        [60, "hour"],
        [24, "day"],
        [7, "week"],
        [4.35, "month"],
        [12, "year"],
    ]

    let value = seconds
    let unit = "second"

    for (const [size, next] of steps) {
        if (value < size) break
        value = Math.floor(value / size)
        unit = next
    }

    if (unit === "second" && value < 45) return "just now"
    const rounded = Math.max(1, Math.round(value))
    return `${rounded} ${unit}${rounded === 1 ? "" : "s"} ago`
}

/** What a resolved incident says on the right of its row. */
export const outcome = (incident: Incident, now = new Date()): string =>
    incident.data.resolved
        ? `Recovered ${ago(incident.data.resolved, now)}`
        : "Ongoing"
