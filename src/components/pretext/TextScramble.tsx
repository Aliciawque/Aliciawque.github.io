import { useState, useEffect, useRef, useCallback } from 'react'
import { prepare, layout } from '@chenglou/pretext'

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
const DURATION = 600

export function scrambleStep(target: string, progress: number): string {
  const chars = [...target]
  const revealCount = Math.floor(progress * chars.length)
  return chars
    .map((char, i) => {
      if (i < revealCount) return char
      if (char === ' ') return ' '
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    })
    .join('')
}

export default function TextScramble({
  text,
  font,
  tag: Tag = 'span',
  className = '',
  trigger = 'hover',
}: {
  text: string
  font: string
  tag?: 'span' | 'h1' | 'h2' | 'h3' | 'a'
  className?: string
  trigger?: 'hover' | 'visible'
}) {
  const [display, setDisplay] = useState(text)
  const [fixedWidth, setFixedWidth] = useState<number | undefined>()
  const animRef = useRef<number>(0)
  const elRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      const prepared = prepare(text, `16px ${font}`)
      const { height } = layout(prepared, 9999, 20)
      if (height > 0) {
        const el = elRef.current
        if (el) setFixedWidth(el.getBoundingClientRect().width)
      }
    } catch {
      // Pretext not available in SSR
    }
  }, [text, font])

  const runScramble = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1)
      setDisplay(scrambleStep(text, progress))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick)
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }, [text])

  useEffect(() => {
    if (trigger !== 'visible') return
    const el = elRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runScramble()
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [trigger, runScramble])

  const handlers =
    trigger === 'hover' ? { onMouseEnter: runScramble } : {}

  return (
    <Tag
      ref={elRef as never}
      className={className}
      style={fixedWidth ? { display: 'inline-block', minWidth: fixedWidth } : undefined}
      {...handlers}
    >
      {display}
    </Tag>
  )
}
