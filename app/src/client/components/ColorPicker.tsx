const COLOR_PRESETS = [
  { value: '#3b82f6', label: 'Servers' },
  { value: '#22c55e', label: 'Networking' },
  { value: '#f97316', label: 'Storage' },
  { value: '#a855f7', label: 'Power' },
  { value: '#6b7280', label: 'Other' },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      <div className="color-presets">
        {COLOR_PRESETS.map(preset => (
          <button
            key={preset.value}
            type="button"
            className={`color-swatch ${value === preset.value ? 'active' : ''}`}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
            title={preset.label}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="color-custom"
          title="Custom color"
        />
      </div>
    </div>
  )
}

export { COLOR_PRESETS }
