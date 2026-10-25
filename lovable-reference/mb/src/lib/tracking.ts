// Attribution capture + consent-gated analytics hooks.
// GA4 / Meta Pixel load ONLY when an ID is configured via VITE_GA4_ID / VITE_META_PIXEL_ID
// AND the visitor accepted analytics cookies. No IDs are hard-coded.

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;
const STORE = "mb_attribution";
const CONSENT = "mb_consent";

export type Attribution = Partial<Record<(typeof KEYS)[number], string>>;

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const found: Attribution = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) found[k] = v.slice(0, 120);
  }
  if (Object.keys(found).length) {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ ...getAttribution(), ...found }));
    } catch {}
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}

/** Query string to carry campaign params across internal links. */
export function attributionQuery(): string {
  const a = getAttribution();
  const q = new URLSearchParams(a as Record<string, string>).toString();
  return q ? `?${q}` : "";
}

export type Consent = "granted" | "denied" | null;
export function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT);
  return v === "granted" || v === "denied" ? v : null;
}
export function setConsent(v: "granted" | "denied") {
  localStorage.setItem(CONSENT, v);
  if (v === "granted") loadAnalytics();
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
    fbq?: ((...a: unknown[]) => void) & { q?: unknown[] };
  }
}

let loaded = false;
export function loadAnalytics() {
  if (loaded || typeof window === "undefined" || getConsent() !== "granted") return;
  loaded = true;
  const ga = import.meta.env.VITE_GA4_ID as string | undefined;
  const px = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (ga) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...a: unknown[]) => window.dataLayer!.push(a);
    window.gtag("js", new Date());
    window.gtag("config", ga, { anonymize_ip: true });
  }
  if (px) {
    const fbq = ((...a: unknown[]) => {
      (fbq.q = fbq.q || []).push(a);
    }) as NonNullable<Window["fbq"]>;
    window.fbq = fbq;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    fbq("init", px);
    fbq("track", "PageView");
  }
}

export function trackLead(treatment: string, channel: "form" | "whatsapp_button") {
  if (typeof window === "undefined" || getConsent() !== "granted") return;
  window.gtag?.("event", "generate_lead", { treatment, channel });
  window.fbq?.("track", "Lead", { content_name: treatment });
}