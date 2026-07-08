# Sakar Labs Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, static, content-first technical team blog in Astro, containerized with Docker for an Azure VM, and push it to a new GitHub repo.

**Architecture:** Astro compiles Markdown posts + `.astro` templates into static HTML/CSS at build time. Content collections give type-safe front matter and referential integrity (a post's `author` is a validated reference to an author file). Shiki highlights code at build time. A two-stage Docker build produces an nginx image that serves the static output.

**Tech Stack:** Astro 5, TypeScript, Shiki (bundled), `reading-time` + `mdast-util-to-string` (remark plugin), Docker, nginx.

## Global Constraints

- Framework: **Astro 5**, static output (default). No SSR adapter.
- Authoring: Markdown files in `src/content/blog/`; authors in `src/content/authors/`.
- v1 features only: tags, author profiles, build-time code highlighting, auto reading time. **Out of scope:** comments, RSS, dark mode, search, newsletter, pagination, CMS.
- Color: **light mode only**. All colors via CSS custom properties in `src/styles/global.css`.
- Reading column: `max-width: 68ch`, centered. Body `1.125rem` / `line-height: 1.6`. Body text `#242424`, muted `#6b7280`, accent `#2563eb`, borders `#e5e7eb`.
- Code theme: Shiki `github-light`.
- Deploy target: Docker image serving static files via nginx on an Azure VM. TLS is a documented follow-up, not built.
- Node in Docker: `node:lts-alpine` build stage → `nginx:alpine` serve stage.

---

### Task 1: Scaffold Astro project + tooling config

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `remark-reading-time.mjs`
- Create: `.gitignore` (already exists — verify contents)

**Interfaces:**
- Produces: `npm run dev` / `npm run build` scripts; a `remarkReadingTime` remark plugin exporting `minutesRead` into each post's `remarkPluginFrontmatter`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sakarlabs-blog",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "reading-time": "^1.5.0",
    "mdast-util-to-string": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `remark-reading-time.mjs`**

```js
import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // e.g. "3 min read" — surfaced via remarkPluginFrontmatter.minutesRead
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
```

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import { remarkReadingTime } from './remark-reading-time.mjs';

export default defineConfig({
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: false },
    remarkPlugins: [remarkReadingTime],
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Verify `.gitignore` contains build artifacts**

Ensure these lines are present: `node_modules/`, `dist/`, `.astro/`, `.DS_Store`, `*.log`.

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: dependencies resolve; `node_modules/` created; no fatal errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json remark-reading-time.mjs .gitignore
git commit -m "chore: scaffold Astro project and tooling"
```

---

### Task 2: Content collections schema + sample content

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/authors/ishan.md`
- Create: `src/content/blog/welcome-to-sakar-labs.md`

**Interfaces:**
- Produces: two collections. `blog` entries have `data: { title, description, publishDate: Date, author: reference, tags: string[], draft: boolean, coverImage?, }`. `authors` entries have `data: { name, role?, avatar? }`. `author` is a `reference('authors')` so an unknown author fails the build.

- [ ] **Step 1: Create `src/content/config.ts`**

```ts
import { defineCollection, reference, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      publishDate: z.coerce.date(),
      author: reference('authors'),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      coverImage: image().optional(),
    }),
});

const authors = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string().optional(),
      avatar: image().optional(),
    }),
});

export const collections = { blog, authors };
```

- [ ] **Step 2: Create `src/content/authors/ishan.md`**

```markdown
---
name: "Ishan Singh"
role: "ML Engineer"
---

Ishan works on machine learning systems at Sakar Labs and writes about
model performance and applied AI.
```

- [ ] **Step 3: Create `src/content/blog/welcome-to-sakar-labs.md`**

```markdown
---
title: "Welcome to the Sakar Labs Blog"
description: "Why we started this blog and what to expect — weekly notes on interesting problems in software and AI."
publishDate: 2026-07-08
author: ishan
tags: [Announcements, AI]
draft: false
---

Welcome to the Sakar Labs engineering blog. Every week we'll share something
we found interesting while building software and AI systems — a debugging war
story, a performance win, a new tool, or a pattern worth stealing.

## Why a blog?

Writing forces clarity. Explaining a problem to someone else is the fastest way
to understand it yourself.

## A taste of code

Here's the kind of thing you'll see, with syntax highlighting:

```ts
function greet(name: string): string {
  return `Hello, ${name} — welcome to Sakar Labs.`;
}

console.log(greet("reader"));
```

More soon.
```

- [ ] **Step 4: Verify the schema builds**

Run: `npm run build`
Expected: build succeeds, generating `dist/`. (Confirms schemas parse and the `author: ishan` reference resolves.)

- [ ] **Step 5: Negative check — bad author fails the build**

Temporarily change the sample post's `author: ishan` to `author: nobody`, run `npm run build`, and confirm it FAILS with a reference error. Then revert to `author: ishan` and confirm it builds again.

- [ ] **Step 6: Commit**

```bash
git add src/content
git commit -m "feat: add content collections schema and sample content"
```

---

### Task 3: Design tokens, base layout, header & footer

**Files:**
- Create: `src/styles/global.css`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produces: `BaseLayout.astro` with props `{ title: string; description?: string }` and a default `<slot />`. Includes global CSS, header, footer, and the code-copy-button script (applies to all `<pre>` on the page).

- [ ] **Step 1: Create `src/styles/global.css`**

```css
:root {
  --bg: #ffffff;
  --bg-muted: #fafafa;
  --text: #242424;
  --text-muted: #6b7280;
  --accent: #2563eb;
  --border: #e5e7eb;
  --code-bg: #f6f8fa;
  --inline-code-bg: #f1f5f9;
  --measure: 68ch;
  --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Code",
    "Roboto Mono", "Courier New", monospace;
}

* { box-sizing: border-box; }

html { font-size: 16px; }
@media (min-width: 800px) { html { font-size: 17px; } }
@media (min-width: 1200px) { html { font-size: 18px; } }

body {
  margin: 0;
  background: var(--bg-muted);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 1.125rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3 { line-height: 1.25; font-weight: 700; }
h1 { font-size: 2.25rem; }
h2 { font-size: 1.75rem; margin-top: 2em; margin-bottom: 0.5em; }
h3 { font-size: 1.375rem; margin-top: 1.5em; margin-bottom: 0.5em; }
p { margin: 0 0 1.5em; }

.container {
  max-width: var(--measure);
  margin-inline: auto;
  padding-inline: 1.25rem;
}

.site-header, .site-footer {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.site-footer { border-top: 1px solid var(--border); border-bottom: none; }

.site-header .inner, .site-footer .inner {
  max-width: 72ch;
  margin-inline: auto;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand { font-weight: 700; color: var(--text); font-size: 1.125rem; }
.nav a { color: var(--text-muted); margin-left: 1.25rem; }

.muted { color: var(--text-muted); }
.meta { color: var(--text-muted); font-size: 0.95rem; }

.tag {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  margin-right: 0.4rem;
}
.tag:hover { color: var(--accent); text-decoration: none; border-color: var(--accent); }

/* Code — Shiki emits <pre class="astro-code"> */
pre {
  position: relative;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
}
pre, code { font-family: var(--font-mono); }
:not(pre) > code {
  background: var(--inline-code-bg);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}
pre:hover .copy-btn { opacity: 1; }
.copy-btn:hover { color: var(--accent); border-color: var(--accent); }

/* Article body may hold wide media */
.prose img { max-width: 100%; height: auto; border-radius: 8px; }
.wide { max-width: 900px; margin-inline: auto; }
```

- [ ] **Step 2: Create `src/components/Header.astro`**

```astro
---
---
<header class="site-header">
  <div class="inner">
    <a class="brand" href="/">Sakar Labs</a>
    <nav class="nav">
      <a href="/">Blog</a>
      <a href="/tags">Tags</a>
    </nav>
  </div>
</header>
```

- [ ] **Step 3: Create `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="inner">
    <span class="muted">© {year} Sakar Labs</span>
    <span class="muted">Weekly notes on software &amp; AI</span>
  </div>
</footer>
```

- [ ] **Step 4: Create `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description?: string;
}
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <Header />
    <main class="container">
      <slot />
    </main>
    <Footer />
    <script>
      document.querySelectorAll('pre').forEach((pre) => {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.textContent = 'Copy';
        btn.addEventListener('click', async () => {
          const code = pre.querySelector('code')?.innerText ?? pre.innerText;
          try {
            await navigator.clipboard.writeText(code);
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 2000);
          } catch {
            btn.textContent = 'Failed';
            setTimeout(() => (btn.textContent = 'Copy'), 2000);
          }
        });
        pre.appendChild(btn);
      });
    </script>
  </body>
</html>
```

- [ ] **Step 5: Add a minimal favicon** `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2563eb"/><text x="16" y="22" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">S</text></svg>
```

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components/Header.astro src/components/Footer.astro src/layouts/BaseLayout.astro public/favicon.svg
git commit -m "feat: add design tokens, base layout, header and footer"
```

---

### Task 4: Post layout + individual post route

**Files:**
- Create: `src/layouts/PostLayout.astro`
- Create: `src/pages/blog/[...slug].astro`

**Interfaces:**
- Consumes: `BaseLayout` (Task 3), the `blog` and `authors` collections (Task 2), `remarkPluginFrontmatter.minutesRead` (Task 1).
- Produces: a static page per non-draft post at `/blog/<id>`.

- [ ] **Step 1: Create `src/layouts/PostLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import { getEntry } from 'astro:content';

interface Props {
  title: string;
  description: string;
  publishDate: Date;
  authorRef: { collection: 'authors'; id: string };
  tags: string[];
  minutesRead?: string;
}
const { title, description, publishDate, authorRef, tags, minutesRead } = Astro.props;
const author = await getEntry(authorRef);
const dateLabel = publishDate.toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
});
---
<BaseLayout title={title} description={description}>
  <article class="prose">
    <h1>{title}</h1>
    <p class="meta">
      <a href={`/authors/${author.id}`}>{author.data.name}</a>
      · {dateLabel}{minutesRead ? ` · ${minutesRead}` : ''}
    </p>
    <p>
      {tags.map((t) => <a class="tag" href={`/tags/${t}`}>{t}</a>)}
    </p>
    <slot />
  </article>
