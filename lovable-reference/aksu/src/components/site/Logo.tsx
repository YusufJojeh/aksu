export function Monogram({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="EA monogram">
      <rect width="64" height="64" rx="18" fill="var(--cobalt)" />
      <path d="M14 20h14M14 32h11M14 44h14M14 20v24" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M33 44 41.5 20 50 44M36.5 35h10" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M16 51c9 6 23 6 32 0" stroke="var(--aqua)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="13" r="3.5" fill="var(--lemon)" />
    </svg>
  );
}

export function Logo({ lang }: { lang: "en" | "ar" }) {
  return (
    <span className="flex items-center gap-2.5">
      <Monogram />
      <span className="leading-tight">
        <span className="block font-display text-[1.05rem] font-extrabold text-ink">{lang === "ar" ? "د. أمير أكسو" : "Dr. Emir Aksu"}</span>
        <span className="block text-[0.7rem] font-medium text-muted-foreground">{lang === "ar" ? "Dr. Emir Aksu" : "د. أمير أكسو"}</span>
      </span>
    </span>
  );
}