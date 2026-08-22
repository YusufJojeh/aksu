import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'
import fr from './locales/fr.json'
import tr from './locales/tr.json'
import de from './locales/de.json'
import es from './locales/es.json'
import ru from './locales/ru.json'
import pl from './locales/pl.json'
import it from './locales/it.json'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar }, fr: { translation: fr }, tr: { translation: tr }, de: { translation: de }, es: { translation: es }, ru: { translation: ru }, pl: { translation: pl }, it: { translation: it } },
  lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false },
})

export default i18n
