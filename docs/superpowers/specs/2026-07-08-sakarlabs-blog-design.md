# Sakar Labs Blog — Design Spec

**Date:** 2026-07-08
**Status:** Approved
**Author:** Team (via brainstorming session)

## Purpose

A team blog for Sakar Labs to publish weekly technical posts about interesting
developments in software and AI. Content-first, fast, cheap to run, and easy for
engineers to contribute to via Git.

## Decisions (locked)

| Area | Decision |
|---|---|
| Authoring | Markdown files committed to Git (PR or direct commit) |
| Framework | Astro (static site generator) |
| Hosting | Self-hosted: Docker container on an Azure VM |
| Serving | nginx serving static build output |
| v1 features | Tags/categories, author profiles, code syntax highlighting, auto reading time |
| Aesthetic | Clean, content-first, technical (Medium structure + Stripe/Vercel sans style) |
| Color mode | Light mode only in v1 |
| TLS/HTTPS | Documented as a follow-up step, not built in v1 |

## Design research summary

Grounded in a review of Stripe, Vercel, Cloudflare, GitHub, Linear, and Uber
engineering blogs plus Medium's reading experience:

- Big-company engineering blogs use a **sans-serif body** and **"Author · Date · tag"**
  metadata; most omit reading time (we include it since it's near-free).
- Medium's structural lessons are the durable ones: **narrow ~68ch reading column**,
  **~20px body text**, **1.6 line-height**, **near-black (not pure black) text**,
  generous whitespace.
- **Code-block quality is the differentiator** for a technical blog: build-time
  syntax highlighting (fast first paint + SEO), a copy button, consistent theme.
- A **single-column list index** (Stripe/Cloudflare) suits a small team blog better
  than a card grid, because it does not depend on every post having cover art.

## Architecture

Astro compiles Markdown posts + `.astro` templates into static HTML/CSS at build
time. No server runtime — nginx serves the built files.

```
sakarlabs/
├── src/
│   ├── content/
│   │   ├── blog/               # one .md file per post
│   │   ├── authors/            # one .md file per team member
│   │   └── config.ts           # type-safe collection schemas
│   ├── layouts/
│   │   ├── BaseLayout.astro     # <head>, header, footer wrapper
│   │   └── PostLayout.astro     # reading view for a single post
│   ├── components/
│   │   ├── PostCard.astro       # a post row on list pages
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── CodeCopyButton.astro
│   ├── pages/
│   │   ├── index.astro          # home = latest posts
│   │   ├── blog/[...slug].astro  # individual post
│   │   ├── tags/index.astro     # all tags
│   │   ├── tags/[tag].astro     # posts for one tag
│   │   └── authors/[id].astro   # author profile + their posts
│   └── styles/global.css        # design tokens + base styles
├── public/                      # static assets, favicon
├── astro.config.mjs
├── Dockerfile
├── nginx.conf
└── README.md                    # "how to write a post" guide for the team
```

**Why Astro:** content collections validate front matter at build time, so a
misspelled field or a reference to a non-existent tag/author fails the build with a
clear error instead of publishing something broken. Ships zero JS by default (only
the copy button needs a tiny script), which keeps the site fast.

## Content model

### Blog post — `src/content/blog/<slug>.md`

```markdown
---
title: "How We Cut Inference Latency by 40%"
description: "Short summary shown on list pages and in link previews."
publishDate: 2026-07-08
author: ishan            # must match a file id in authors/
tags: [AI, Performance]  # validated strings; drive tag pages
draft: false             # true = excluded from build
coverImage: ./cover.png  # optional
---

Post body in Markdown. Fenced code blocks are highlighted automatically.
```

### Author — `src/content/authors/<id>.md`

```markdown
---
name: "Ishan Singh"
role: "ML Engineer"
avatar: ./ishan.jpg      # optional
---

One-paragraph bio shown on the author page.
```

### Schema rules (`config.ts`)

- `blog`: `title` (string, required), `description` (string, required),
  `publishDate` (date, required), `author` (string, required), `tags` (string
  array, default `[]`), `draft` (boolean, default `false`),
  `coverImage` (image, optional).
- `authors`: `name` (string, required), `role` (string, optional),
  `avatar` (image, optional).
- Build fails if a post's `author` does not resolve to an author file.
- `draft: true` posts are excluded from all list pages and route generation.
- **Tags** are plain strings on posts — no separate tag files. Tag pages are
  generated from the union of tags across published posts.
- **Reading time** is auto-computed from word count at build time
  (`reading-time` via a remark plugin) and shown in post metadata.

## Pages & routes

| Route | Content |
|---|---|
| `/` | Home: newest published posts as a single-column list (title, excerpt, `Author · Date · tags · reading time`) |
| `/blog/<slug>` | The post: narrow reading column, highlighted code, author byline, tags |
| `/tags` | All tags with post counts |
| `/tags/<tag>` | Every published post carrying that tag |
| `/authors/<id>` | Author bio + list of that author's posts |

- Index is reverse-chronological.
- No pagination in v1 (add when posts exceed ~30; trivial in Astro).

## Design system

Clean, content-first, technical. Light mode only in v1. All values expressed as
CSS custom properties in `global.css` so restyling (including a future dark mode)
is a contained change.

- **Layout:** reading column `max-width: 68ch`, centered, `margin-inline: auto`,
  `1.25rem` side padding on mobile. Images/code figures may break out wider than
  the prose column via a `.wide` utility.
- **Typography:** system sans stack
  (`-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif`);
  body `1.125rem` at `line-height: 1.6`; headings weight 600–700, `line-height: 1.25`,
  sizes on a ~1.25 scale (H1 `2.25rem`, H2 `1.75rem`, H3 `1.375rem`);
  paragraph spacing `margin-bottom: 1.5em`.
- **Color (light):** background `#ffffff` (page `#fafafa`), body text `#242424`,
  muted metadata `#6b7280`, link accent `#2563eb` (underline on hover), hairline
  borders `#e5e7eb`. Body contrast target ≥ 7:1.
- **Code blocks:** Shiki highlighting at build time, `github-light` theme,
  `border-radius: 8px`, `padding: 1rem 1.25rem`, `font-size: 0.875rem`,
  `overflow-x: auto`, monospace stack
  (`ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Code", monospace`),
  a copy button, and an optional language label. Inline code gets a subtle tinted
  background (`#f1f5f9`), small padding, `border-radius: 4px`.

## Deployment (Docker → Azure VM)

Two-stage Dockerfile:

1. **Build stage** (`node:lts-alpine`): `npm ci && npm run build` → static files in
   `dist/`.
2. **Serve stage** (`nginx:alpine`): copy `dist/` into the nginx web root; serve it.
   Final image ~30–50 MB, no Node at runtime.

```bash
# On the Azure VM:
docker build -t sakarlabs-blog .
docker run -d -p 80:80 --restart unless-stopped sakarlabs-blog
```

- `nginx.conf` includes gzip, sensible cache headers, and clean-URL handling.
- README documents the rebuild/redeploy one-liner for the team.
- **TLS/HTTPS** (e.g. nginx + Let's Encrypt, or a Caddy reverse proxy) is documented
  as a follow-up step, not built in v1.

## Verification

- `npm run build` succeeds — this alone validates every post's schema and author
  references (the primary correctness gate).
- Repo ships with one sample post + one author so `npm run dev` renders a working
  site immediately (home, a post with a highlighted code block, a tag page, an
  author page).
- Manual check via the local dev server: home lists the post; the post page shows
  highlighted code with a working copy button; tag and author pages resolve.

## Out of scope for v1 (YAGNI)

All deferrable and easy to add later:

- Comments
- RSS/Atom feed
- Dark mode
- Full-text search
- Newsletter signup
- Pagination
- Web CMS editor / visual authoring

## Success criteria

- An engineer can add a post by creating one Markdown file and committing it.
- A bad post (missing/typo'd field, unknown author) fails the build with a clear
  error rather than shipping broken.
- Built site is static, loads fast, and renders technical posts with cleanly
  highlighted code.
- `docker build` + `docker run` serves the site on the Azure VM with no runtime
  dependencies beyond nginx.
