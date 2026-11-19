// Mirrors public.books. bigint id arrives as a number here; switch to string if ids outgrow 2^53.
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  page_count: number;
  published_on: string | null; // ISO date, e.g. "1937-09-21"
  description: string | null;
  metadata: { genres?: string[]; language?: string };
}

export interface Filters {
  authors: string[];
  genres: string[];
  minPages: number | null;
  maxPages: number | null;
}

export interface NameCount {
  name: string;
  count: number;
}

// Filter options for the drawer, computed by the server over all books.
export interface Facets {
  total: number;
  minPages: number | null;
  maxPages: number | null;
  authors: NameCount[];
  genres: NameCount[];
}

// The page range counts as one filter.
export function countActiveFilters(f: Filters): number {
  return (
    f.authors.length +
    f.genres.length +
    (f.minPages !== null || f.maxPages !== null ? 1 : 0)
  );
}

export const emptyFilters: Filters = {
  authors: [],
  genres: [],
  minPages: null,
  maxPages: null,
};