</BaseLayout>
```

- [ ] **Step 2: Create `src/pages/blog/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, remarkPluginFrontmatter } = await render(post);
---
<PostLayout
  title={post.data.title}
  description={post.data.description}
  publishDate={post.data.publishDate}
  authorRef={post.data.author}
  tags={post.data.tags}
  minutesRead={remarkPluginFrontmatter.minutesRead}
>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Build and verify the post renders**

Run: `npm run build`
Expected: build succeeds; `dist/blog/welcome-to-sakar-labs/index.html` exists and contains the highlighted `<pre class="astro-code">` block.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/PostLayout.astro src/pages/blog
git commit -m "feat: add post layout and individual post route"
```

---

### Task 5: Home index + PostCard

**Files:**
- Create: `src/components/PostCard.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: `blog` + `authors` collections, `BaseLayout`.
- Produces: home page listing non-draft posts newest-first.

- [ ] **Step 1: Create `src/components/PostCard.astro`**

```astro
---
import { getEntry } from 'astro:content';

interface Props {
  post: {
    id: string;
    data: {
      title: string;
      description: string;
      publishDate: Date;
      author: { collection: 'authors'; id: string };
      tags: string[];
    };
  };
}
const { post } = Astro.props;
const author = await getEntry(post.data.author);
const dateLabel = post.data.publishDate.toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
});
---
<article style="padding:1.5rem 0;border-bottom:1px solid var(--border);">
  <h2 style="margin:0 0 0.25em;font-size:1.5rem;">
    <a href={`/blog/${post.id}`} style="color:var(--text);">{post.data.title}</a>
  </h2>
  <p class="meta" style="margin:0 0 0.5em;">
    {author.data.name} · {dateLabel}
    {post.data.tags.length > 0 ? ' · ' : ''}
    {post.data.tags.map((t) => <a class="tag" href={`/tags/${t}`}>{t}</a>)}
  </p>
  <p class="muted" style="margin:0;">{post.data.description}</p>
</article>
```

