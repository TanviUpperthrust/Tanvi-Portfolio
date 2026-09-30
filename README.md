# tanvi. — portfolio

Tanvi's UI/UX portfolio: a home page, a case study page for every project, and an admin panel for editing all of it without touching code.

- **Pages** are rendered on the server from the database, so admin edits show up on the next page load and search engines see real content.
- **Admin panel** lives at `/admin`.
- **Stack:** Node + Express, with SQLite through Node's built-in `node:sqlite`. There is no frontend build step and there are no native modules to compile.

## Run it locally

Needs Node 22.13 or newer.

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev               # restarts when server files change
```

Then open:

- http://localhost:3000, the site
- http://localhost:3000/work/paisa-budgeting-app, an example case study
- http://localhost:3000/admin, the admin panel (sign in with `ADMIN_PASSWORD`)

The SQLite database is created at `data/portfolio.db` on first run. It starts with four projects (including case study write-ups), three testimonials and the site settings. **The case study copy is placeholder writing:** replace it with the real stories in **Admin → Projects**.

To start over with fresh seed content, stop the server and delete `data/portfolio.db*`.

Run the tests with `npm test`.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Home: hero, about stats, services, process, selected work, testimonials, contact form |
| `/work/<slug>` | Case study: summary, client/role/timeline, results, challenge → approach → outcome, and a link to the next project |
| `/admin` | Admin panel |
| `/sitemap.xml`, `/robots.txt` | Generated from the published projects |
| anything else | A styled 404 page |

Other frontend details:

- There's a mobile menu below 960px wide.
- Dark and light themes follow the system setting, with a toggle that remembers the visitor's choice.
- Every page has share-preview (Open Graph) tags and a canonical link. Canonical links need `SITE_URL`.
- The "Ask about this" link on each service card pre-selects that project type in the contact form.
- There's a skip-to-content link, and everything is keyboard-usable. Animations are turned off for visitors whose system is set to reduce motion.

## What Tanvi can edit in /admin

- **Messages:** contact form enquiries. Read them, mark read or unread, reply by email, delete.
- **Projects:** the home page card (title, category, tags, colour, mockup style, order, visibility) and the full case study (page address, summary, client, role, timeline, results, challenge, approach, outcome, live link).
- **Testimonials:** quote, name, role, order, visibility.
- **Site settings:**
  - the availability badge, and whether it shows as available
  - the contact email and footer location
  - LinkedIn, Behance and Dribbble links (empty links are hidden)
  - the four About stats and the three "Kind words" highlights

Formatting in the long text fields:

- A blank line starts a new paragraph.
- Lines starting with `- ` become a bullet list.
- `*word*` becomes italic serif emphasis.
- In project titles, text after a colon ("Paisa: *Budgeting App*") gets the gradient italic treatment on the case study page.

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

Serverless or static-only hosts (Vercel, Netlify, GitHub Pages) won't work as-is, because the database is a local file.

## Security notes

- All JavaScript is served from `/assets`, so the Content-Security-Policy blocks inline scripts entirely.
- Everything entered in the admin panel is HTML-escaped when rendered. Links must be `http(s)`.
- Admin sessions last 7 days, in an HMAC-signed, httpOnly, SameSite=Strict cookie. Login attempts are rate limited.
- The contact form has a honeypot field and a limit of 5 submissions per IP every 15 minutes.

## API reference

Public:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/projects` | Published projects (card fields), sorted |
| GET | `/api/projects/:slug` | One published project, including the case study |
| GET | `/api/testimonials` | Published testimonials, sorted |
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
src/routes/pages.js     server-rendered pages, sitemap, robots, 404
src/routes/public.js    public API + contact form
src/routes/admin.js     admin API
src/views/              page templates (auto-escaping html`` tag)
src/auth.js             signed-cookie sessions
src/mail.js             SMTP notifications
src/validate.js         input validation
src/rateLimit.js        in-memory rate limiter
public/assets/css/      site.css, admin.css
public/assets/js/       theme.js (runs first), site.js (all pages), home.js, admin.js
public/admin.html       admin panel shell
test/                   API and page tests (node --test)
```
