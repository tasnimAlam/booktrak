# Architecture

booktrak is split into small services. Each one does one job, has its own code and tests, and runs in its own container.

```
browser ──:3000──► gateway (Caddy)
                     /api/auth/*      ──► auth  (Fastify) ──► db schema "auth"  (users)
                     /api/books/*     ──► books (Fastify) ──► db schema "books" (books, user_books)
                     everything else  ──► built web app

Only the gateway has a public port. auth, books and db live inside the compose network.
```

## The parts

| Part | Folder | Job | Owns |
|---|---|---|---|
| gateway | `gateway/` | The only public door. Sends each request to the right service and serves the web app. | Nothing (no data) |
| auth | `services/auth/` | Signup, login, `/me`. Hashes passwords and signs JWT tokens. | `auth.users` |
| books | `services/books/` | Book list, filters, facets. Checks the token on every request. | `books.books`, `books.user_books` |
| web | `web/` | React page. Built to static files and served by the gateway. | Nothing |
| db | `db/init/` | One Postgres. One schema and one login per service. | All tables, split by schema |

## How a request flows

Login:

1. The browser sends `POST /api/auth/login` to the gateway.
2. The gateway sees `/api/auth` and forwards the request to `auth`.
3. Auth checks the password against `auth.users` and signs a JWT: `{ sub: userId, role }`, valid for 1 hour.
4. The browser saves the token.

Get books:

1. The browser sends `GET /api/books` with `Authorization: Bearer <token>`.
2. The gateway sees `/api/books` and forwards the request to `books`.
3. Books checks the token's signature with `JWT_SECRET`. It does **not** ask auth or read the users table.
4. Books reads `books.books` and returns the list.

## Main ideas

### 1. Each service owns its data

Each service logs in to Postgres as its own user (`auth_svc`, `books_svc`, created by `db/init/03-roles.sh`). That user can only see its own schema. If books tries to read `auth.users`, Postgres answers `permission denied for schema auth`.

Why: if two services share tables, a change in one breaks the other. Owning data means a service can change its tables without asking anyone.

Because of this, `books.user_books.user_id` has **no foreign key** to `auth.users`. A link across services is kept by the id only. The cost: Postgres no longer stops a `user_books` row from pointing at a deleted user.

### 2. Services don't call each other

Books never calls auth over the network. It trusts the JWT instead: if the signature is valid, the `sub` inside it is the user id.

Why: a network call between services adds delay, and if auth is down, books would go down too. With tokens, books keeps working while auth is down (until the tokens expire).

The cost: a token can't be cancelled. A logged-out or deleted user's token works until it expires (1 hour).

### 3. One public door

Only the gateway publishes a port. Auth and books are reachable only inside the compose network. The browser sees one origin (`localhost:3000`), so there is no CORS setup.

In dev, Vite's proxy (`web/vite.config.ts`) plays the gateway's role: `/api/auth` goes to port 3001 and `/api/books` to port 3002.

### 4. Each service ships on its own

Each service has its own `package.json`, lockfile, tests and Docker build target. A change to books rebuilds and restarts only books:

```sh
docker compose up -d --build books
```

A few small files (`plugins/db.ts`, `plugins/auth.ts`, `config.ts`) are copied into both services on purpose. A shared package would remove the copy, but then both services would have to update together.

## Files

| File | What it does |
|---|---|
| `compose.yaml` | Runs db, auth, books and gateway. Only the gateway has a port. |
| `Dockerfile` | One file with targets `auth`, `books` and `gateway`. Compose picks one with `build.target`. |
| `gateway/Caddyfile` | Path routing and cache headers. |
| `db/init/01-schema.sql` | Creates schemas `auth` and `books` and their tables. |
| `db/init/02-data.sql` | Sample data. |
| `db/init/03-roles.sh` | Creates one DB user per service, limited to its own schema. |
| `.env` | Passwords and `JWT_SECRET`. Not in git. |

## Trade-offs

For an app this size, one server would be simpler and faster. This split exists to learn the pattern. What it costs:

- More moving parts: 4 containers instead of 2.
- More network hops: browser to gateway to service.
- Harder debugging: logs are spread across containers (`docker compose logs -f auth books`).
- Copied code in each service.

## Known limits and next steps

| Limit | Why it matters | Upgrade |
|---|---|---|
| Both services share one `JWT_SECRET` (HS256) | Books could also create tokens | RS256: auth keeps the private key, books gets only the public key |
| Tokens can't be cancelled | Logged-out tokens work up to 1 hour | Shorter tokens plus refresh tokens, or a block list |
| One Postgres for all | One DB outage stops every service | One database per service |
| No login rate limit | Passwords can be guessed | Rate limit in the gateway or in auth |
| No tracing | Hard to follow one request across services | Request ids in logs, OpenTelemetry |
| Services can only talk through the browser | A future feature like "notify on new book" has no path | A message queue (events) |
