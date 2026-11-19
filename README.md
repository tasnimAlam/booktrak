# booktrak

A small app to browse books and filter them by author, genre and page count.

- **web/** – React + TypeScript + Tailwind page (built with Vite)
- **server/** – Fastify API that reads books from Postgres
- **db/init/** – SQL that creates the tables and sample data

## Run it

You need Docker.

```sh
cp .env.example .env    # then set a real POSTGRES_PASSWORD
docker compose up -d --build
```

Open http://localhost:3000.

After you change code, run `docker compose up -d --build` again. The code is baked into the image.

## Develop with hot reload

Needs Node 24+.

```sh
npm run install:all
docker compose up -d db
DATABASE_URL=postgres://postgres:<password>@localhost:5432/bookshelf npm run dev:server
npm run dev:web         # in a second terminal
```

Open http://localhost:5173. Vite sends `/api` calls to the server on port 3000.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/books` | List books. Optional filters: `author`, `genre` (repeat for more), `minPages`, `maxPages` |
| GET | `/api/books/facets` | Authors, genres, counts and page range for the filter panel |
| GET | `/health` | `{"ok":true}` when the server can reach the database |

Example:

```sh
curl "http://localhost:3000/api/books?genre=fantasy&minPages=300"
```

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