- [ ] **Step 2: Create `src/pages/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';

const posts = (await getCollection('blog', ({ data }) => data.draft !== true))
  .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
---
<BaseLayout title="Sakar Labs Blog" description="Weekly notes on software and AI from the Sakar Labs team.">
  <header style="padding:2rem 0 0.5rem;">
    <h1 style="margin:0 0 0.25em;">Sakar Labs Blog</h1>
    <p class="muted" style="margin:0;">Weekly notes on interesting problems in software and AI.</p>
  </header>
  {posts.map((post) => <PostCard post={post} />)}
</BaseLayout>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `dist/index.html` lists "Welcome to the Sakar Labs Blog" linking to `/blog/welcome-to-sakar-labs/`.

- [ ] **Step 4: Commit**

```bash
git add src/components/PostCard.astro src/pages/index.astro
git commit -m "feat: add home index and post card"
```

---

### Task 6: Tag pages

**Files:**
- Create: `src/pages/tags/index.astro`
- Create: `src/pages/tags/[tag].astro`

**Interfaces:**
- Consumes: `blog` collection.
- Produces: `/tags` (all tags with counts) and `/tags/<tag>` (posts for a tag).

- [ ] **Step 1: Create `src/pages/tags/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = await getCollection('blog', ({ data }) => data.draft !== true);
const counts = new Map<string, number>();
for (const post of posts) {
  for (const tag of post.data.tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
}
const tags = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
---
<BaseLayout title="Tags · Sakar Labs Blog" description="Browse posts by topic.">
  <header style="padding:2rem 0 1rem;">
    <h1 style="margin:0;">Tags</h1>
  </header>
  <ul style="list-style:none;padding:0;">
    {tags.map(([tag, count]) => (
      <li style="padding:0.4rem 0;">
        <a class="tag" href={`/tags/${tag}`}>{tag}</a>
        <span class="muted">{count} post{count === 1 ? '' : 's'}</span>
      </li>
    ))}
  </ul>
</BaseLayout>
```

- [ ] **Step 2: Create `src/pages/tags/[tag].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);
  const tags = new Set<string>();
  for (const post of posts) for (const tag of post.data.tags) tags.add(tag);

  return [...tags].map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((p) => p.data.tags.includes(tag))
        .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()),
    },
  }));
}

