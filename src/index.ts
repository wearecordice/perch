import { monitors } from "./monitors"
import { probe } from "./probe"
import { forget, history, latest, record } from "./store"

export interface Env {
    DB: D1Database
    /** Where this worker's probes run from, for the record. See schema.sql. */
    PERCH_REGION?: string
    /** Days of per-probe detail to keep. Day summaries are kept for good. */
    PERCH_RETENTION_DAYS?: string
}

/* Raw checks are pruned once a day rather than on every run: it is a full
   table delete, and doing it every five minutes would spend more time tidying
   than measuring. */
const PRUNE_AT_HOUR = 3

export default {
    /** The cron. Everything Perch knows, it learns here. */
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        const region = env.PERCH_REGION ?? "auto"

        /* One at a time, which is slower and more honest.
         *
         * Running them at once made every reading agree with every other and
         * all of them wrong: ten simultaneous requests contend, and the clock
         * in this runtime does not advance except at I/O, so probes that
         * finished later inherited the wait of the ones ahead of them. The
         * first run of this worker reported 1.2 to 1.9 seconds for services
         * that answer in 20 to 120ms, in near-perfect array order.
         *
         * A run of ten takes a few seconds of the five minutes it has, and
         * the number recorded is the service's own. */
        const results = []
        for (const monitor of monitors) {
            results.push(await probe(monitor, region))
        }
        await record(env.DB, results)

        if (new Date(event.scheduledTime).getUTCHours() === PRUNE_AT_HOUR) {
            ctx.waitUntil(forget(env.DB, Number(env.PERCH_RETENTION_DAYS ?? 90)))
        }
    },

    /**
     * The read side, kept deliberately small.
     *
     * Perch does not render anything: it answers with what it saw and lets a
     * site draw it. That is what makes it reusable — a status page is somebody
     * else's design, and every monitoring tool that also insisted on being a
     * front end has had to be fought to look like anything.
     */
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === "/api/summary") {
            const readings = await latest(env.DB)
            const by = new Map(readings.map((r) => [r.monitor, r]))

            return json({
                /* Ordered as configured, not as the database felt like. */
                monitors: monitors.map((m) => ({
                    id: m.id,
                    name: m.name,
                    description: m.description ?? null,
                    ...(by.get(m.id) ?? { state: "unknown", at: null, ms: null }),
                })),
            })
        }

        if (url.pathname === "/api/history") {
            const id = url.searchParams.get("monitor")
            const days = Math.min(Number(url.searchParams.get("days") ?? 90), 365)
            if (!id || !monitors.some((m) => m.id === id)) {
                return json({ error: "unknown monitor" }, 404)
            }
            return json({ monitor: id, days: await history(env.DB, id, days) })
        }

        return json({ error: "not found" }, 404)
    },
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            /* A minute: long enough that a busy page costs one query, short
               enough that an outage is visible while somebody is looking. */
            "cache-control": "public, max-age=60",
            /* The status page is served from another origin. Nothing here is
               private — it is the same thing the page shows to everyone. */
            "access-control-allow-origin": "*",
        },
    })
}
