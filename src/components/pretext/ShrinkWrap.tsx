import { useRef, useEffect, useState, type ReactNode } from 'react'
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext'

export function findOptimalWidth(
  text: string,
  font: string,
  maxWidth: number
): number {
  try {
    const prepared = prepareWithSegments(text, font)
    let bestWidth = maxWidth

    // Find the widest line at maxWidth — that's the tightest fit
    walkLineRanges(prepared, maxWidth, (line) => {
      if (line.width < bestWidth) bestWidth = line.width
    })

    // Check if single line — use exact width
    let lineCount = 0
    let widestLine = 0
    walkLineRanges(prepared, maxWidth, (line) => {
      lineCount++
      if (line.width > widestLine) widestLine = line.width
    })

    if (lineCount === 1) return Math.ceil(widestLine) + 1

    // For multi-line, return widest line width
    return Math.min(Math.ceil(widestLine) + 1, maxWidth)
  } catch {
    return maxWidth
  }
}

export default function ShrinkWrap({
  text,
  font = '16px Maple Mono NF CN',
  maxWidth = 400,
  children,
  className = '',
}: {
  text: string
  font?: string
  maxWidth?: number
  children: ReactNode
  className?: string
}) {
  const [width, setWidth] = useState<number | undefined>()

  useEffect(() => {
    const optimal = findOptimalWidth(text, font, maxWidth)
    setWidth(optimal)
  }, [text, font, maxWidth])

  return (
    <div
      className={className}
      style={width ? { width, maxWidth } : { maxWidth }}
    >
      {children}
    </div>
  )
}
