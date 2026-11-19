import { useEffect, useRef } from "react";
import type { Filters } from "../types.ts";
import { CloseIcon } from "./Icons.tsx";
import { btnDark, btnOutline } from "./ui.ts";

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
  authors: [string, number][];
  genres: [string, number][];
  pageBounds: { min: number; max: number };
  onApply: () => void;
}

const toggle = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
const parsePages = (v: string) =>
  v === "" || Number.isNaN(Number(v)) ? null : Number(v);

const legend =
  "mb-2.5 p-0 text-[13px] font-semibold tracking-[.06em] text-body uppercase";
const hint = "mt-2 text-xs text-muted";
const numberInput =
  "h-11 w-full rounded-[10px] border border-line-strong bg-white px-3 focus:border-brand";

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onClear,
  authors,
  genres,
  pageBounds,
  onApply,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Closed: visibility flips only after the 200ms slide-out, so it stays visible while animating
  // but is unfocusable and hidden from screen readers once gone.
  const motion = open
    ? "visible [transition:transform_.2s_ease,opacity_.2s]"
    : "invisible [transition:transform_.2s_ease,opacity_.2s,visibility_0s_.2s]";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-ink/35 motion-reduce:transition-none ${motion} ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter books"
        className={`fixed top-0 right-0 flex h-full w-full max-w-[380px] flex-col border-l border-line bg-white shadow-[-12px_0_32px_rgba(0,0,0,.12)] motion-reduce:transition-none max-[419px]:max-w-none max-[419px]:border-l-0 ${motion} ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <h2 className="font-display text-xl font-semibold">Filters</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="-mr-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] hover:bg-tag"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-5">
          <fieldset className="min-w-0">
            <legend className={legend}>Author</legend>
            {authors.map(([name, count]) => (
              <label
                key={name}
                className="flex min-h-9 cursor-pointer items-center gap-2.5"
              >
                <input
                  type="checkbox"
                  checked={filters.authors.includes(name)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      authors: toggle(filters.authors, name),
                    })
                  }
                  className="m-0 size-[18px] cursor-pointer accent-brand"
                />
                <span className="flex-1 text-[15px]">{name}</span>
                <span className="text-[13px] text-muted">{count}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="min-w-0">
            <legend className={legend}>Pages between</legend>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[13px] text-muted">Min</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={String(pageBounds.min)}
                  value={filters.minPages ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      minPages: parsePages(e.target.value),
                    })
                  }
                  className={numberInput}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[13px] text-muted">Max</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={String(pageBounds.max)}
                  value={filters.maxPages ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      maxPages: parsePages(e.target.value),
                    })
                  }
                  className={numberInput}
                />
              </label>
            </div>
            <p className={hint}>
              Books in the library run from {pageBounds.min} to {pageBounds.max}{" "}
              pages.
            </p>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className={legend}>Genre</legend>
            <div className="flex flex-wrap gap-2">
              {genres.map(([g, count]) => {
                const on = filters.genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      onChange({
                        ...filters,
                        genres: toggle(filters.genres, g),
                      })
                    }
                    className={`h-9 cursor-pointer rounded-[18px] border px-3.5 text-[13px] font-medium ${
                      on
                        ? "border-brand bg-brand text-white"
                        : "border-line-strong bg-white hover:border-ink"
                    }`}
                  >
                    {g} · {count}
                  </button>
                );
              })}
            </div>
            <p className={hint}>Shows books in any of the selected genres.</p>
          </fieldset>
        </div>

        <div className="flex gap-2.5 border-t border-line-soft bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClear}
            className={`${btnOutline} flex-1`}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onApply}
            className={`${btnDark} flex-2`}
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
