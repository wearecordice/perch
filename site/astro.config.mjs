import { defineConfig } from "astro/config"

// Static. The page is a shell that asks Perch for the readings once it has
// loaded, so it never needs rebuilding to tell the truth — and it can be
// served from anywhere, including from next to nothing.
//
// `site` is only used to write absolute URLs into the feeds, which is where a
// reader's subscription will point. Change it with the domain.
export default defineConfig({
    output: "static",
    site: "https://perch.cordice.org",
})
