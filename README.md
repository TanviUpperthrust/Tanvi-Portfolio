# Tanvi — UI / UX portfolio

Tanvi's server-rendered portfolio: separate Home, Work, About, Services and Contact pages, service detail pages, project stories, and a private contact inbox.

- **Design:** warm off-white light mode and charcoal dark mode, with a blue accent, variable Archivo typography and Geist Mono labels. The header toggle saves the visitor's choice across every public page. New visitors start in light mode; the saved theme restores before the page renders.
- **Content:** projects and site settings come from SQLite; biography, toolkit and service copy live in source files. Supported admin edits appear on the next page load.
- **Admin panel:** `/admin` manages enquiries, projects and site settings, with retained testimonial and statistics fields for compatibility.
- **Stack:** Node + Express, with SQLite through Node's built-in `node:sqlite`. There is no frontend build step and there are no native modules to compile.

## Run it locally

Needs Node 22.13 or newer.

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD and SESSION_SECRET
npm run import:portfolio  # imports Tanvi's original portfolio once, preserving later edits
npm run dev               # restarts when server files change
```

Then open:

- http://localhost:3000, the site
- http://localhost:3000/work, the project archive
- http://localhost:3000/contact, the enquiry form
- http://localhost:3000/admin, the admin panel (sign in with `ADMIN_PASSWORD`)

The SQLite database is created at `data/portfolio.db` on first run. `npm run import:portfolio` loads the five real projects from Tanvi's earlier Framer portfolio, stores the available project details and original covers, updates contact information, and switches the public showcase to real content. It backs up the database and hides untouched fictional starter projects. Repeating the import preserves later admin edits. See [the content notes](content/README.md) for sources and external case-study limitations.

Home and Work show up to five published projects in their configured order. **Admin → Projects** edits the existing project fields. The optional **Show five project templates** setting is still available in **Admin → Site settings**; the import turns it off. Starting without the import uses the development starter content and clearly marked preparation pages at `/work/project-01` through `/work/project-05`.

To start over with fresh seed content, stop the server and delete `data/portfolio.db*`.

Run the tests with `npm test`.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Large personal introduction, selected work with a sticky preview, horizontal project details, About teaser and a five-card visual services board |
| `/work` | Project archive with List and Grid views |
| `/about` | Biography, portrait placeholder and toolkit |
| `/services` | Five design services, a process overview and ways to work together |
| `/services/<slug>` | Service overview, deliverables, process, FAQs and related work |
| `/contact` | Project type and budget choices, contact details and the enquiry form |
| `/work/<slug>` | Project overview, metadata, visuals and the available challenge, approach, outcome and results; template pages explain that the story is in preparation |
| `/admin` | Admin panel |
| `/sitemap.xml`, `/robots.txt` | Public page, service and current showcase routes; admin/API crawl exclusions |
| anything else | A styled 404 page |

The five service slugs are `full-product-design`, `ux-research`, `ui-design`, `design-systems` and `prototyping`.

Public interactions are implemented in local `studio.css` and `studio.js`: responsive navigation, variable-letter movement in titles and the footer invitation, contextual cursor effects, project previews, portrait tilt, scroll reveals, page transitions and Back to top. The footer turns blue on hover and shows a “Let's go” cursor badge; its lettering stays within the available width as it stretches. The home page has a motion toggle; the shared interactions respect reduced-motion preferences. Native links and readable page content remain available without animation. `contact.js` handles the enquiry choices, validation and `/api/contact` submission.

Pages include Open Graph metadata. Set `SITE_URL` to enable canonical URLs; unfinished template project pages are marked `noindex`.

## What Tanvi can edit in /admin

- **Messages:** contact form enquiries. Read them, mark read or unread, open an email reply, or delete them.
- **Projects:** title, category, tags, visual settings, order, visibility, page address, summary, client, role, timeline, results, challenge, approach, outcome and live link. Publish the real content and disable template mode to use it in the public showcase. Project visuals are generated layouts; there is no image-upload field.
- **Testimonials:** quote, name, role, order and visibility. These remain stored and available through the API, but are not rendered in the current public pages.
- **Site settings:**
  - whether the public showcase uses five templates or published projects
  - the availability badge, and whether it shows as available
  - the contact email and footer location
  - LinkedIn, Behance and Dribbble links (empty links are hidden)
  - the four statistics and three highlights, retained in the database/API but not rendered in the current design

The About biography, portrait placeholder and toolkit are in `src/views/studioPages.js`. Service descriptions, deliverables and FAQs are in `src/studioServices.js`. These are not editable through `/admin`. Home editorial copy and the shared navigation/footer labels are also source-defined.

Formatting in the long text fields:

- A blank line starts a new paragraph.
- Lines starting with `- ` become a bullet list.
- `*word*` becomes italic emphasis in project story text.

Project titles are rendered as plain text in the display typography; a colon does not apply special formatting.

## Configuration

All settings go in `.env`; see `.env.example` for the full list.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Required to use `/admin`. If it's unset, the admin panel is disabled. |
| `SESSION_SECRET` | Long random string. Without it, admin logins reset every time the server restarts. |
| `SITE_URL` | Public address, e.g. `https://tanvi.design`. Used for canonical links, share previews and the sitemap. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Outgoing mail for contact notifications. Leave `SMTP_HOST` empty to skip email. |
| `MAIL_FROM`, `MAIL_TO` | Sender address and inbox for notifications |
| `TRUST_PROXY` | Set to `1` behind a reverse proxy or HTTPS host. This makes rate limiting see the real visitor IP and marks the session cookie Secure. |
| `DATABASE_PATH`, `PORT` | Defaults: `./data/portfolio.db` and `3000` |

