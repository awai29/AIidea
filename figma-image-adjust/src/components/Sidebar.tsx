import { Sun, Moon } from 'lucide-react'

export type ToolId = 'hsl' | 'colorBalance' | 'levels' | 'curves'

interface SidebarProps {
  active: ToolId;
  onChange: (tool: ToolId) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  modifiedTools: Set<ToolId>;
}

const TOOLS: { id: ToolId; label: string; title: string }[] = [
  { id: 'hsl',          label: '色相', title: '色相/飽和度' },
  { id: 'colorBalance', label: '色彩', title: '色彩平衡' },
  { id: 'levels',       label: '色階', title: '色階' },
  { id: 'curves',       label: '曲線', title: '曲線' },
]

export function Sidebar({ active, onChange, theme, onThemeToggle, modifiedTools }: SidebarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '7px 10px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--sidebar-bg)',
    }}>
      {/* 工具按鈕 */}
      {TOOLS.map(({ id, label, title }) => {
        const isActive = active === id
        const isModified = modifiedTools.has(id)
        return (
          <button
            key={id}
            title={title}
            onClick={() => onChange(id)}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: isActive ? '#18A0FB' : 'var(--btn-border)',
              background: isActive ? '#18A0FB' : 'var(--btn-bg)',
              color: isActive ? '#fff' : 'var(--text-dim)',
              fontWeight: isActive ? 600 : 400,
              fontSize: 11,
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {label}
            {/* 已修改指示點 */}
            {isModified && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 4, height: 4, borderRadius: '50%',
                background: isActive ? '#fff' : '#18A0FB',
              }} />
            )}
          </button>
        )
      })}

      {/* 彈性空間 */}
      <div style={{ flex: 1 }} />

      {/* Light / Dark 切換 */}
      <button
        title={theme === 'light' ? '切換深色模式' : '切換淺色模式'}
        onClick={onThemeToggle}
        style={{
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--btn-border)',
          borderRadius: 6,
          background: 'var(--btn-bg)',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {theme === 'light'
          ? <Moon size={14} />
          : <Sun size={14} />
        }
      </button>
    </div>
  )
}
