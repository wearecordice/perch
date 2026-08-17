-- Perch's whole database.
--
-- Two tables, and the second is only there so a page does not have to read the
-- first. `checks` is the truth: one row per probe, kept for as long as the
-- retention setting says. `days` is a running summary of it, written by the
-- same job that writes the checks, so drawing ninety days of history is one
-- indexed scan of ninety rows per monitor rather than a scan of thousands.
--
-- Every row records where it was probed from. Perch checks from one place
-- today, because a Cloudflare cron fires wherever it fires, but a status page
-- that cannot tell "our service is down" from "one probe could not reach it"
-- is a status page that will eventually lie. Adding vantage points later is a
-- change to the job; it must not be a change to the shape of what was already
-- recorded.

CREATE TABLE IF NOT EXISTS checks (
    monitor    TEXT    NOT NULL,
    -- Where the probe ran. "auto" until we place them deliberately.
    region     TEXT    NOT NULL DEFAULT 'auto',
    -- Unix seconds. Integer rather than text: this column is only ever
    -- compared and bucketed, never read by a person.
    at         INTEGER NOT NULL,
    -- up | degraded | down. Degraded means it answered, but too slowly or
    -- not quite correctly — the state most monitors omit and then cannot
    -- explain a bad afternoon.
    state      TEXT    NOT NULL,
    -- HTTP status, or NULL for protocols that have none.
    status     INTEGER,
    -- Round trip in milliseconds.
    ms         INTEGER,
    -- Why it was not up. Kept short; it is shown to us, not to readers.
    note       TEXT,

    PRIMARY KEY (monitor, region, at)
);

-- The query every page makes: one monitor, newest first, within a window.
CREATE INDEX IF NOT EXISTS checks_by_monitor_time ON checks (monitor, at DESC);

CREATE TABLE IF NOT EXISTS days (
    monitor    TEXT    NOT NULL,
    -- ISO date of the day being summarised, in UTC.
    day        TEXT    NOT NULL,
    up         INTEGER NOT NULL DEFAULT 0,
    degraded   INTEGER NOT NULL DEFAULT 0,
    down       INTEGER NOT NULL DEFAULT 0,
    -- Sum and count rather than an average, so a later check can be folded in
    -- without re-reading everything that came before it.
    ms_total   INTEGER NOT NULL DEFAULT 0,
    ms_count   INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (monitor, day)
);
