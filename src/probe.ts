import type { Assertion, Monitor, Result, State } from "./types"

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_DEGRADED_MS = 3_000

/**
 * Runs one monitor once and says what it found.
 *
 * It never throws. A probe that fails is a reading, not an error: "we could
 * not reach it" is exactly the thing this program exists to record, and a
 * thrown exception here would lose the other monitors in the same run.
 */
export async function probe(monitor: Monitor, region: string): Promise<Result> {
    const at = Math.floor(Date.now() / 1000)
    const started = Date.now()

    const base = { monitor: monitor.id, region, at }

    try {
        const { state, status, note } =
            monitor.request.protocol === "http"
                ? await probeHttp(monitor)
                : await probeTcp(monitor)

        const ms = Date.now() - started
        const slow = ms > (monitor.degradedAfterMs ?? DEFAULT_DEGRADED_MS)

        return {
            ...base,
            /* Slowness cannot rescue a failure, only spoil a success. */
            state: state === "up" && slow ? "degraded" : state,
            status,
            ms,
            note: state === "up" && slow ? `slow: ${ms}ms` : note,
        }
    } catch (error) {
        return {
            ...base,
            state: "down",
            status: null,
            ms: Date.now() - started,
            note: short(error),
        }
    }
}

async function probeHttp(
    monitor: Monitor,
): Promise<{ state: State; status: number | null; note: string | null }> {
    if (monitor.request.protocol !== "http") throw new Error("not http")

    const response = await fetch(monitor.request.url, {
        method: monitor.request.method ?? "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(monitor.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        headers: { "user-agent": "Perch (+https://github.com/wearecordice/perch)" },
    })

    /* Read the body once, and only when something asks about it: most monitors
       assert on the status alone, and a body we do not need is bandwidth spent
       on every service every five minutes. */
    const wantsBody = (monitor.assertions ?? []).some((a) => a.type === "body")
    const body = wantsBody ? await response.text() : ""

    const assertions = monitor.assertions ?? [{ type: "status", in: [200] }]

    for (const assertion of assertions) {
        const failure = check(assertion, response, body)
        if (failure) return { state: "down", status: response.status, note: failure }
    }

    return { state: "up", status: response.status, note: null }
}

function check(a: Assertion, response: Response, body: string): string | null {
    if (a.type === "status") {
        return a.in.includes(response.status)
            ? null
            : `status ${response.status}, wanted ${a.in.join("/")}`
    }
    if (a.type === "body") {
        return body.includes(a.contains) ? null : `body missing "${a.contains}"`
    }
    const value = response.headers.get(a.name) ?? ""
    return value.includes(a.contains)
        ? null
        : `header ${a.name} missing "${a.contains}"`
}

async function probeTcp(
    monitor: Monitor,
): Promise<{ state: State; status: number | null; note: string | null }> {
    if (monitor.request.protocol !== "tcp") throw new Error("not tcp")

    /* Imported here rather than at the top: the module only exists inside the
       Workers runtime, and a top-level import would stop this file being
       readable anywhere else. */
    const { connect } = await import("cloudflare:sockets")

    const socket = connect({
        hostname: monitor.request.host,
        port: monitor.request.port,
    })

    try {
        /* Opening is the whole test. Waiting for the far end to say something
           would hang on protocols that expect the client to speak first. */
        await socket.opened
        return { state: "up", status: null, note: null }
    } finally {
        await socket.close().catch(() => {})
    }
}

/** Error text fit for a database column, not a stack trace. */
function short(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    return message.slice(0, 200)
}