const { tag, posts } = Astro.props;
---
<BaseLayout title={`#${tag} · Sakar Labs Blog`} description={`Posts tagged ${tag}.`}>
  <header style="padding:2rem 0 0.5rem;">
    <h1 style="margin:0;">Posts tagged “{tag}”</h1>
  </header>
  {posts.map((post) => <PostCard post={post} />)}
</BaseLayout>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `dist/tags/index.html` and `dist/tags/AI/index.html` (and other tags) generated.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tags
git commit -m "feat: add tag index and per-tag pages"
```

---

### Task 7: Author pages

**Files:**
- Create: `src/pages/authors/[id].astro`

**Interfaces:**
- Consumes: `authors` + `blog` collections, `BaseLayout`, `PostCard`.
- Produces: `/authors/<id>` with bio + that author's posts.

- [ ] **Step 1: Create `src/pages/authors/[id].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

export async function getStaticPaths() {
  const authors = await getCollection('authors');
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);

  return authors.map((author) => ({
    params: { id: author.id },
    props: {
      author,
      posts: posts
        .filter((p) => p.data.author.id === author.id)
        .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()),
    },
  }));
}

const { author, posts } = Astro.props;
const { Content } = await render(author);
---
<BaseLayout title={`${author.data.name} · Sakar Labs Blog`} description={`Posts by ${author.data.name}.`}>
  <header style="padding:2rem 0 0.5rem;">
    <h1 style="margin:0 0 0.25em;">{author.data.name}</h1>
    {author.data.role && <p class="muted" style="margin:0;">{author.data.role}</p>}
  </header>
  <div class="prose"><Content /></div>
  <h2>Posts</h2>
  {posts.map((post) => <PostCard post={post} />)}
