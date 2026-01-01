import { useState, useEffect, useCallback } from 'react'
import { Input } from './Input'

interface ColorPickerProps {
  hexCode: string
  rgbR: number | null
  rgbG: number | null
  rgbB: number | null
  cmykC?: number | null
  cmykM?: number | null
  cmykY?: number | null
  cmykK?: number | null
  onHexChange: (hex: string) => void
  onRgbChange: (r: number | null, g: number | null, b: number | null) => void
  onCmykChange?: (c: number | null, m: number | null, y: number | null, k: number | null) => void
  className?: string
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// Convert RGB to CMYK
function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const k = 1 - Math.max(rNorm, gNorm, bNorm)
  const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k)
  const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k)
  const y = k === 1 ? 0 : (1 - bNorm - k) / (1 - k)

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

// Convert CMYK to RGB
function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100))
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100))
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100))

  return { r, g, b }
}

export function ColorPicker({
  hexCode,
  rgbR,
  rgbG,
  rgbB,
  cmykC,
  cmykM,
  cmykY,
  cmykK,
  onHexChange,
  onRgbChange,
  onCmykChange,
  className,
}: ColorPickerProps) {
  const [localHex, setLocalHex] = useState(hexCode)
  const [localRgbR, setLocalRgbR] = useState(rgbR)
  const [localRgbG, setLocalRgbG] = useState(rgbG)
  const [localRgbB, setLocalRgbB] = useState(rgbB)
  const [localCmykC, setLocalCmykC] = useState(cmykC ?? null)
  const [localCmykM, setLocalCmykM] = useState(cmykM ?? null)
  const [localCmykY, setLocalCmykY] = useState(cmykY ?? null)
  const [localCmykK, setLocalCmykK] = useState(cmykK ?? null)
  const [updatingFrom, setUpdatingFrom] = useState<'hex' | 'rgb' | 'cmyk' | null>(null)

  // Sync from props
  useEffect(() => {
    if (updatingFrom === null) {
      setLocalHex(hexCode)
      setLocalRgbR(rgbR)
      setLocalRgbG(rgbG)
      setLocalRgbB(rgbB)
      if (cmykC !== undefined) setLocalCmykC(cmykC)
      if (cmykM !== undefined) setLocalCmykM(cmykM)
      if (cmykY !== undefined) setLocalCmykY(cmykY)
      if (cmykK !== undefined) setLocalCmykK(cmykK)
    }
  }, [hexCode, rgbR, rgbG, rgbB, cmykC, cmykM, cmykY, cmykK, updatingFrom])

  const updateFromHex = useCallback(
    (hex: string) => {
      setUpdatingFrom('hex')
      setLocalHex(hex)
      const rgb = hexToRgb(hex)
      if (rgb) {
        setLocalRgbR(rgb.r)
        setLocalRgbG(rgb.g)
        setLocalRgbB(rgb.b)
        onRgbChange(rgb.r, rgb.g, rgb.b)

        if (onCmykChange) {
          const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b)
          setLocalCmykC(cmyk.c)
          setLocalCmykM(cmyk.m)
          setLocalCmykY(cmyk.y)
          setLocalCmykK(cmyk.k)
          onCmykChange(cmyk.c, cmyk.m, cmyk.y, cmyk.k)
        }
      }
      onHexChange(hex)
      setTimeout(() => setUpdatingFrom(null), 0)
    },
    [onHexChange, onRgbChange, onCmykChange]
  )

  const updateFromRgb = useCallback(
    (r: number | null, g: number | null, b: number | null) => {
      setUpdatingFrom('rgb')
      setLocalRgbR(r)
      setLocalRgbG(g)
      setLocalRgbB(b)

      if (r !== null && g !== null && b !== null) {
        const hex = rgbToHex(r, g, b)
        setLocalHex(hex)
        onHexChange(hex)

        if (onCmykChange) {
          const cmyk = rgbToCmyk(r, g, b)
          setLocalCmykC(cmyk.c)
          setLocalCmykM(cmyk.m)
          setLocalCmykY(cmyk.y)
          setLocalCmykK(cmyk.k)
          onCmykChange(cmyk.c, cmyk.m, cmyk.y, cmyk.k)
        }
      }

      onRgbChange(r, g, b)
      setTimeout(() => setUpdatingFrom(null), 0)
    },
    [onHexChange, onRgbChange, onCmykChange]
  )

  const updateFromCmyk = useCallback(
    (c: number | null, m: number | null, y: number | null, k: number | null) => {
      if (!onCmykChange) return

      setUpdatingFrom('cmyk')
      setLocalCmykC(c)
      setLocalCmykM(m)
      setLocalCmykY(y)
      setLocalCmykK(k)

      if (c !== null && m !== null && y !== null && k !== null) {
        const rgb = cmykToRgb(c, m, y, k)
        setLocalRgbR(rgb.r)
        setLocalRgbG(rgb.g)
        setLocalRgbB(rgb.b)
        onRgbChange(rgb.r, rgb.g, rgb.b)

        const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
        setLocalHex(hex)
        onHexChange(hex)
      }

      onCmykChange(c, m, y, k)
      setTimeout(() => setUpdatingFrom(null), 0)
    },
    [onHexChange, onRgbChange, onCmykChange]
  )

  const currentColor = localHex && /^#[0-9A-Fa-f]{6}$/.test(localHex) ? localHex : '#000000'

  return (
    <div className={className}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color Preview
        </label>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-700 flex-shrink-0"
            style={{ backgroundColor: currentColor }}
          />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => updateFromHex(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Hex Code"
            value={localHex}
            onChange={(e) => {
              const value = e.target.value
              setLocalHex(value)
              if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
                updateFromHex(value)
              }
            }}
            placeholder="#D0CCC9"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            RGB
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="R"
              type="number"
              min="0"
              max="255"
              value={localRgbR ?? ''}
              onChange={(e) => {
                const r = e.target.value ? parseInt(e.target.value) : null
                const g = localRgbG ?? null
                const b = localRgbB ?? null
                if (r !== null && g !== null && b !== null) {
                  updateFromRgb(r, g, b)
                } else {
                  setLocalRgbR(r)
                  onRgbChange(r, g, b)
                }
              }}
              placeholder="R"
            />
            <Input
              label="G"
              type="number"
              min="0"
              max="255"
              value={localRgbG ?? ''}
              onChange={(e) => {
                const g = e.target.value ? parseInt(e.target.value) : null
                const r = localRgbR ?? null
                const b = localRgbB ?? null
                if (r !== null && g !== null && b !== null) {
                  updateFromRgb(r, g, b)
                } else {
                  setLocalRgbG(g)
                  onRgbChange(r, g, b)
                }
              }}
              placeholder="G"
            />
            <Input
              label="B"
              type="number"
              min="0"
              max="255"
              value={localRgbB ?? ''}
              onChange={(e) => {
                const b = e.target.value ? parseInt(e.target.value) : null
                const r = localRgbR ?? null
                const g = localRgbG ?? null
                if (r !== null && g !== null && b !== null) {
                  updateFromRgb(r, g, b)
                } else {
                  setLocalRgbB(b)
                  onRgbChange(r, g, b)
                }
              }}
              placeholder="B"
            />
          </div>
        </div>

        {onCmykChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CMYK
            </label>
            <div className="grid grid-cols-4 gap-2">
              <Input
                label="C"
                type="number"
                min="0"
                max="100"
                value={localCmykC ?? ''}
                onChange={(e) => {
                  const c = e.target.value ? parseInt(e.target.value) : null
                  const m = localCmykM ?? null
                  const y = localCmykY ?? null
                  const k = localCmykK ?? null
                  if (c !== null && m !== null && y !== null && k !== null) {
                    updateFromCmyk(c, m, y, k)
                  } else {
                    setLocalCmykC(c)
                    onCmykChange(c, m, y, k)
                  }
                }}
                placeholder="C"
              />
              <Input
                label="M"
                type="number"
                min="0"
                max="100"
                value={localCmykM ?? ''}
                onChange={(e) => {
                  const m = e.target.value ? parseInt(e.target.value) : null
                  const c = localCmykC ?? null
                  const y = localCmykY ?? null
                  const k = localCmykK ?? null
                  if (c !== null && m !== null && y !== null && k !== null) {
                    updateFromCmyk(c, m, y, k)
                  } else {
                    setLocalCmykM(m)
                    onCmykChange(c, m, y, k)
                  }
                }}
                placeholder="M"
              />
              <Input
                label="Y"
                type="number"
                min="0"
                max="100"
                value={localCmykY ?? ''}
                onChange={(e) => {
                  const y = e.target.value ? parseInt(e.target.value) : null
                  const c = localCmykC ?? null
                  const m = localCmykM ?? null
                  const k = localCmykK ?? null
                  if (c !== null && m !== null && y !== null && k !== null) {
                    updateFromCmyk(c, m, y, k)
                  } else {
                    setLocalCmykY(y)
                    onCmykChange(c, m, y, k)
                  }
                }}
                placeholder="Y"
              />
              <Input
                label="K"
                type="number"
                min="0"
                max="100"
                value={localCmykK ?? ''}
                onChange={(e) => {
                  const k = e.target.value ? parseInt(e.target.value) : null
                  const c = localCmykC ?? null
                  const m = localCmykM ?? null
                  const y = localCmykY ?? null
                  if (c !== null && m !== null && y !== null && k !== null) {
                    updateFromCmyk(c, m, y, k)
                  } else {
                    setLocalCmykK(k)
                    onCmykChange(c, m, y, k)
                  }
                }}
                placeholder="K"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
