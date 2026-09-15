import { useState } from 'react'

// Solo en desarrollo: acceso rápido a todo lo que existe en el proyecto.
// Todo vive en el mismo servidor ahora que RadGen Education está integrado
// aquí. Nunca se muestra en producción.
const PAGINAS = [
  { emoji: '🏠', nombre: 'Inicio', url: '/' },
  { emoji: '🦅', nombre: 'RadGen', url: '/radgen' },
  { emoji: '🎓', nombre: 'RadGen Education', url: '/radgen/education' },
  { emoji: '🔐', nombre: 'Portal líderes', url: '/lideres' },
]

export default function DevNav() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999, fontFamily: 'system-ui, sans-serif' }}>
      {abierto && (
        <div
          style={{
            marginBottom: 8,
            background: '#111',
            border: '1.5px solid #444',
            borderRadius: 10,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 190,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          {PAGINAS.map((p) => (
            <a
              key={p.url}
              href={p.url}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                background: p.url === window.location.pathname ? '#2a2a2a' : 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span>{p.emoji}</span>
              <span>{p.nombre}</span>
            </a>
          ))}
        </div>
      )}
      <button
        onClick={() => setAbierto((a) => !a)}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1.5px solid #444',
          background: '#111',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
        title="Navegación de desarrollo"
      >
        🧭
      </button>
    </div>
  )
}
