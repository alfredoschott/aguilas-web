// src/portal/PrestamosInventario.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { db } from '../firebase';
import { usePortalAuth } from './PortalAuthContext';

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PrestamosInventario() {
  const { userData, user } = usePortalAuth();
  const navigate = useNavigate();

  const esRolDirectivo = ['pastor', 'administrativo'].includes(userData?.rol);
  const ministerio = userData?.ministerio;

  const [ministerios, setMinisterios] = useState({});
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    cargarMinisterios();
    cargarPrestamos();
  }, [ministerio]);

  async function cargarMinisterios() {
    try {
      const snap = await getDocs(collection(db, 'ministerios'));
      const datos = {};
      snap.forEach((d) => {
        datos[d.id] = d.data();
      });
      setMinisterios(datos);
    } catch (err) {
      console.error('Error cargando ministerios:', err);
    }
  }

  async function cargarPrestamos() {
    setCargando(true);
    setError('');
    try {
      const ref = collection(db, 'prestamos_inventario');
      let lista = [];

      if (esRolDirectivo) {
        const snap = await getDocs(ref);
        lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else if (ministerio) {
        const [snapOrigen, snapDestino] = await Promise.all([
          getDocs(query(ref, where('ministerioOrigen', '==', ministerio))),
          getDocs(query(ref, where('ministerioDestino', '==', ministerio))),
        ]);
        const mapa = new Map();
        snapOrigen.docs.forEach((d) => mapa.set(d.id, { id: d.id, ...d.data() }));
        snapDestino.docs.forEach((d) => mapa.set(d.id, { id: d.id, ...d.data() }));
        lista = Array.from(mapa.values());
      }

      lista.sort((a, b) => (b.fechaPrestamo?.seconds || 0) - (a.fechaPrestamo?.seconds || 0));
      setPrestamos(lista);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
      setError('No se pudieron cargar los préstamos.');
    } finally {
      setCargando(false);
    }
  }

  async function marcarDevuelto(prestamo) {
    if (!window.confirm(`¿Confirmar que "${prestamo.itemNombre}" (${prestamo.cantidad}) fue devuelto?`))
      return;

    setProcesando(prestamo.id);
    try {
      await updateDoc(doc(db, 'prestamos_inventario', prestamo.id), {
        estado: 'devuelto',
        devueltoPor: user.email,
        fechaDevolucion: serverTimestamp(),
      });

      // Regresar la cantidad al item original, si todavía existe
      const itemRef = doc(db, 'inventario_portal', prestamo.itemId);
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        const cantidadActual = itemSnap.data().cantidad || 0;
        await updateDoc(itemRef, {
          cantidad: cantidadActual + prestamo.cantidad,
          actualizadoPor: user.email,
          actualizadoEn: serverTimestamp(),
        });

        await addDoc(collection(db, 'actividad_inventario'), {
          itemId: prestamo.itemId,
          itemNombre: prestamo.itemNombre,
          accion: 'recibió_devolución',
          detalle: `${prestamo.cantidad} de ${ministerios[prestamo.ministerioDestino]?.nombre || prestamo.ministerioDestino}`,
          quien: user.email,
          ministerio: prestamo.ministerioOrigen,
          timestamp: serverTimestamp(),
        });
      }

      setPrestamos((prev) =>
        prev.map((p) => (p.id === prestamo.id ? { ...p, estado: 'devuelto' } : p))
      );
    } catch (err) {
      console.error('Error marcando devolución:', err);
      setError('No se pudo marcar como devuelto.');
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div style={containerStyle}>
      <button onClick={() => navigate('/lideres/inventario')} style={backBtnStyle}>
        <ArrowLeft size={18} /> Volver a inventario
      </button>

      <h2 style={{ margin: 0, color: 'var(--portal-text)' }}>Préstamos</h2>
      <p style={{ color: 'var(--portal-muted)', margin: '4px 0 24px' }}>
        {esRolDirectivo ? 'Todos los ministerios' : 'Prestados y recibidos por tu ministerio'}
      </p>

      {error && <p style={errorStyle}>{error}</p>}

      {cargando ? (
        <p style={{ color: 'var(--portal-muted)' }}>Cargando...</p>
      ) : prestamos.length === 0 ? (
        <p style={{ color: 'var(--portal-muted)', textAlign: 'center', padding: '32px 0' }}>
          No hay préstamos registrados todavía.
        </p>
      ) : (
        <div style={listaStyle}>
          {prestamos.map((p) => {
            const activo = p.estado === 'activo';
            return (
              <div key={p.id} style={cardStyle}>
                <div style={cardTopRowStyle}>
                  <strong style={{ color: 'var(--portal-text)' }}>{p.itemNombre}</strong>
                  <span
                    style={{
                      ...badgeStyle,
                      color: activo ? '#D97706' : '#2BAF1E',
                      background: 'var(--portal-badge-bg)',
                    }}
                  >
                    {activo ? 'Prestado' : 'Devuelto'}
                  </span>
                </div>
                <p style={{ margin: '6px 0', fontSize: '14px', color: 'var(--portal-muted)' }}>
                  {ministerios[p.ministerioOrigen]?.nombre || p.ministerioOrigen} →{' '}
                  {ministerios[p.ministerioDestino]?.nombre || p.ministerioDestino} · Cantidad:{' '}
                  {p.cantidad}
                </p>
                {p.notas && (
                  <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--portal-muted)' }}>
                    "{p.notas}"
                  </p>
                )}
                <div style={fechaRowStyle}>
                  <Clock size={13} />
                  Prestado: {formatearFecha(p.fechaPrestamo)}
                  {!activo && ` · Devuelto: ${formatearFecha(p.fechaDevolucion)}`}
                </div>
                {activo && (
                  <button
                    onClick={() => marcarDevuelto(p)}
                    className="portal-button-secondary"
                    style={devolverBtnStyle}
                    disabled={procesando === p.id}
                  >
                    <CheckCircle2 size={15} />
                    {procesando === p.id ? 'Guardando...' : 'Marcar como devuelto'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '24px 16px',
  boxSizing: 'border-box',
  background: 'var(--portal-bg)',
};

const backBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'none',
  border: 'none',
  color: 'var(--portal-muted)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: 0,
  marginBottom: '20px',
};

const errorStyle = {
  color: 'var(--portal-error-text)',
  background: 'var(--portal-error-bg)',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
};

const listaStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardStyle = {
  border: '1px solid var(--portal-card-border)',
  borderRadius: '10px',
  padding: '14px',
  background: 'var(--portal-card-bg)',
};

const cardTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

const badgeStyle = {
  fontSize: '12px',
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: '999px',
  whiteSpace: 'nowrap',
};

const fechaRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '12px',
  color: 'var(--portal-muted)',
  marginBottom: '10px',
};

const devolverBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'var(--portal-button-secondary-bg)',
  color: 'var(--portal-text)',
  border: '1px solid var(--portal-button-secondary-border)',
  borderRadius: '999px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
};