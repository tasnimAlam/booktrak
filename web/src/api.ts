import type { Book, Facets, Filters } from "./types.ts";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

// Filtering happens in SQL on the server; this only turns filters into query params.
export function fetchBooks(f: Filters, signal?: AbortSignal): Promise<Book[]> {
  const q = new URLSearchParams();
  for (const a of f.authors) q.append("author", a);
  for (const g of f.genres) q.append("genre", g);
  if (f.minPages !== null) q.set("minPages", String(f.minPages));
  if (f.maxPages !== null) q.set("maxPages", String(f.maxPages));
  return getJson(`/api/books?${q}`, signal);
}

export function fetchFacets(): Promise<Facets> {
  return getJson("/api/books/facets");
}
