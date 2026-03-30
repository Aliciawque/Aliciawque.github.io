import { useRef, useEffect, useState } from 'react'
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from '@chenglou/pretext'

const LINE_HEIGHT = 26

export default function CanvasArticle({
  text,
  font = 'Maple Mono',
  fontSize = 14,
  typewriter = false,
  imageSrc,
  imageWidth = 100,
  imageHeight = 84,
}: {
  text: string
  font?: string
  fontSize?: number
  typewriter?: boolean
  imageSrc?: string
  imageWidth?: number
  imageHeight?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = useState(120)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const containerWidth = container.getBoundingClientRect().width
    const fontStr = `${fontSize}px ${font}`
    const prepared = prepareWithSegments(text, fontStr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const padding = 24
    const imgGap = 16

    // Image position: top-right with padding
    const imgX = containerWidth - padding - imageWidth
    const imgY = padding
    const imgBottom = imgY + imageHeight

    // Calculate all lines with variable widths
    const lines: { text: string; x: number; y: number }[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = padding + fontSize

    while (true) {
      let lineWidth = containerWidth - padding * 2
      const lineX = padding

      // Narrow if line overlaps with image area
      if (imageSrc) {
        const lineTop = y - fontSize
        if (lineTop < imgBottom) {
          lineWidth = imgX - padding - imgGap
        }
      }

      if (lineWidth < 50) break

      const line = layoutNextLine(prepared, cursor, lineWidth)
      if (line === null) break

      lines.push({ text: line.text, x: lineX, y })
      cursor = line.end
      y += LINE_HEIGHT
    }

    const totalHeight = Math.max(y + padding, imgBottom + padding + 8)
    setHeight(totalHeight)

    canvas.width = containerWidth * dpr
    canvas.height = totalHeight * dpr
    canvas.style.width = containerWidth + 'px'
    canvas.style.height = totalHeight + 'px'
    ctx.scale(dpr, dpr)

    const computedStyle = getComputedStyle(canvas)
    const textColor = computedStyle.getPropertyValue('--text-secondary').trim() || '#8b7e74'

    const drawLines = (count: number) => {
      ctx.clearRect(0, 0, containerWidth, totalHeight)

      ctx.font = fontStr
      ctx.fillStyle = textColor
      ctx.textBaseline = 'alphabetic'

      for (let i = 0; i < count && i < lines.length; i++) {
        ctx.fillText(lines[i].text, lines[i].x, lines[i].y)
      }
    }

    // Load and draw image
    const drawImage = () => {
      if (!imageSrc) return
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, imgX, imgY, imageWidth, imageHeight)
      }
      img.src = imageSrc
    }

    if (typewriter) {
      let lineIndex = 0
      drawImage()
      const interval = setInterval(() => {
        lineIndex++
        drawLines(lineIndex)
        drawImage()
        if (lineIndex >= lines.length) clearInterval(interval)
      }, 80)
      return () => clearInterval(interval)
    } else {
      drawLines(lines.length)
      drawImage()
    }
  }, [text, font, fontSize, typewriter, imageSrc, imageWidth, imageHeight])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height,
          borderRadius: 12,
          border: '1px solid var(--border, #e8e0d8)',
        }}
      />
    </div>
  )
}
