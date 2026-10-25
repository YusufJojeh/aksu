export const LANGS = ["en", "ar"] as const;
export type Lang = (typeof LANGS)[number];
/** Locales prepared in the i18n structure; add a dictionary + LANGS entry to activate. */
export const PLANNED_LANGS = ["de", "fr", "es", "it", "ro", "pl"] as const;

export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);
export const dirOf = (l: Lang) => (l === "ar" ? "rtl" : "ltr");

export const SITE = {
  name: "MB Dental Turkey",
  phoneDisplay: "+90 555 066 9475",
  phoneE164: "+905550669475",
  whatsapp: "905550669475",
  email: "info@mbdentalturkey.com",
  instagram: "https://www.instagram.com/mbdentalturkey/",
  officialSite: "https://mbdentalturkey.com/",
  address: {
    street: "Başak Mahallesi, Çamlıca Sokak No:6/I",
    district: "Başakşehir",
    city: "İstanbul",
    country: "TR",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Başak Mahallesi Çamlıca Sokak No:6/I Başakşehir İstanbul"),
  mapsEmbed:
    "https://maps.google.com/maps?q=" +
    encodeURIComponent("Başak Mahallesi Çamlıca Sokak No:6 Başakşehir İstanbul") +
    "&z=15&output=embed",
};

export function waLink(text: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}