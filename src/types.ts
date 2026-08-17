/** What Perch knows how to say about a service. */
export type State = "up" | "degraded" | "down"

/**
 * A thing that must be true of a response before the service counts as up.
 *
 * A status code alone proves that something answered, not that the right thing
 * answered: a proxy whose backend is gone will happily return the front page
 * with a 200. Every monitor should assert on something only that service says.
 */
export type Assertion =
    | { type: "status"; in: number[] }
    | { type: "body"; contains: string }
    | { type: "header"; name: string; contains: string }

export interface Monitor {
    /** Stable across renames — it is the primary key of everything recorded. */
    id: string
    /** What a reader sees. */
    name: string
    /** Shown under the name on the status page, when there is more to say. */
    description?: string

    request:
        | { protocol: "http"; url: string; method?: string }
        /** A connection that opens is the whole test; there is no body. */
        | { protocol: "tcp"; host: string; port: number }

    assertions?: Assertion[]

    /**
     * Answering above this is "degraded" rather than "up".
     *
     * Worth setting per monitor and worth setting low. A default of a minute,
     * which is what most tools ship, means degraded is never reached and the
     * page draws three states while only ever showing two.
     */
    degradedAfterMs?: number

    /** Give up after this. Below the runtime's own ceiling, deliberately. */
    timeoutMs?: number
}

/** One probe, as it will be written down. */
export interface Result {
    monitor: string
    region: string
    at: number
    state: State
    status: number | null
    ms: number | null
    note: string | null
}