For Gmail, use `smtp.gmail.com`, port 587, and an [app password](https://myaccount.google.com/apppasswords) as `SMTP_PASS`.

## Deploying

The site runs on any host that runs a long-lived Node process and gives it a persistent disk, such as Render, Railway, Fly.io or a VPS:

1. Build command `npm install`, start command `npm start`.
2. Mount a persistent disk and point `DATABASE_PATH` at it (e.g. `/data/portfolio.db`). Without one, messages and edits are lost on every deploy.
3. Set `ADMIN_PASSWORD`, `SESSION_SECRET`, `SITE_URL` and `TRUST_PROXY=1`, plus the SMTP settings if you want email notifications.

A static-only deployment, including GitHub Pages, cannot run the contact API or admin panel. Serverless hosting requires changes to the current long-lived process and local SQLite storage model.

## Security notes

- All JavaScript is served from `/assets`, so the Content-Security-Policy blocks inline scripts entirely.
- Everything entered in the admin panel is HTML-escaped when rendered. Link validation allows `http(s)` URLs, local paths and `#anchors`, while rejecting executable URL schemes.
- Admin sessions last 7 days, in an HMAC-signed, httpOnly, SameSite=Strict cookie. Login attempts are rate limited.
- The contact form has a honeypot field and a limit of 5 submissions per IP every 15 minutes.

## API reference

Public:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/projects` | Published database projects (card fields), sorted; independent of the five-template display mode |
| GET | `/api/projects/:slug` | One published project, including the case study |
| GET | `/api/testimonials` | Published testimonials, sorted; retained even though public pages do not currently render them |
| GET | `/api/site` | Site settings |
| GET | `/api/contact/options` | Allowed `topic` / `budget` values |
| POST | `/api/contact` | `{ name, email, message, topic?, budget? }` → `201`, `400` with `fields`, or `429` |

Admin (session cookie required):

| Method | Path |
| --- | --- |
| POST | `/api/admin/login`, `/api/admin/logout` |
| GET | `/api/admin/me` |
| GET | `/api/admin/messages?unread=1&limit=&offset=` |
| PATCH / DELETE | `/api/admin/messages/:id` (PATCH body: `{ read: boolean }`) |
| GET / POST | `/api/admin/projects`, `/api/admin/testimonials` |
| PATCH / DELETE | `/api/admin/projects/:id`, `/api/admin/testimonials/:id` |
| GET / PUT | `/api/admin/site` |

## Layout

```
server.js               entry point
src/app.js              Express app, security headers, error handling
src/config.js           environment settings
src/db.js               schema, in-place migrations, first-run seeding
src/seed.js             starting content (projects, testimonials, site settings)
src/content.js          project / testimonial field definitions, slugs
src/site.js             site settings store + validation
src/showcase.js         five template projects or up to five published projects
src/studioServices.js   source-defined service descriptions and FAQs
src/routes/pages.js     server-rendered pages, sitemap, robots, 404
src/routes/public.js    public API + contact form
src/routes/admin.js     admin API
src/views/home.js       home introduction, selected work and editorial sections
src/views/studioPages.js About, Work, Services, service details and Contact
src/views/project.js    real and template project detail pages
src/views/studioParts.js generated project artwork and shared project cards
src/views/layout.js     shared navigation, footer, metadata and asset loading
src/views/html.js       auto-escaping html`` tag and story text formatting
src/auth.js             signed-cookie sessions
src/mail.js             SMTP notifications
src/validate.js         input validation
src/rateLimit.js        in-memory rate limiter
public/assets/css/      studio.css + appearance.css (public themes), admin.css (admin)
public/assets/js/       studio.js (shared public interactions), appearance.js (saved public theme), contact.js, admin.js
public/assets/js/theme.js saved-theme initializer used by the admin shell
public/admin.html       admin panel shell
test/                   API and page tests (node --test)
```

## Public GitHub Pages site

Run `node scripts/export-static.mjs` to export the current public portfolio from the local database into ignored `dist/`. The export includes 18 public pages and local assets, with paths configured for `https://tanvijain108.github.io/Tanvi-Portfolio/`. Contact enquiries open a drafted email; the Node contact inbox and admin panel remain available only in the server app.

The published files live on the `gh-pages` branch. The source remains on `main` and `feature/frontend`. `node scripts/github-pages.mjs status` checks deployment status using the owner account in Git Credential Manager without storing credentials in the project.
