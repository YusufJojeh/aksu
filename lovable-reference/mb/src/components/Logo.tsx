/** Bespoke MB ligature: the M's last stem becomes the B's spine, with a smile arc beneath. */
export function LogoMark({ className = "h-9 w-9", title = "MB Dental Turkey" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} role="img" aria-label={title}>
      <path
        d="M9 38V12l12 16 12-16v26M33 12h6.5a6.5 6.5 0 0 1 0 13H33m0 0h8a6.5 6.5 0 0 1 0 13h-8"
        fill="none"
        stroke="var(--pine)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 45.5q16 8 32 0" fill="none" stroke="var(--coral)" strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl text-pine" dir="ltr">MB Dental</span>
        <span className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-coral-deep">
          {tagline ?? "Turkey"}
        </span>
      </span>
    </span>
  );
}