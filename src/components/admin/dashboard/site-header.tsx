import { useTranslation } from "react-i18next"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locales, type Locale } from "../../../domain/report"

export function SiteHeader({ title, locale, onLocaleChange }: { title: string; locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const { t } = useTranslation()
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <Select value={locale} onValueChange={(value) => onLocaleChange(value as Locale)}>
          <SelectTrigger className="ms-auto h-8 w-32" aria-label={t("admin.language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {locales.map((code) => <SelectItem key={code} value={code}>{t(`languages.${code}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </header>
  )
}
