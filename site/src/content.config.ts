import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

/**
 * Incidents are files in this repository, not rows in a database.
 *
 * A monitor can say "it stopped answering" and nothing else. It cannot say
 * why, what is being done, that only some people are affected, or that the
 * thing returning 200 is returning the wrong 200. Those are written by a
 * person, and a person writing them into git gets review, history and an undo
 * for free — and Perch needs no admin login, no session, and no form to
 * defend.
 *
 * The cost is that publishing an incident is a deploy. For a status page that
 * is the right trade: the words are worth a second pair of eyes, and the page
 * is static so the deploy is seconds.
 */
const incidents = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/incidents" }),
    schema: z.object({
        /** What a reader sees first. Name the effect, not the cause. */
        title: z.string(),

        /* How bad, in the words a status page has always used. "maintenance"
           is planned and is not a failure — it is coloured differently and
           left out of availability. */
        severity: z.enum(["degraded", "partial", "major", "maintenance"]),

        /** Monitor ids this touched, so the right rows carry it. */
        affected: z.array(z.string()).default([]),

        started: z.coerce.date(),
        /** Absent means it is still going. */
        resolved: z.coerce.date().optional(),

        /**
         * The timeline, oldest first.
         *
         * Each entry is a state and a sentence. The states are the ones every
         * status page uses, because a reader who has seen one has seen them
         * all and this is not the place to be original.
         */
        updates: z
            .array(
                z.object({
                    at: z.coerce.date(),
                    state: z.enum([
                        "investigating",
                        "identified",
                        "monitoring",
                        "resolved",
                    ]),
                    body: z.string(),
                }),
            )
            .default([]),
    }),
})

export const collections = { incidents }
