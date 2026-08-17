import type { Result, State } from "./types"

/**
 * Everything that touches the database.
 *
 * Writes go in one batch per run. D1 charges by the statement and a run is ten
 * of them; batching also means a run either lands or does not, rather than
 * leaving half a minute recorded.
 */
export async function record(db: D1Database, results: Result[]): Promise<void> {
    if (results.length === 0) return

    const insert = db.prepare(
        `INSERT OR REPLACE INTO checks (monitor, region, at, state, status, ms, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )

    /* The day summary is folded forward on write rather than computed on read.
       ms is only counted when there was one, so an outage does not drag the
       average towards zero and make a bad day look fast. */
    const rollUp = db.prepare(
        `INSERT INTO days (monitor, day, up, degraded, down, ms_total, ms_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (monitor, day) DO UPDATE SET
             up       = up + excluded.up,
             degraded = degraded + excluded.degraded,
             down     = down + excluded.down,
             ms_total = ms_total + excluded.ms_total,
             ms_count = ms_count + excluded.ms_count`,
    )

    await db.batch([
        ...results.map((r) =>
            insert.bind(r.monitor, r.region, r.at, r.state, r.status, r.ms, r.note),
        ),
        ...results.map((r) =>
            rollUp.bind(
                r.monitor,
                new Date(r.at * 1000).toISOString().slice(0, 10),
                r.state === "up" ? 1 : 0,
                r.state === "degraded" ? 1 : 0,
                r.state === "down" ? 1 : 0,
                r.ms ?? 0,
                r.ms === null ? 0 : 1,
            ),
        ),
    ])
}

/**
 * Drops raw checks older than the retention window.
 *
 * The day summaries are kept: they are two rows a month per monitor and they
 * are what the history is drawn from. It is the per-probe detail that grows
 * without bound and stops being interesting once nobody is investigating.
 */
export async function forget(db: D1Database, days: number): Promise<void> {
    const cutoff = Math.floor(Date.now() / 1000) - days * 86_400
    await db.prepare(`DELETE FROM checks WHERE at < ?`).bind(cutoff).run()
}

export interface Summary {
    monitor: string
    state: State | "unknown"
    at: number | null
    ms: number | null
}

/** The newest reading for every monitor: what a status page opens with. */
export async function latest(db: D1Database): Promise<Summary[]> {
    const { results } = await db
        .prepare(
            `SELECT c.monitor, c.state, c.at, c.ms
             FROM checks c
             JOIN (SELECT monitor, MAX(at) AS at FROM checks GROUP BY monitor) newest
               ON newest.monitor = c.monitor AND newest.at = c.at
             GROUP BY c.monitor`,
        )
        .all<{ monitor: string; state: State; at: number; ms: number | null }>()

    return results.map((r) => ({
        monitor: r.monitor,
        state: r.state,
        at: r.at,
        ms: r.ms,
    }))
}

export interface Day {
    day: string
    up: number
    degraded: number
    down: number
    ms: number | null
}

/** The bars: one row per day per monitor, oldest first. */
export async function history(
    db: D1Database,
    monitor: string,
    days: number,
): Promise<Day[]> {
    const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

    const { results } = await db
        .prepare(
            `SELECT day, up, degraded, down, ms_total, ms_count
             FROM days WHERE monitor = ? AND day >= ? ORDER BY day ASC`,
        )
        .bind(monitor, from)
        .all<{
            day: string
            up: number
            degraded: number
            down: number
            ms_total: number
            ms_count: number
        }>()

    return results.map((r) => ({
        day: r.day,
        up: r.up,
        degraded: r.degraded,
        down: r.down,
        ms: r.ms_count ? Math.round(r.ms_total / r.ms_count) : null,
    }))
}
