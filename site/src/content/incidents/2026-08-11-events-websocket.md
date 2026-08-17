---
title: Events server stopped accepting connections
severity: major
affected: [events]
started: 2026-08-11T18:42:00Z
resolved: 2026-08-11T20:00:00Z
updates:
  - at: 2026-08-11T18:42:00Z
    state: investigating
    body: >-
      The live connection is refusing new clients. Messages already sent are
      safe and nothing has been lost, but apps will not receive anything new
      until this is fixed, and reopening the app will not help.
  - at: 2026-08-11T19:15:00Z
    state: identified
    body: >-
      The events service had stopped answering its health path while still
      holding its port, so the proxy kept handing it connections it would not
      take. Restarting it restores service; we are looking at why it wedged.
  - at: 2026-08-11T20:00:00Z
    state: resolved
    body: >-
      Connections have been accepted normally for the last twenty minutes.
      Total time affected was 78 minutes.
---

The monitor caught this one; the explanation is here because a monitor cannot
give one.
