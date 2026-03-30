declare module '@chenglou/pretext' {
  interface LayoutCursor {
    segmentIndex: number
    graphemeIndex: number
  }

  interface LayoutLine {
    text: string
    width: number
    start: LayoutCursor
    end: LayoutCursor
  }

  // Opaque prepared text handle
  interface PreparedText {}

  export function prepareWithSegments(text: string, font: string): PreparedText
  export function layoutNextLine(
    prepared: PreparedText,
    start: LayoutCursor,
    maxWidth: number,
  ): LayoutLine | null
  export function clearCache(): void
}
