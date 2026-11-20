# booktrak

A small app to browse books and filter them by author, genre and page count.

- **web/** – React + TypeScript + Tailwind page (built with Vite)
- **services/auth/** – Fastify service: signup, login, JWT tokens
- **services/books/** – Fastify service: books and filters
- **gateway/** – Caddy config: the one public entry point
- **db/init/** – SQL that creates the tables, sample data and one DB user per service

## How it fits together

```
browser ──► gateway (Caddy, :3000)
              /api/auth/*   ──► auth   ── Postgres schema "auth"  (users)
              /api/books/*  ──► books  ── Postgres schema "books" (books, user_books)
              everything else ──► built web app
```

- Each service is its own small app with its own `package.json`, tests and Docker target.
- Services never call each other. Auth signs a JWT; books only checks it with the same `JWT_SECRET`.
- Both use one Postgres, but each logs in as its own user that can only see its own schema.

## Run it

You need Docker.

```sh
cp .env.example .env    # then set the passwords and JWT_SECRET (openssl rand -hex 32)
docker compose up -d --build
```

Open http://localhost:3000.

After you change code, run `docker compose up -d --build` again. The code is baked into the image.

## Develop with hot reload

Needs Node 24+.

```sh
npm run install:all
docker compose up -d db
set -x JWT_SECRET <secret>    # fish; same value for both services
DATABASE_URL=postgres://auth_svc:<auth-password>@localhost:5432/bookshelf npm run dev:auth     # port 3001
DATABASE_URL=postgres://books_svc:<books-password>@localhost:5432/bookshelf npm run dev:books  # port 3002
npm run dev:web
```

Run each in its own terminal. Open http://localhost:5173. Vite sends `/api/auth` to port 3001 and `/api/books` to port 3002, like the gateway does.

## API

| Method | Path | Login needed | What it does |
|---|---|---|---|
| POST | `/api/auth/signup` | no | Create an account (`name`, `email`, `password` 8+ chars). Returns a token |
| POST | `/api/auth/login` | no | Log in (`email`, `password`). Returns a token |
| GET | `/api/auth/me` | yes | The logged-in user |
| GET | `/api/books` | yes | List books. Optional filters: `author`, `genre` (repeat for more), `minPages`, `maxPages` |
| GET | `/api/books/facets` | yes | Authors, genres, counts and page range for the filter panel |
| GET | `/health` | no | Per service, inside the compose network only: `{"ok":true}` when it can reach the database |

Send the token as `Authorization: Bearer <token>`. It lasts 1 hour.

Example:

```sh
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}' | jq -r .token)

curl "http://localhost:3000/api/books?genre=fantasy" -H "Authorization: Bearer $TOKEN"
```

The seed users in `db/init/` have placeholder passwords and can't log in. Sign up to make a real account.

## Scripts

Run from the repo root:

| Command | What it does |
|---|---|
| `npm test` | Run server and web tests |
| `npm run check` | Type check, lint and build |

## Database

The SQL in `db/init/` runs only the first time the database starts. To load it again, wipe the data:

```sh
docker compose down -v   # deletes all data
docker compose up -d --build
```

## License

MIT
