# Sakar Labs Homepage — Design

**Date:** 2026-07-08
**Status:** Approved (ideated via the brainstorming visual companion)

## Goal

Turn the plain post-list home page into a landing page with presence, where the
weekly blog is one section among several. Direction chosen by the team: **playful
& animated**, but "unique, meticulously crafted, yet simple" — one signature
motion, restrained, cohesive with the content-first reading pages.

## Hero — "Quiet field" (merged concept)

A canvas particle field on the light canvas, evolved from three explored ideas:

- **Base:** dozens of dots drift slowly at a calm density (`~W*H/9000`).
- **Cursor interaction:** dots within ~140px brighten grey → blue/violet and draw
  faint connecting lines to the cursor.
- **Aurora (from concept A):** a soft blue→violet radial glow follows the cursor;
  two faint blurred colour blobs drift behind.
- **Terminal (from concept B):** a monospace eyebrow types out
  `sakar-labs ~ notes --weekly` with a blinking caret.
- Headline **"Notes from the lab."** rises in with a staggered reveal; an accent
  word cycles *software → AI → systems → craft*.
- **Accessibility:** the whole animation is gated behind
  `prefers-reduced-motion`. Reduced-motion users get a static hero (no canvas
  loop, no typing, first accent word shown). The canvas is `aria-hidden`; the
  `<h1>` is the real accessible title.

Implemented in `src/components/Hero.astro` (scoped CSS + one bundled client
script; the script is small enough that Astro inlines it).

## Page composition

`src/pages/index.astro`, full-bleed (BaseLayout gained a `mainClass` prop so the
home `<main>` is not width-constrained; each section sets its own width):

1. **Hero** (full-bleed).
2. **About Sakar Labs** — short intro paragraph, 68ch column.
3. **Weekly blog** — section heading + "View all posts →" link; newest post as a
   larger **FeaturedPost** card, then up to 4 recent posts as the existing
   `PostCard` list.
4. **Browse by topic** — pill chips per tag (with counts) linking to tag pages.
5. **Meet the team** — grid of author cards (gradient-initial avatar, name, role)
   linking to author pages.

New supporting routes/components:

- `src/components/FeaturedPost.astro` — larger card for the latest post.
- `src/pages/blog/index.astro` — `/blog` archive (full post list), the target of
  "View all posts" and the header "Blog" nav link.
- Header nav updated: **Blog → /blog**, Tags → /tags.

## Constraints kept

- No new dependencies. Still zero client runtime except the small hero script.
- Same design tokens and light-mode palette as the reading pages.
- `npm run build` remains the correctness gate (schemas + references validated).

## Out of scope (unchanged)

Newsletter/subscribe was offered but deferred (needs a backend). RSS, dark mode,
search, comments, pagination remain roadmap items.
