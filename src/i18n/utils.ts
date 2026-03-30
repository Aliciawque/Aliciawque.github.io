import zh from './zh.json'
import en from './en.json'

const translations: Record<string, Record<string, string>> = { zh, en }

export type Lang = 'zh' | 'en'

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

export function getLanguageFromURL(path: string): Lang {
  const match = path.match(/^\/(zh|en)\//)
  return (match?.[1] as Lang) ?? 'zh'
}

export function getTranslatedPath(path: string, targetLang: Lang): string {
  return path.replace(/^\/(zh|en)\//, `/${targetLang}/`)
}
