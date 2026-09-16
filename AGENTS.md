# Agent notes for [bradfordcp.io](http://bradfordcp.io)

Personal site for Christopher Bradford. Content lives in Markdown; Hugo renders it with a custom TUI theme.

## Engine: Hugo

This is a **Hugo** static site. Site config is `config.toml` (not `hugo.toml`). The live site is `https://bradfordcp.io/`.

- **Minimum Hugo version:** 0.124.0.
- **Goldmark** renders Markdown. `markup.goldmark.renderer.unsafe = true`, so raw HTML in content is allowed.
- **Taxonomies:** `tags`, `categories`, `series`, `authors`.
- **Pagination:** 6 items per page.

Common commands:

```sh
hugo server          # local preview at http://localhost:1313/
hugo                 # production build into public/
hugo new posts/slug.md
hugo new posts/slug/index.md   # page bundle (use when the post has images)
hugo new talks/slug.md
hugo new projects/slug.md
```

Do not edit `public/` or `resources/_gen/` by hand. `public/` is generated and gitignored. GitHub Actions (`.github/workflows/deploy.yml`) builds with `hugo` and deploys `public/` to Google Cloud Storage: non-`main` branches to `gs://staging.bradfordcp.io/`, `main` to `gs://bradfordcp.io/`.

## Theme: tui

Active theme: **tui**, a local terminal UI theme inspired by `htop` and `k9s`. It lives at `themes/tui/`.

```
config.toml          theme = "tui"
themes/tui           local theme (layouts, CSS, keyboard JS)
```

Override theme templates in this repo's `layouts/` only when necessary. Prefer changing `themes/tui/` so the TUI stays self-contained.

Site-level params under `[params]` in `config.toml` (author, `info` roles, date format, social links). Nav is `[[languages.en.menu.main]]` (Posts → `posts`, Talks → `talks`, Projects → `projects`). Homepage social cards use the GitHub and LinkedIn entries in `[[params.social]]`.

TUI chrome (title bar breadcrumbs, function-key status bar, keyboard help) is implemented in the theme. Keyboard behavior:

- `Tab` / `Shift+Tab` move between links; the focused link is reverse-video highlighted
- `j` / `k` and arrow keys move focus; mouse hover and click still work
- `1`–`4` jump Home / Posts / Talks / Projects
- `g` / `l` open GitHub / LinkedIn
- `n` / `p` paginate
- `?` toggles the keymap overlay; `Esc` closes it or returns home

Breadcrumbs in the title bar:

- `Christopher Bradford`
- `Christopher Bradford > Posts`
- `Christopher Bradford > Posts > {title}`
- `Christopher Bradford > Projects`
- `Christopher Bradford > Talks`

List/RSS templates treat `externalLink` (and `external_url` as a fallback) as the click-through URL for posts and talks. They show `external_source` as the original publisher when present. Project lists link to the local project page; the GitHub host is a separate outbound link from `external_url`.

Static assets: `static/favicon.ico`, `static/images/avatar.jpg`. Page-specific images belong in the post's page bundle, not `static/`.

## Content layout

```
content/
  posts/       blog posts (section: posts)
  talks/       speaking engagements that link out (section: talks)
  projects/    open-source and personal projects (section: projects)
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

With images or other assets, create a **page bundle** (`content/posts/the-slug/index.md` plus files next to it) and reference them with relative paths or Hugo `figure` shortcodes.

### `archetypes/projects.md`

Project entries on `/projects/`. Front matter drives the list; the Markdown body is the project page.

```yaml
draft: true
title: "Project Name"
description: ""
role: ""
organization: ""
external_url: "https://github.com/bradfordcp/foo"
technologies: []
tags: []
weight: 0
```

- `description` is the summary shown on the list and the project page.
- `role` and `organization` are the association (for example Product Manager at DataStax); do not claim sole authorship unless that is in `experience/projects.md`.
- `external_url` is the outbound repo or product link (not `externalLink`).
- `technologies` is a list rendered as a separator-joined line.
- `weight` orders the list (lower first). DataStax OSS is 1–3, OpenSource Connections OSS is 4–6, personal GitHub projects are 20+.
- Put highlights in the Markdown body. Open-source entries should be derived from Work Experience `experience/projects.md`, not invented.

### `archetypes/talks.md`

Speaking engagements on `/talks/`: conference sessions, webinars, podcasts, and interviews. Entries **list on this site and link out**; they are not rendered as local pages. Prefer video, then the event or podcast page, then slides.

```yaml
draft: true
date: {{ .Date }}
title: ""
slug: ""
format: conference          # conference | webinar | podcast | interview
event: ""                   # Spark Summit, Linux Foundation, …
description: ""
external: true
externalLink: ""            # YouTube, webinar, podcast, or slides URL
external_source: ""         # YouTube, SlideShare, Spring, …
build:
  render: never
  list: always
  publishResources: false
```

- `format` and `event` are shown on the list next to the date.
- `externalLink` is the click-through URL (same key as external posts). `external_url` also works as a fallback in list/RSS templates.
- Keep the Markdown in git as a backup. Open the body with a short note and the outbound link.
- Populate from Work Experience `experience/profile.md` (Talks, Webinars, & Interview). Do not invent talks or dates.

### `archetypes/default.md`

Fallback for `hugo new` paths that do not match a named archetype (`title`, `date`, `draft`). Prefer a named archetype instead.

## Conventions

- Keep new content `draft: true` until it is ready to publish.
- Do not copy theme templates into `layouts/` unless you are overriding them.
- When adding or changing list-link behavior, keep `externalLink` (posts and talks) and `external_url` (projects) working in both HTML lists and RSS.
- Do not commit secrets, generated CSS under `resources/_gen/`, or `.hugo_build.lock`.

## Validation

The site must always build. After all change ensure that the site can be rendered successfully.
