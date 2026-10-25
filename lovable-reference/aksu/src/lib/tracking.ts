import { WHATSAPP_NUMBER } from "@/content/i18n";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

export function captureParams() {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  KEYS.forEach((k) => { const v = sp.get(k); if (v) found[k] = v; });
  if (Object.keys(found).length) sessionStorage.setItem("ea_params", JSON.stringify(found));
}

export function getParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem("ea_params") || "{}"); } catch { return {}; }
}

export function waLink(text: string) {
  const p = getParams();
  const ref = p.utm_campaign || p.utm_source ? `\n\n[ref: ${[p.utm_source, p.utm_campaign, p.utm_content].filter(Boolean).join(" / ")}]` : "";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text + ref)}`;
}

/** Analytics hooks: load only after consent AND only if IDs are configured (VITE_GA4_ID, VITE_META_PIXEL_ID). */
export function loadAnalytics() {
  const ga = import.meta.env.VITE_GA4_ID as string | undefined;
  const px = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  const w = window as any;
  if (ga && !w.gtag) {
    const s = document.createElement("script"); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`; document.head.appendChild(s);
    w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag("js", new Date()); w.gtag("config", ga);
  }
  if (px && !w.fbq) {
    const f: any = (w.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); });
    f.queue = []; f.loaded = true; f.version = "2.0";
    const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s);
    w.fbq("init", px); w.fbq("track", "PageView");
  }
}

export function trackLead(service: string) {
  const w = window as any;
  w.gtag?.("event", "generate_lead", { service });
  w.fbq?.("track", "Contact", { content_name: service });
}