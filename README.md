# Perch

A status page that watches from somewhere else.

A perch is a place above and apart from the ground — which is the whole idea. A
status page hosted next to the thing it watches goes quiet exactly when
somebody needs it, so Perch runs on Cloudflare's edge: the checks, the
database, and the answers a page draws from. Your servers can be entirely
gone and this still works and says so.

It is small on purpose. Perch collects and answers; it does not render. A
status page is somebody's design, and every monitoring tool that insisted on
being a front end as well has had to be fought to look like anything.

> **In use** at [status.cordice.org](https://status.cordice.org) — Cordice's public status page
> (11 November 2026). Alerts to the team come from a separate monitor (Phare) watching the same
> addresses; a third, GitHub-based record (Upptime) keeps an independent history.

## What it does

- Checks HTTP endpoints and TCP ports on a schedule, from Cloudflare.
- Asserts on more than a status code — response body and headers — because a
  proxy whose backend has gone will answer the front page with a 200.
- Records three states, not two. Something that answers too slowly is
  `degraded`, which is the state most tools omit and then cannot explain a bad
  afternoon with.
- Keeps per-probe detail for a window and day summaries for good, so drawing a
  year of history is cheap.
- Answers `/api/summary` and `/api/history` as JSON, for whatever draws them.

## What it also does

- Draws the page itself: an overall banner, ninety days of bars per component, days you can open.
- Incidents as files in git (`site/src/content/incidents/`), with the timeline every status page uses
  (investigating → identified → monitoring → resolved), and Atom/RSS feeds to subscribe to.
- Knows a component before it launches (`enabled: false` in `src/monitors.ts`): described, not probed,
  not shown — so the launch is one line and the id already has its place.

## Running your own

```sh
npm install
npx wrangler d1 create perch      # put the id it prints into wrangler.toml
npm run schema                    # create the tables
npm run deploy
```

Then edit [`src/monitors.ts`](src/monitors.ts) — it is the one file you have
to change, and it is TypeScript rather than YAML so that a typo in a monitor
is caught when the worker is built, not at three in the morning when the check
that was silently never running turns out to have been the important one.

## Where checks run from

One place, today: a Cloudflare cron fires where it fires, and you do not
choose. Every row recorded still carries the region it came from, because a
status page that cannot tell "the service is down" from "one probe could not
reach it" will eventually lie, and adding vantage points later must not mean
rewriting what was already recorded.

The interesting part of multi-region is not where to get the probes — several
routes exist, including open networks like Globalping — but deciding what a
disagreement means. One failure in five is usually that probe's network. That
threshold is a design decision, and it is why this is not simply switched on.

## Cost

It is built to sit inside Cloudflare's free tier: ten monitors every five
minutes is 288 cron runs a day and about 2,900 rows written, against limits
counted in the tens of thousands. Storage is a few megabytes a year.

## Licence

MIT. It is a tool: take it, change it, do not credit us if you would rather
not.
