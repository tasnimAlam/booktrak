import type { Book } from "../types.ts";

// UTC so "1937-09-21" doesn't shift a day in negative-offset timezones.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function BookCard({ book }: { book: Book }) {
  const genres = book.metadata.genres ?? [];
  const facts = [
    ["Pages", book.page_count],
    [
      "Published",
      book.published_on
        ? dateFmt.format(new Date(book.published_on))
        : "Unknown",
    ],
    ["Language", book.metadata.language?.toUpperCase() ?? "—"],
  ] as const;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
      <div>
        <h2 className="font-display text-[19px] leading-[1.3] font-semibold">
          {book.title}
        </h2>
        <p className="text-sm text-muted">{book.author}</p>
      </div>
      <p className="line-clamp-3 text-sm text-body">
        {book.description ?? "No description yet."}
      </p>
      {genres.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <li
              key={g}
              className="rounded-xl bg-tag px-2.5 py-0.5 text-xs font-medium text-body"
            >
              {g}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-line-soft pt-3">
        <dl className="grid grid-cols-3 gap-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-[13px] font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="font-mono text-xs text-muted">ISBN {book.isbn ?? "—"}</p>
      </div>
    </article>
  );
}
