import { useState, useEffect } from 'react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { ColorPicker } from './ui/ColorPicker'
import type { PaintColor } from '@/types'

interface PaintColorFormProps {
  paintColor?: PaintColor | null
  onSubmit: (data: Partial<PaintColor>) => void
  onCancel: () => void
  isLoading?: boolean
}

export function PaintColorForm({ paintColor, onSubmit, onCancel, isLoading }: PaintColorFormProps) {
  const [formData, setFormData] = useState<Partial<PaintColor>>({
    brand: '',
    color_name: '',
    hex_code: '',
    rgb_r: null,
    rgb_g: null,
    rgb_b: null,
    cmyk_c: null,
    cmyk_m: null,
    cmyk_y: null,
    cmyk_k: null,
    purchase_url: '',
    product_url: '',
  })

  useEffect(() => {
    if (paintColor) {
      setFormData({
        brand: paintColor.brand || '',
        color_name: paintColor.color_name,
        hex_code: paintColor.hex_code || '',
        rgb_r: paintColor.rgb_r ?? null,
        rgb_g: paintColor.rgb_g ?? null,
        rgb_b: paintColor.rgb_b ?? null,
        cmyk_c: paintColor.cmyk_c ?? null,
        cmyk_m: paintColor.cmyk_m ?? null,
        cmyk_y: paintColor.cmyk_y ?? null,
        cmyk_k: paintColor.cmyk_k ?? null,
        purchase_url: paintColor.purchase_url || '',
        product_url: paintColor.product_url || '',
      })
    } else {
      setFormData({
        brand: '',
        color_name: 'New Color',
        hex_code: '',
        rgb_r: null,
        rgb_g: null,
        rgb_b: null,
        cmyk_c: null,
        cmyk_m: null,
        cmyk_y: null,
        cmyk_k: null,
        purchase_url: '',
        product_url: '',
      })
    }
  }, [paintColor])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData: Partial<PaintColor> = {
      brand: formData.brand || null,
      color_name: formData.color_name || '',
      hex_code: formData.hex_code || null,
      rgb_r: formData.rgb_r ?? null,
      rgb_g: formData.rgb_g ?? null,
      rgb_b: formData.rgb_b ?? null,
      cmyk_c: formData.cmyk_c ?? null,
      cmyk_m: formData.cmyk_m ?? null,
      cmyk_y: formData.cmyk_y ?? null,
      cmyk_k: formData.cmyk_k ?? null,
      purchase_url: formData.purchase_url || null,
      product_url: formData.product_url || null,
    }
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-4">
      <div className="font-medium text-gray-900 dark:text-gray-100">
        {paintColor ? 'Edit Paint Color' : 'Add Paint Color'}
      </div>

      <Input
        label="Brand"
        value={formData.brand || ''}
        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
        placeholder="e.g., Sherwin-Williams, Benjamin Moore"
      />

      <Input
        label="Color Name"
        value={formData.color_name || ''}
        onChange={(e) => setFormData({ ...formData, color_name: e.target.value })}
        placeholder="e.g., Agreeable Gray"
        required
      />

      <ColorPicker
        hexCode={formData.hex_code || '#000000'}
        rgbR={formData.rgb_r ?? null}
        rgbG={formData.rgb_g ?? null}
        rgbB={formData.rgb_b ?? null}
        cmykC={formData.cmyk_c ?? null}
        cmykM={formData.cmyk_m ?? null}
        cmykY={formData.cmyk_y ?? null}
        cmykK={formData.cmyk_k ?? null}
        onHexChange={(hex) => setFormData({ ...formData, hex_code: hex })}
        onRgbChange={(r, g, b) => setFormData({ ...formData, rgb_r: r, rgb_g: g, rgb_b: b })}
        onCmykChange={(c, m, y, k) => setFormData({ ...formData, cmyk_c: c, cmyk_m: m, cmyk_y: y, cmyk_k: k })}
      />

      <Input
        label="Purchase URL"
        type="url"
        value={formData.purchase_url || ''}
        onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
        placeholder="https://..."
      />

      <Input
        label="Product URL"
        type="url"
        value={formData.product_url || ''}
        onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
        placeholder="https://..."
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={isLoading}>
          {paintColor ? 'Update' : 'Add'} Color
        </Button>
      </div>
    </form>
  )
}
