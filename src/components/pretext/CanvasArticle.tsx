import { useRef, useEffect, useState } from 'react'
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'

const LINE_HEIGHT = 28

interface FloatShape {
  x: number
  y: number
  width: number
  height: number
  radius?: number
}

export default function CanvasArticle({
  text,
  font = 'Maple Mono NF CN',
  fontSize = 15,
  width = 640,
  floatShape,
  typewriter = false,
}: {
  text: string
  font?: string
  fontSize?: number
  width?: number
  floatShape?: FloatShape
  typewriter?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = useState(200)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const fontStr = `${fontSize}px ${font}`
    const prepared = prepareWithSegments(text, fontStr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const padding = 24

    // Calculate all lines with variable widths (for float wrapping)
    const lines: { text: string; x: number; y: number }[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = padding + fontSize

    while (true) {
      let lineWidth = width - padding * 2

      // Narrow the line if it overlaps with the float shape
      let lineX = padding
      if (floatShape) {
        const lineTop = y - fontSize
        const lineBottom = y + (LINE_HEIGHT - fontSize)
        if (
          lineBottom > floatShape.y &&
          lineTop < floatShape.y + floatShape.height
        ) {
          lineWidth -= floatShape.width + 16
          if (floatShape.x < width / 2) {
            lineX = floatShape.x + floatShape.width + 16
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, lineWidth)
      if (line === null) break

      lines.push({ text: line.text, x: lineX, y })
      cursor = line.end
      y += LINE_HEIGHT
    }

    const totalHeight = y + padding
    setHeight(totalHeight)

    canvas.width = width * dpr
    canvas.height = totalHeight * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = totalHeight + 'px'
    ctx.scale(dpr, dpr)

    const theme = document.documentElement.getAttribute('data-theme')
    const textColor = theme === 'dark' ? '#eeeeee' : '#8b7e74'
    const accentColor = theme === 'dark' ? '#00ff88' : '#6b5c4d'

    const drawLines = (count: number) => {
      ctx.clearRect(0, 0, width, totalHeight)

      // Draw float shape
      if (floatShape) {
        ctx.strokeStyle = accentColor
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        if (floatShape.radius) {
          ctx.beginPath()
          ctx.arc(
            floatShape.x + floatShape.width / 2,
            floatShape.y + floatShape.height / 2,
            floatShape.radius,
            0,
            Math.PI * 2
          )
          ctx.stroke()
        } else {
          ctx.strokeRect(floatShape.x, floatShape.y, floatShape.width, floatShape.height)
        }
        ctx.setLineDash([])
      }

      ctx.font = fontStr
      ctx.fillStyle = textColor
      ctx.textBaseline = 'alphabetic'

      for (let i = 0; i < count && i < lines.length; i++) {
        ctx.fillText(lines[i].text, lines[i].x, lines[i].y)
      }
    }

    if (typewriter) {
      let lineIndex = 0
      const interval = setInterval(() => {
        lineIndex++
        drawLines(lineIndex)
        if (lineIndex >= lines.length) clearInterval(interval)
      }, 80)
      return () => clearInterval(interval)
    } else {
      drawLines(lines.length)
    }
  }, [text, font, fontSize, width, floatShape, typewriter])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        maxWidth: width,
        height,
        display: 'block',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border, #e8e0d8)',
      }}
    />
  )
}
