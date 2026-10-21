# CloudCraft Journal

A cloud and DevOps blog built with React, Express, and MongoDB. It includes posts, authors, comments, bookmarks, an admin dashboard, analytics, a newsletter, AI writing suggestions, external feeds, and SEO endpoints (`robots.txt`, `sitemap.xml`, RSS).

## Stack

- React 19, React Router, Vite
- Node.js 24, Express 5, Mongoose 9
- MongoDB 8
- Docker Compose, nginx, Caddy (automatic HTTPS)

## Project layout

```
Client/                 React application
Client/public/covers/   Sample article cover images
server/                 Express API
scripts/prerender.mjs   Optional SEO prerendering for published posts
scripts/generate-covers.mjs  Cover image generator (Chrome)
Caddyfile               Public reverse proxy and TLS termination
docker-compose.yml      Production-style stack
Dockerfile              API image
```

## Local development

Requirements: Node.js 24 (Node 20+ should work), npm, and either MongoDB 8 or Docker.

```bash
npm install
npm --prefix Client install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`.

Start MongoDB and the app:

```bash
npm run db:up
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api/health

To seed the sample editorial data (12 articles, 6 authors, readers, comments, likes, and subscribers), run the seed script. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` first if you also want an admin account:

```bash
npm run seed
```

Other useful commands:

```bash
npm test                  # API unit tests
npm run client:build      # production frontend build
npm run client:build:seo  # build + prerender (requires Chrome and a running API)
npm run covers:generate   # regenerate the sample cover images (requires Chrome)
npm run db:down           # stop local MongoDB
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Use `production` on the server. |
| `PORT` | `5000` | API port. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin for CORS. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/cloudcraft` | Database connection. Compose overrides this with the internal `mongo` service. |
| `JWT_SECRET` | required | Random string of at least 32 characters. |
| `JWT_EXPIRES_IN` | `7d` | Session token lifetime. |
| `COOKIE_NAME` | `cloudcraft_token` | Auth cookie name. |
| `COOKIE_SECURE` | `true` in production | Set `true` only when served over HTTPS. |
| `PUBLIC_SITE_URL` | local URL | Canonicals, sitemap, RSS, Open Graph. |
| `PUBLIC_API_URL` | local URL | Base URL for uploaded image links. Use the public site URL when `/uploads` is proxied. |
| `UPLOAD_DIR` | `server/uploads` | Upload storage path. |
| `OPENAI_API_KEY` | empty | Enables OpenAI suggestions. Local suggestions are used without it. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for suggestions. |
| `SEED_ADMIN_EMAIL` | empty | Seed script only. |
| `SEED_ADMIN_PASSWORD` | empty | Seed script only, 8+ characters. |

Compose-only variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_ADDRESS` | `http://localhost` | Domain Caddy serves. Use a bare hostname such as `blog.example.com` for automatic HTTPS. |
| `DOCKER_CLIENT_ORIGIN` | `PUBLIC_SITE_URL`, then `http://localhost:8080` | Value passed to the API as `CLIENT_ORIGIN`. |
| `WEB_PORT` | `8080` | Local host port for the web container, bound to `127.0.0.1`. |

Generate a JWT secret with:

```bash
openssl rand -hex 32
```

## Run the full stack with Docker

```bash
cp .env.example .env
# set JWT_SECRET, and for a real domain set SITE_ADDRESS, PUBLIC_SITE_URL,
# PUBLIC_API_URL, DOCKER_CLIENT_ORIGIN, and COOKIE_SECURE=true
docker compose up -d --build
```

With the default `SITE_ADDRESS=http://localhost`:

- Caddy: http://localhost
- Direct web container: http://localhost:8080
- API health check: http://localhost:5000/api/health

Only Caddy publishes ports 80 and 443. MongoDB, the API, and the web container are bound to `127.0.0.1` so they are not reachable from the internet.

## Deploy to a VPS

### 1. Prepare the server

Use a Linux VPS with at least 2 GB of RAM. Install Docker Engine with the Compose plugin, then allow only SSH, HTTP, and HTTPS through the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Create an `A` record (and `AAAA` if using IPv6) for your domain pointing at the server. Caddy cannot issue a certificate until DNS resolves to the VPS and ports 80/443 are reachable.

### 2. Configure the app

```bash
git clone <your-repository-url> cloudcraft
cd cloudcraft
cp .env.example .env
openssl rand -hex 32
```

