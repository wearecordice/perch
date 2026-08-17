import { getCollection } from "astro:content"
import { outcome } from "./incidents"

/**
 * The subscription feeds.
 *
 * Both formats, because both are still asked for: RSS is what most readers'
 * tools speak, Atom is what the careful ones prefer and what several
 * aggregators handle better. They are written by hand rather than by a library
 * — a feed is a few hundred bytes of XML with strict escaping, and a
 * dependency for that is a dependency to keep updated forever.
 *
 * An incident is one entry, not one entry per update: a reader subscribing to
 * a status page wants to be told that something happened, not woken four times
 * while it is being fixed. The updates are the body of that entry, so the
 * whole story arrives in the reader.
 */

const SEVERITY: Record<string, string> = {
    degraded: "Degraded performance",
    partial: "Partial outage",
    major: "Major outage",
    maintenance: "Scheduled maintenance",
}

const STATE: Record<string, string> = {
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
    resolved: "Resolved",
}

/** XML has five characters that must never appear raw. Miss one, break the feed. */
export const escape = (text: string): string =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")

export interface Entry {
    id: string
    title: string
    url: string
    published: Date
    /** When the last thing was written, which is what a reader polls on. */
    updated: Date
    summary: string
    html: string
}

export async function entries(origin: string): Promise<Entry[]> {
    const incidents = await getCollection("incidents")

    return incidents
        .sort((a, b) => b.data.started.getTime() - a.data.started.getTime())
        .map((incident) => {
            const updates = [...incident.data.updates].sort(
                (a, b) => a.at.getTime() - b.at.getTime(),
            )
            const last = updates.at(-1)

            const html = [
                `<p><strong>${escape(SEVERITY[incident.data.severity] ?? "")}</strong>`,
                incident.data.affected.length
                    ? ` — affecting ${escape(incident.data.affected.join(", "))}`
                    : "",
                `</p>`,
                ...updates.map(
                    (update) =>
                        `<p><strong>${escape(STATE[update.state] ?? update.state)}</strong> ` +
                        `${escape(update.at.toISOString())} — ${escape(update.body)}</p>`,
                ),
            ].join("")

            return {
                id: incident.id,
                title: incident.data.title,
                url: `${origin}/incidents/${incident.id}/`,
                published: incident.data.started,
                updated: last?.at ?? incident.data.resolved ?? incident.data.started,
                summary: `${SEVERITY[incident.data.severity]} — ${outcome(incident)}`,
                html,
            }
        })
}
