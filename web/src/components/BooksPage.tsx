import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBooks, fetchFacets, UnauthorizedError } from "../api.ts";
import {
  countActiveFilters,
  emptyFilters,
  type Book,
  type Facets,
  type Filters,
  type User,
} from "../types.ts";
import ActiveFilters from "./ActiveFilters.tsx";
import BookCard from "./BookCard.tsx";
import FilterDrawer from "./FilterDrawer.tsx";
import { SlidersIcon } from "./Icons.tsx";
import { btnDark, btnOutline } from "./ui.ts";

interface Props {
  user: User;
  onLogout: (message?: string) => void;
}

export default function BooksPage({ user, onLogout }: Props) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `filters` drives the request; `draft` is what the drawer edits until Apply.
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Expired token: back to login with a message. Anything else: show the error.
  const fail = useCallback(
    (e: unknown) =>
      e instanceof UnauthorizedError
        ? onLogout(e.message)
        : setError(String(e)),
    [onLogout],
  );

  // Drawer options and the total count: whole table, loaded once.
  useEffect(() => {
    fetchFacets().then(setFacets, fail);
  }, [fail]);

  // Server filters on every change. Aborting the previous request means a slow, stale
  // response (e.g. while typing in Min/Max) can never overwrite a newer one.
  useEffect(() => {
    const ctrl = new AbortController();
    fetchBooks(filters, ctrl.signal).then(
      (b) => {
        setBooks(b);
        setError(null);
      },
      (e: unknown) => {
        if (!ctrl.signal.aborted) fail(e);
      },
    );
    return () => ctrl.abort();
  }, [filters, fail]);

  const total = facets?.total ?? books?.length ?? 0;
  const shown = books?.length ?? 0;
  const toPairs = (list: Facets["authors"] = []) =>
    list.map((x): [string, number] => [x.name, x.count]);
  const pageBounds = { min: facets?.minPages ?? 0, max: facets?.maxPages ?? 0 };
  const activeCount = countActiveFilters(filters);

  // Stable function: FilterDrawer's effect depends on it, and a new one each render would re-run
  // the effect and pull focus back to the close button on every keystroke.
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    filterBtnRef.current?.focus();
  }, []);
  const clear = () => setFilters(emptyFilters);

  return (
    <>
      {/* inert keeps keyboard focus inside the modal drawer while it is open */}
      <div inert={drawerOpen}>
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-7">
            <div>
              <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.01em]">
                Books
              </h1>
              <p className="text-sm text-muted">
                {activeCount === 0
                  ? `Showing all ${total} books`
                  : `Showing ${shown} of ${total} books`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">{user.name}</span>
              <button
                type="button"
                className={btnOutline}
                onClick={() => onLogout()}
              >
                Log out
              </button>
              <button
                ref={filterBtnRef}
                type="button"
                className={btnDark}
                onClick={() => {
                  setDraft(filters); // start from what's applied; a closed-without-Apply draft is discarded
                  setDrawerOpen(true);
                }}
              >
                <SlidersIcon />
                Filter
                {activeCount > 0 && (
                  <span
                    className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-white px-[7px] text-xs font-semibold text-ink"
                    aria-label={`${activeCount} active`}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-[1200px] flex-col gap-5 px-6 pt-6 pb-16">
          {activeCount > 0 && (
            <ActiveFilters
              filters={filters}
              onChange={setFilters}
              onClear={clear}
            />
          )}

          {error ? (
            <p role="alert">Could not load books: {error}</p>
          ) : books === null ? (
            <p className="text-muted">Loading books…</p>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-white p-16 text-center max-sm:px-5 max-sm:py-10">
              <p className="text-[17px] font-semibold">
                No books match these filters
              </p>
              <p className="text-muted">
                Try a wider page range or fewer authors and genres.
              </p>
              <button
                type="button"
                className={`${btnOutline} mt-3`}
                onClick={clear}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </main>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        filters={draft}
        onChange={setDraft}
        onClear={() => setDraft(emptyFilters)}
        onApply={() => {
          setFilters(draft);
          closeDrawer();
        }}
        authors={toPairs(facets?.authors)}
        genres={toPairs(facets?.genres)}
        pageBounds={pageBounds}
      />
    </>
  );
}
