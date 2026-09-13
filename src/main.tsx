import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-sans-arabic/400.css'
import './i18n'
import './styles.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { PdfMapper } from './dev/PdfMapper'

const isMapper = import.meta.env.DEV && window.location.pathname.endsWith('/dev/pdf-mapper')
createRoot(document.getElementById('root')!).render(<StrictMode>{isMapper ? <PdfMapper /> : <AuthProvider><App /></AuthProvider>}</StrictMode>)
