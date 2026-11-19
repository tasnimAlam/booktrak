// Shared button classes, reused across components instead of a Button wrapper.
const btn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-[18px] text-[15px] font-medium";

export const btnDark = `${btn} border-ink bg-ink text-white hover:bg-ink-hover`;
export const btnOutline = `${btn} border-line-strong bg-white text-ink hover:border-ink`;
