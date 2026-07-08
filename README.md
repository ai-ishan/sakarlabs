# Sakar Labs Blog

A fast, static technical blog for the Sakar Labs team — weekly posts on software and AI.
Built with [Astro](https://astro.build), served as static files by nginx.

## Write a post

1. Create `src/content/blog/<your-slug>.md`:

   ```markdown
   ---
   title: "Your Post Title"
   description: "One-sentence summary shown on the home page."
   publishDate: 2026-07-08
   author: ishan            # must match a file in src/content/authors/
   tags: [AI, Performance]
   draft: false             # set true to keep it out of the build
   ---

   Your post in Markdown. Fenced code blocks are highlighted automatically.
   ```

2. Add yourself as an author once — `src/content/authors/<you>.md`:

   ```markdown
   ---
   name: "Your Name"
   role: "Your Role"
   ---

   One-paragraph bio.
   ```

3. Commit and open a PR (or push). A bad post (missing field, unknown author)
   fails the build, so broken posts never ship.

The site has these pages: home (latest posts), individual post pages,
`/tags` and `/tags/<tag>`, and `/authors/<id>`.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs the static site to dist/
npm run preview  # serve the production build locally
```

## Deploy (Docker on the Azure VM)

```bash
docker build -t sakarlabs-blog .
docker run -d -p 80:80 --restart unless-stopped --name sakarlabs-blog sakarlabs-blog
```

To redeploy after new posts land:

```bash
git pull
docker build -t sakarlabs-blog .
docker rm -f sakarlabs-blog
docker run -d -p 80:80 --restart unless-stopped --name sakarlabs-blog sakarlabs-blog
```

The image is a two-stage build: `node:lts-alpine` compiles the site, then
`nginx:alpine` serves the static output (final image ~30–50 MB, no Node at runtime).

### TLS / HTTPS (follow-up)

v1 serves plain HTTP on port 80. To add HTTPS, put a reverse proxy in front
(Caddy with automatic Let's Encrypt, or nginx + certbot) terminating TLS and
forwarding to this container. Not included in v1.

## Roadmap (deliberately out of v1)

Easy to add later: RSS feed, dark mode, full-text search, comments,
newsletter signup, and pagination.

## Stack

Astro 5 · Shiki (build-time syntax highlighting) · nginx · Docker

## Project docs

Design spec and implementation plan live in `docs/superpowers/`.
