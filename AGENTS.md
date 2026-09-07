# Agent notes for bradfordcp.io

Personal site for Christopher Bradford. Content lives in Markdown; Hugo renders it with the hugo-coder theme.

## Engine: Hugo

This is a **Hugo** static site. Site config is `config.toml` (not `hugo.toml`). The live site is `https://bradfordcp.io/`.

- **Minimum Hugo version:** 0.124.0 (required by the theme).
- **Goldmark** renders Markdown. `markup.goldmark.renderer.unsafe = true`, so raw HTML in content is allowed.
- **Taxonomies:** `tags`, `categories`, `series`, `authors`.
- **Pagination:** 6 items per page.

After cloning, initialize the theme submodule:

```sh
git submodule update --init
```

Common commands:

```sh
hugo server          # local preview at http://localhost:1313/
hugo                 # production build into public/
hugo new posts/slug.md
hugo new posts/slug/index.md   # page bundle (use when the post has images)
hugo new projects/slug.md
hugo new roles/slug.md
```

Do not edit `public/` or `resources/_gen/` by hand. `public/` is generated and gitignored. CircleCI builds with `hugo -v` and deploys `public/` to Google Cloud Storage.

## Theme: hugo-coder

Theme: **[hugo-coder](https://github.com/luizdepra/hugo-coder)** (Luiz de Prá), MIT, git submodule at `themes/hugo-coder`.

```
config.toml          theme = "hugo-coder"
.gitmodules          themes/hugo-coder → git@github.com:luizdepra/hugo-coder.git
```

Do not change files under `themes/hugo-coder/`. Override behavior in this repo's `layouts/` instead.

Site-level theme params live under `[params]` in `config.toml` (author, avatar, color scheme `auto`, Font Awesome, social links). Nav is `[[menu.main]]` (Blog → `posts`, Projects → `projects`).

This repo already overrides:

| Override | Role |
|---|---|
| `layouts/_partials/list.html` | List pages; each item uses `post-list-item.html` |
| `layouts/_partials/post-list-item.html` | Post/project list row; supports local and external links |
| `layouts/posts/li.html` | Posts section list item; delegates to `post-list-item.html` |
| `layouts/section/projects.html` | Projects index |
| `layouts/_default/rss.xml` | RSS items use `externalLink` / `external_url` when set |

Static assets: `static/favicon.ico`, `static/images/avatar.jpg`. Page-specific images belong in the post's page bundle, not `static/`.

## Content layout

```
content/
  posts/       blog posts (section: posts)
  projects/    project cards linking out to GitHub (section: projects)
  roles/       work/role entries
archetypes/    templates used by `hugo new`
```

Prefer **YAML** front matter (`---`) for new files. Older posts often use TOML (`+++`); leave those as-is unless you are rewriting the file.

## Archetypes

Hugo picks the archetype from the first path segment (`hugo new posts/foo.md` → `archetypes/posts.md`). Do not invent front matter keys; start from the matching archetype.

### `archetypes/posts.md`

Blog posts. Two publishing modes:

**Local-first** (published on this site): leave `external` false and do not set `build`. The Markdown is the canonical page.

**External** (originally published elsewhere): set `external: true`, fill `externalLink` and `external_source`, and uncomment the `build` block so Hugo lists the post but does not emit a public HTML page. Keep the Markdown (and any bundle files) in git as a backup. Open the body with a short “originally published on …” note.

```yaml
draft: true
date: {{ .Date }}
title: ""
slug: ""
tags: []
categories: []
description: ""
external: false
externalLink: ""
external_source: ""
# build:                 # uncomment for external posts
#   render: never
#   list: always
#   publishResources: false
```

List/RSS templates treat `externalLink` (and `external_url` as a fallback) as the click-through URL. They show `external_source` as the original publisher when present.

With images or other assets, create a **page bundle** (`content/posts/the-slug/index.md` plus files next to it) and reference them with relative paths or Hugo `figure` shortcodes.

### `archetypes/projects.md`

Project entries. These are cards on `/projects/` that usually point at a GitHub repo.

```yaml
draft: true
title: "Project Name"
external_url: "https://github.com/bradfordcp/foo"
description: ""
weight: 0
```

Use `external_url` for the outbound link (not `externalLink`). `weight` orders the list when dates are absent. Most existing projects have little or no body copy; the description and link are the page.

### `archetypes/roles.md`

Work / role entries under `content/roles/`.

```yaml
draft: true
name: "Project Name"
description: ""
weight: 0
```

`name` is the display label in the archetype. Fill `description` and `weight`; add a body when the role needs narrative.

### `archetypes/talks.md`

Talks / speaking. No `content/talks/` tree exists yet; create it when adding the first talk. This archetype still uses TOML. `external_url` is the outbound talk or slide link.

### `archetypes/default.md`

Fallback for `hugo new` paths that do not match a named archetype (`title`, `date`, `draft`). Prefer a named archetype instead.

## Conventions

- Keep new content `draft: true` until it is ready to publish.
- Do not copy theme templates into `layouts/` unless you are overriding them. Prefer the smallest override that preserves hugo-coder markup and CSS classes (`container list`, `title`, `date`).
- When adding or changing list-link behavior, keep `externalLink` (posts) and `external_url` (projects) working in both HTML lists and RSS.
- Do not commit secrets, generated CSS under `resources/_gen/`, or `.hugo_build.lock`.
