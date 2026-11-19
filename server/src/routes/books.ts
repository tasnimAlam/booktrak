import type { FastifyPluginAsync } from "fastify";

interface BooksQuery {
  author?: string[];
  genre?: string[];
  minPages?: number;
  maxPages?: number;
}

// Fastify's Ajv coerces "?author=A" to ["A"] and "?minPages=200" to 200; bad values get a 400.
const booksQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    author: { type: "array", items: { type: "string" }, maxItems: 100 },
    genre: { type: "array", items: { type: "string" }, maxItems: 100 },
    minPages: { type: "integer", minimum: 0 },
    maxPages: { type: "integer", minimum: 0 },
  },
} as const;

const countList = {
  type: "array",
  items: {
    type: "object",
    properties: { name: { type: "string" }, count: { type: "integer" } },
  },
} as const;

const books: FastifyPluginAsync = async (app) => {
  // GET /api/books?author=A&author=B&genre=fantasy&minPages=200&maxPages=400
  // OR within authors/genres, AND across groups. Books with no genres never match a genre filter.
  app.get<{ Querystring: BooksQuery }>(
    "/",
    {
      schema: {
        querystring: booksQuerySchema,
        response: { 200: { type: "array", items: { $ref: "Book#" } } },
      },
    },
    async (req) => {
      const { author, genre, minPages, maxPages } = req.query;
      // Parameterized: values never become SQL text. NULL turns a condition off.
      const { rows } = await app.db.query(
        `SELECT id, title, author, isbn, page_count, published_on::text AS published_on,
                description, metadata
           FROM books
          WHERE ($1::text[] IS NULL OR author = ANY($1))
            AND ($2::int IS NULL OR page_count >= $2)
            AND ($3::int IS NULL OR page_count <= $3)
            AND ($4::text[] IS NULL OR metadata->'genres' ?| $4)
          ORDER BY id`,
        [
          author?.length ? author : null,
          minPages ?? null,
          maxPages ?? null,
          genre?.length ? genre : null,
        ],
      );
      return rows;
    },
  );

  // Filter options for the drawer, always over the whole table.
  app.get(
    "/facets",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "integer" },
              minPages: { type: ["integer", "null"] },
              maxPages: { type: ["integer", "null"] },
              authors: countList,
              genres: countList,
            },
          },
        },
      },
    },
    async () => {
      const [totals, authors, genres] = await Promise.all([
        app.db.query(
          `SELECT count(*) AS total, min(page_count) AS "minPages", max(page_count) AS "maxPages"
             FROM books`,
        ),
        app.db.query(
          `SELECT author AS name, count(*) AS count FROM books GROUP BY author ORDER BY author`,
        ),
        app.db.query(
          `SELECT g AS name, count(*) AS count
             FROM books, jsonb_array_elements_text(metadata->'genres') AS g
            WHERE jsonb_typeof(metadata->'genres') = 'array'
            GROUP BY g
            ORDER BY g`,
        ),
      ]);
      return { ...totals.rows[0], authors: authors.rows, genres: genres.rows };
    },
  );
};

export default books;
