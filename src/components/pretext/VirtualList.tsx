import { useState, useEffect, useRef, useCallback } from 'react'
import { prepare, layout } from '@chenglou/pretext'

const CARD_PADDING = 40 // top + bottom padding
const META_HEIGHT = 40  // tags + date row
const GAP = 12

export function calculateItemHeight(
  title: string,
  excerpt: string,
  containerWidth: number
): number {
  const contentWidth = containerWidth - 40 // card horizontal padding
  try {
    const titlePrepared = prepare(title, '16px Maple Mono NF CN')
    const titleLayout = layout(titlePrepared, contentWidth, 22)

    const excerptPrepared = prepare(excerpt, '13px Maple Mono NF CN')
    const excerptLayout = layout(excerptPrepared, contentWidth, 20)

    return titleLayout.height + 8 + excerptLayout.height + META_HEIGHT + CARD_PADDING
  } catch {
    // Fallback if Pretext isn't available
    return 120
  }
}

interface Item {
  title: string
  excerpt: string
  slug: string
  tags: string[]
  date: string
  lang: string
}

export default function VirtualList({
  items,
  lang,
}: {
  items: Item[]
  lang: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setViewportHeight(window.innerHeight)

    return () => observer.disconnect()
  }, [])

  const heights = items.map((item) =>
    calculateItemHeight(item.title, item.excerpt, containerWidth)
  )

  const offsets: number[] = []
  let cumulative = 0
  for (const h of heights) {
    offsets.push(cumulative)
    cumulative += h + GAP
  }
  const totalHeight = cumulative - GAP

  const handleScroll = useCallback(() => {
    setScrollTop(window.scrollY - (containerRef.current?.offsetTop ?? 0))
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const startIdx = Math.max(
    0,
    offsets.findIndex((o, i) => o + heights[i] >= scrollTop) - 1
  )
  const endIdx = Math.min(
    items.length,
    offsets.findIndex((o) => o > scrollTop + viewportHeight + 200) + 1 || items.length
  )

  const visibleItems = items.slice(
    Math.max(0, startIdx),
    endIdx
  )

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: totalHeight, minHeight: 200 }}
    >
      {visibleItems.map((item, i) => {
        const actualIndex = Math.max(0, startIdx) + i
        return (
          <a
            key={item.slug}
            href={`/${lang}/blog/${item.slug}`}
            className="virtual-card"
            style={{
              position: 'absolute',
              top: offsets[actualIndex],
              left: 0,
              right: 0,
              height: heights[actualIndex],
            }}
          >
            <h3 className="virtual-card-title">{item.title}</h3>
            <p className="virtual-card-excerpt">{item.excerpt}</p>
            <div className="virtual-card-meta">
              <div className="virtual-card-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <time className="virtual-card-date">{item.date}</time>
            </div>
          </a>
        )
      })}
    </div>
  )
}
