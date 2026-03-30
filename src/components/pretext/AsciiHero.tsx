import { useRef, useEffect, useCallback } from 'react'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  char: string
  vx: number
  vy: number
}

const ASCII_CHARS = '@#$%&*!~^()+={}[]|<>?/\\:;'

function getFontSize(width: number) {
  if (width < 400) return 32
  if (width < 500) return 40
  if (width < 700) return 52
  return 72
}

export default function AsciiHero({ text, font }: { text: string; font: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)
  const fontSizeRef = useRef(72)

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cssW = Number(canvas.dataset.cssWidth) || 600
    const cssH = Number(canvas.dataset.cssHeight) || 280
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const activeFont = isDark ? 'Share Tech Mono' : font

    const fontSize = getFontSize(cssW)
    const lineHeight = Math.round(fontSize * 1.22)
    fontSizeRef.current = fontSize

    const prepared = prepareWithSegments(text, `${fontSize}px ${activeFont}`, { whiteSpace: 'pre-wrap' })
    const { lines } = layoutWithLines(prepared, cssW - 32, lineHeight)

    const particles: Particle[] = []
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = `${fontSize}px ${activeFont}`

    let y = (cssH - lines.length * lineHeight) / 2 + fontSize
    for (const line of lines) {
      const lineWidth = line.width
      let x = (cssW - lineWidth) / 2

      for (const char of [...line.text]) {
        if (char.trim()) {
          const charWidth = ctx.measureText(char).width
          particles.push({
            x: Math.random() * cssW,
            y: Math.random() * cssH,
            targetX: x + charWidth / 2,
            targetY: y,
            char,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
          })
          x += charWidth
        } else {
          x += ctx.measureText(char).width
        }
      }
      y += lineHeight
    }

    particlesRef.current = particles
  }, [text, font])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      const ctx = canvas.getContext('2d')
      ctx?.scale(dpr, dpr)
      canvas.dataset.cssWidth = String(rect.width)
      canvas.dataset.cssHeight = String(rect.height)
      initParticles()
    }

    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    canvas.addEventListener('mousemove', handleMouse)
    canvas.addEventListener('mouseleave', handleLeave)
    // Touch interaction disabled on mobile — visual-only animation

    const animate = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = Number(canvas.dataset.cssWidth) || canvas.width
      const h = Number(canvas.dataset.cssHeight) || canvas.height
      const fontSize = fontSizeRef.current

      const computedStyle = getComputedStyle(canvas)
      const accentColor = computedStyle.getPropertyValue('--accent').trim() || '#00ff88'
      const mutedColor = computedStyle.getPropertyValue('--text-muted').trim() || '#555555'
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      const activeFont = isDark ? 'Share Tech Mono' : font

      ctx.clearRect(0, 0, w, h)
      ctx.font = `${fontSize}px ${activeFont}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const mouse = mouseRef.current
      const pushRadius = 120
      const pushStrength = 8

      for (const p of particlesRef.current) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < pushRadius && dist > 0) {
          const force = (1 - dist / pushRadius) * pushStrength
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.vx += (p.targetX - p.x) * 0.08
        p.vy += (p.targetY - p.y) * 0.08
        p.vx *= 0.82
        p.vy *= 0.82
        p.x += p.vx
        p.y += p.vy

        const distToTarget = Math.sqrt(
          (p.x - p.targetX) ** 2 + (p.y - p.targetY) ** 2
        )

        if (distToTarget > 30) {
          const randomChar = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
          ctx.fillStyle = mutedColor
          ctx.fillText(randomChar, p.x, p.y)
        } else {
          ctx.fillStyle = accentColor
          ctx.fillText(p.char, p.x, p.y)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('mouseleave', handleLeave)
    }
  }, [font, initParticles])

  return (
    <div style={{ width: '100%', height: '280px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      />
    </div>
  )
}