Edit `.env`:

```dotenv
NODE_ENV=production
JWT_SECRET=<paste the generated secret>
SITE_ADDRESS=blog.example.com
PUBLIC_SITE_URL=https://blog.example.com
PUBLIC_API_URL=https://blog.example.com
DOCKER_CLIENT_ORIGIN=https://blog.example.com
COOKIE_SECURE=true
```

Leave `MONGODB_URI` unset; Compose connects the API to its internal MongoDB service. Never commit `.env`.

### 3. Launch

```bash
docker compose up -d --build
docker compose ps
```

Verify the deployment:

```bash
curl -I https://blog.example.com
curl https://blog.example.com/api/health
curl https://blog.example.com/sitemap.xml
```

Caddy requests and renews TLS certificates automatically. Certificate data is stored in the `caddy-data` volume, so it survives container restarts and rebuilds.

### 4. Create the admin account

```bash
docker compose run --rm \
  -e SEED_ADMIN_EMAIL=you@example.com \
  -e SEED_ADMIN_PASSWORD='replace-with-a-strong-password' \
  api node server/scripts/seed.js
```

This creates the admin, sample authors and readers, 12 illustrated articles, comments, likes, and newsletter subscribers. Demo posts are updated on re-runs, while custom posts are left alone. Sign in from the home page and manage the sample content from the dashboard. Cover images live in `Client/public/covers` and are generated with `npm run covers:generate` (requires Chrome).

### 5. Update a deployment

```bash
git pull
docker compose up -d --build
docker image prune -f
```

There are no database migrations. Uploaded files, database data, and certificates persist in named volumes. Do not run `docker compose down -v` unless you intend to delete them.

### 6. Logs

```bash
docker compose logs -f
docker compose logs -f caddy
docker compose logs -f api
```

Log rotation is configured in `docker-compose.yml` at 10 MB per file with three files retained.

## Backups

Back up MongoDB to the host:

```bash
docker compose exec -T mongo mongodump --db cloudcraft --archive --gzip \
  > "cloudcraft-$(date +%F).archive.gz"
```

Back up uploaded files:

```bash
mkdir -p backups
docker compose cp api:/app/server/uploads "backups/uploads-$(date +%F)"
```

Store backups off the server. To restore:

```bash
docker compose exec -T mongo mongorestore --archive --gzip < cloudcraft-2026-10-21.archive.gz
docker compose cp "backups/uploads-2026-10-21/." api:/app/server/uploads
```

Stop the API while restoring if you need a consistent snapshot:

```bash
docker compose stop api
# restore
docker compose start api
```

## Security notes

- Use a unique `JWT_SECRET` and a strong admin password.
- Keep `COOKIE_SECURE=true` when the site is behind HTTPS.
- Expose only ports 22, 80, and 443. MongoDB, the API, and web containers are bound to loopback.
- Keep `SITE_ADDRESS`, `PUBLIC_SITE_URL`, `PUBLIC_API_URL`, and `DOCKER_CLIENT_ORIGIN` on the same public origin to avoid CORS and cookie problems.
- Run `docker compose pull` and rebuild periodically for base image security updates.
- The MongoDB container has no authentication because it is not published publicly. Add database authentication as an extra layer if your threat model requires it.
- Uploads are limited to JPG, PNG, WebP, and GIF files up to 5 MB, and Caddy rejects request bodies larger than 6 MB.

## Troubleshooting

**Caddy cannot bind port 80 or 443.** Another web server (nginx, Apache, or Caddy) is already running on the host. Stop it before starting this stack.

**Certificate issuance fails.** Confirm the DNS record points at the server, ports 80/443 are open, and check `docker compose logs caddy`. Let's Encrypt rate limits can delay repeated attempts.

**Login succeeds but the session does not persist.** `COOKIE_SECURE=true` requires HTTPS. Access the site through the configured domain, not an IP address or plain HTTP.

**Uploads fail with 413.** The image exceeds 5 MB or the reverse proxy limit. Adjust the upload limit in `server/config/env.js` and `client_max_body_size` plus the Caddy `request_body` limit together.

**The API exits with `JWT_SECRET must be set`.** Set a value of at least 32 characters in `.env` before running Compose.

**Prerendering wants Chrome.** `npm run client:build:seo` needs a locally installed Chrome or Chromium. Set `CHROME_PATH` if it is not found automatically. The Docker image builds the normal SPA bundle without prerendering.
