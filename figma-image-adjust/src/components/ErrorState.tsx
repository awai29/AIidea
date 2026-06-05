import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center',
      color: '#888',
    }}>
      <AlertCircle size={32} color="#ccc" />
      <p style={{ fontSize: 12, lineHeight: 1.5 }}>{message}</p>
    </div>
  )
}
