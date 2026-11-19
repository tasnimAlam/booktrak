CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'reader'
                CHECK (role IN ('reader', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Unique email, ignoring upper/lower case
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE books (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text NOT NULL,
  author       text NOT NULL,
  isbn         text UNIQUE,
  page_count   integer NOT NULL CHECK (page_count > 0),
  published_on date,
  description  text,
  metadata     jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE user_books (
  user_id      bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  book_id      bigint NOT NULL REFERENCES books (id) ON DELETE RESTRICT,
  status       text NOT NULL DEFAULT 'want_to_read'
               CHECK (status IN ('want_to_read', 'reading', 'finished')),
  rating       smallint CHECK (rating BETWEEN 1 AND 5),
  current_page integer NOT NULL DEFAULT 0 CHECK (current_page >= 0),
  started_on   date,
  finished_on  date,
  review       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id),
  CHECK (finished_on IS NULL OR started_on IS NULL OR finished_on >= started_on)
);

-- Section 11: slowest-queries view (library is preloaded in compose.yaml)
CREATE EXTENSION pg_stat_statements;
