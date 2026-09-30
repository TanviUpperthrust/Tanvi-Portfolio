# tanvi. — portfolio

Tanvi's UI/UX portfolio site, plus a small backend that makes the contact form work and lets Tanvi edit projects and testimonials without touching code.

- **Site:** `public/index.html`
- **Admin panel:** `public/admin.html`, served at `/admin`
- **Server:** Node + Express, with SQLite through Node's built-in `node:sqlite`, so there are no native modules to compile

## Run it locally

Needs Node 22.13 or newer.

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev               # restarts on file changes
```

Open http://localhost:3000 for the site and http://localhost:3000/admin for the admin panel.

The SQLite database is created at `data/portfolio.db` on first run. It is seeded with the four projects and three testimonials that used to be hard-coded in the page.

Run the tests with `npm test`.

## What the backend does

**Contact form.** The form in the Contact section posts to `/api/contact`. Each message is validated and saved to the database, and appears in the admin inbox. If SMTP is configured, the server also emails the message to `MAIL_TO`, with Reply-To set to the sender so replying goes straight to them. Spam protection:

- a hidden honeypot field (bots that fill it in get a fake success)
- a limit of 5 submissions per IP every 15 minutes

**Content.** The "Selected work" and "Kind words" sections load from `/api/projects` and `/api/testimonials`. If the API can't be reached (for example, when the HTML file is opened directly), the page keeps the static content that is already in the markup.

**Admin panel** (`/admin`), behind `ADMIN_PASSWORD`:

- **Messages:** read, mark read or unread, reply by email, delete
- **Projects:** add, edit, reorder, hide or delete projects, including the card's colour and mockup style
- **Testimonials:** the same actions. Wrap a word in `*asterisks*` to make it italic on the site.

Sessions last 7 days, in an HMAC-signed, httpOnly, SameSite=Strict cookie. Login attempts are rate limited.

## Configuration

All settings go in `.env`; see `.env.example` for the full list.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Required to use `/admin`. If it's unset, the admin panel is disabled. |
| `SESSION_SECRET` | Long random string. Without it, admin logins reset every time the server restarts. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Outgoing mail for notifications. Leave `SMTP_HOST` empty to skip email. |
| `MAIL_FROM`, `MAIL_TO` | Sender address and inbox for notifications |
| `TRUST_PROXY` | Set to `1` behind a reverse proxy or HTTPS host. This makes rate limiting see the real visitor IP and marks the session cookie Secure. |
| `DATABASE_PATH`, `PORT` | Defaults: `./data/portfolio.db` and `3000` |

For Gmail, use `smtp.gmail.com`, port 587, and an [app password](https://myaccount.google.com/apppasswords) as `SMTP_PASS`.

## Deploying

The site runs on any host that runs a long-lived Node process and gives it a persistent disk, such as Render, Railway, Fly.io or a VPS. Point `DATABASE_PATH` at the persistent volume, set `TRUST_PROXY=1`, and use `npm start` as the start command. Serverless or static-only hosts (Vercel, Netlify, GitHub Pages) won't work as-is, because the database is a local file.

## API reference

Public:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/projects` | Published projects, sorted |
| GET | `/api/testimonials` | Published testimonials, sorted |
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

## Layout

```
server.js            entry point
src/app.js           Express app, security headers, error handling
src/config.js        environment settings
src/db.js            schema + first-run seed data
src/content.js       project / testimonial field definitions
src/routes/public.js public API + contact form
src/routes/admin.js  admin API
src/auth.js          signed-cookie sessions
src/mail.js          SMTP notifications
src/validate.js      input validation
src/rateLimit.js     in-memory rate limiter
public/              the site and the admin panel
test/                API tests (node --test)
```
