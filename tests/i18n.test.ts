import { describe, it, expect } from 'vitest'
import { t, getLanguageFromURL, getTranslatedPath } from '../src/i18n/utils'

describe('i18n utils', () => {
  it('returns Chinese text for zh locale', () => {
    expect(t('zh', 'nav.blog')).toBe('博客')
  })

  it('returns English text for en locale', () => {
    expect(t('en', 'nav.blog')).toBe('Blog')
  })

  it('returns key if translation missing', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key')
  })

  it('extracts language from URL path', () => {
    expect(getLanguageFromURL('/zh/blog/')).toBe('zh')
    expect(getLanguageFromURL('/en/about')).toBe('en')
    expect(getLanguageFromURL('/')).toBe('zh')
  })

  it('generates translated path', () => {
    expect(getTranslatedPath('/zh/blog/hello', 'en')).toBe('/en/blog/hello')
    expect(getTranslatedPath('/en/about', 'zh')).toBe('/zh/about')
  })
})
