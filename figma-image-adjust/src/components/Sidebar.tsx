export type ToolId = 'hsl' | 'colorBalance' | 'levels'

interface SidebarProps {
  active: ToolId;
  onChange: (tool: ToolId) => void;
}

const TOOLS: { id: ToolId; label: string; title: string }[] = [
  { id: 'hsl', label: 'HS', title: '色相/飽和度' },
  { id: 'colorBalance', label: 'CB', title: '色彩平衡' },
  { id: 'levels', label: 'LV', title: '色階' },
]

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px',
      borderBottom: '1px solid #e5e5e5', background: '#fafafa',
    }}>
      {TOOLS.map(({ id, label, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => onChange(id)}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid',
            borderColor: active === id ? '#18A0FB' : '#d4d4d4',
            background: active === id ? '#18A0FB' : '#fff',
            color: active === id ? '#fff' : '#555',
            fontWeight: active === id ? 600 : 400,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
