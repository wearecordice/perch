import type { APIRoute } from "astro"
import { entries, escape } from "../lib/feed"

/**
 * Atom 1.0.
 *
 * Stricter than RSS and better for this: entries carry both a published and an
 * updated time, so a reader can tell a new incident from one that has just
 * gained an update — which on a status page is the distinction that matters.
 */
export const GET: APIRoute = async ({ site }) => {
    const origin = (site ?? new URL("https://perch.cordice.org")).origin
    const items = await entries(origin)
    const updated = items[0]?.updated ?? new Date(0)

    const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Cordice Status</title>
  <subtitle>Incidents affecting Cordice.</subtitle>
  <link href="${origin}/atom.xml" rel="self"/>
  <link href="${origin}/"/>
  <id>${origin}/</id>
  <updated>${updated.toISOString()}</updated>
${items
    .map(
        (entry) => `  <entry>
    <title>${escape(entry.title)}</title>
    <link href="${entry.url}"/>
    <id>${entry.url}</id>
    <published>${entry.published.toISOString()}</published>
    <updated>${entry.updated.toISOString()}</updated>
    <summary>${escape(entry.summary)}</summary>
    <content type="html"><![CDATA[${entry.html}]]></content>
  </entry>`,
    )
    .join("\n")}
</feed>
`

    return new Response(body, {
        headers: {
            "content-type": "application/atom+xml; charset=utf-8",
            "cache-control": "public, max-age=600",
        },
    })
}
