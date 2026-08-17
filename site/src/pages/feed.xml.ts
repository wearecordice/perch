import type { APIRoute } from "astro"
import { entries, escape } from "../lib/feed"

/** RSS 2.0. The format most readers still speak. */
export const GET: APIRoute = async ({ site }) => {
    const origin = (site ?? new URL("https://perch.cordice.org")).origin
    const items = await entries(origin)

    const body = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cordice Status</title>
    <link>${origin}/</link>
    <description>Incidents affecting Cordice.</description>
    <language>en</language>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
${items
    .map(
        (entry) => `    <item>
      <title>${escape(entry.title)}</title>
      <link>${entry.url}</link>
      <guid isPermaLink="true">${entry.url}</guid>
      <pubDate>${entry.published.toUTCString()}</pubDate>
      <description>${escape(entry.summary)}</description>
      <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[${entry.html}]]></content:encoded>
    </item>`,
    )
    .join("\n")}
  </channel>
</rss>
`

    return new Response(body, {
        headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=600",
        },
    })
}