</BaseLayout>
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: `dist/authors/ishan/index.html` exists with bio + the welcome post.

- [ ] **Step 3: Commit**

```bash
git add src/pages/authors
git commit -m "feat: add author profile pages"
```

---

### Task 8: Docker + nginx packaging

**Files:**
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `.dockerignore`

**Interfaces:**
- Produces: an nginx image serving `dist/` on port 80.

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
dist
.astro
.git
*.log
```

- [ ] **Step 2: Create `nginx.conf`**

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
  gzip_min_length 256;

  # Astro builds directory-style routes: /blog/post/ -> /blog/post/index.html
  location / {
    try_files $uri $uri/ $uri.html /404.html;
  }

  # Cache immutable build assets aggressively
  location /_astro/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
# --- Build stage ---
FROM node:lts-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Build the image and smoke-test it**

Run:
```bash
docker build -t sakarlabs-blog .
docker run -d --name sakarlabs-test -p 8080:80 sakarlabs-blog
sleep 2
curl -sSf http://localhost:8080/ | grep -q "Sakar Labs Blog" && echo "HOME OK"
curl -sSf http://localhost:8080/blog/welcome-to-sakar-labs/ | grep -q "astro-code" && echo "POST OK"
docker rm -f sakarlabs-test
```
Expected: `HOME OK` and `POST OK` printed; container removed.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile nginx.conf .dockerignore
git commit -m "feat: add Docker + nginx packaging"
```

---

### Task 9: README + create GitHub repo + push

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: contributor + deploy docs; a pushed GitHub repo under account `ai-ishan`.

- [ ] **Step 1: Create `README.md`**

````markdown
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

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs static site to dist/
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

### TLS / HTTPS (follow-up)

v1 serves plain HTTP on port 80. To add HTTPS, put a reverse proxy in front
(Caddy with automatic Let's Encrypt, or nginx + certbot) terminating TLS and
forwarding to this container. Not included in v1.

## Stack

Astro 5 · Shiki (build-time highlighting) · nginx · Docker
````

- [ ] **Step 2: Commit the README**

```bash
git add README.md
git commit -m "docs: add contributor and deployment guide"
```

- [ ] **Step 3: Create the GitHub repo and push**

Run:
```bash
gh repo create sakarlabs --private --source=. --remote=origin --push
```
Expected: repo `ai-ishan/sakarlabs` created; `main` pushed. (Use `--public` instead of `--private` if the blog should be open.)

- [ ] **Step 4: Verify the remote**

Run: `gh repo view --web` (or `git remote -v` + `git log --oneline -5`)
Expected: remote `origin` points to the new repo; commits are present on GitHub.

---

## Self-Review

**Spec coverage:**
- Markdown-in-Git authoring → Tasks 2, 9 (README). ✓
- Astro static site → Task 1. ✓
- Content model (post + author schemas, reference validation, draft, reading time) → Tasks 1, 2, 4. ✓
- Routes: `/`, `/blog/<slug>`, `/tags`, `/tags/<tag>`, `/authors/<id>` → Tasks 4–7. ✓
- Design system (tokens, 68ch column, type scale, colors, code blocks, copy button) → Task 3. ✓
- Deployment (2-stage Docker + nginx, Azure VM) → Task 8, README Task 9. ✓
- Verification (`npm run build` gate, sample content, negative author check) → Tasks 2–8. ✓
- Repo creation + push → Task 9. ✓
- Out-of-scope items → none implemented. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `author` is a `reference('authors')` throughout; consumed via `getEntry(post.data.author)` in PostLayout/PostCard and via `p.data.author.id` in author pages. `minutesRead` produced in Task 1, consumed in Task 4. `post.id` used consistently as the slug. ✓
