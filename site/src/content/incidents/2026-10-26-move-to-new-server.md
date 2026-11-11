---
title: Cordice unavailable while moving to a new server
severity: major
affected: [web-client, api, events, voice, file-service, mail]
started: 2026-10-26T09:00:00Z
resolved: 2026-11-11T14:55:00Z
updates:
  - at: 2026-10-26T09:00:00Z
    state: investigating
    body: >-
      The server Cordice ran on stopped answering. The apps, sign-in, messages
      and calls are unavailable. The website and the developer documentation
      are not affected.
  - at: 2026-11-10T12:00:00Z
    state: identified
    body: >-
      The old server is not coming back. Cordice is moving to a new server of
      its own in Uzbekistan, with user files in encrypted storage and calls on
      a dedicated call service.
  - at: 2026-11-11T14:55:00Z
    state: monitoring
    body: >-
      Cordice is running on the new server. The apps, sign-in by email, files
      and calls work again. Accounts start fresh: data from the old server was
      not carried over.
  - at: 2026-11-11T14:55:00Z
    state: resolved
    body: >-
      Every component is checked again every five minutes, each by the server's
      own test of the service behind it.
---

The previous server had been down since 26 October. Rather than bring it back,
Cordice moved to infrastructure of its own: one server at home in Tashkent behind
an outbound-only tunnel (no open ports), user files encrypted before they reach
storage, and calls end-to-end encrypted on a separate call service.
