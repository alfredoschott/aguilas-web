// src/portal/ModalPrestarItem.jsx
import { useState } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from '../firebase';

export default function ModalPrestarItem({ item, ministerios, userEmail, onClose, onPrestado }) {
  const opcionesMinisterio = Object.keys(ministerios)
    .filter((mId) => mId !== item.ministerio)
    .sort((a, b) => (ministerios[a]?.nombre || a).localeCompare(ministerios[b]?.nombre || b));

  const [destino, setDestino] = useState(opcionesMinisterio[0] || '');
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cantidadNum = Number(cantidad);
    if (!destino) {
      setError('Selecciona a qué ministerio le prestas.');
      return;
    }
    if (!cantidadNum || cantidadNum < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }
    if (cantidadNum > item.cantidad) {
      setError(`Solo tienes ${item.cantidad} disponible(s).`);
      return;
    }

    setGuardando(true);
    try {
      await addDoc(collection(db, 'prestamos_inventario'), {
        itemId: item.id,
        itemNombre: item.nombre,
        ministerioOrigen: item.ministerio,
        ministerioDestino: destino,
        cantidad: cantidadNum,
        notas: notas.trim(),
        prestadoPor: userEmail,
        fechaPrestamo: serverTimestamp(),
        devueltoPor: null,
        fechaDevolucion: null,
        estado: 'activo',
      });

      const nuevaCantidad = item.cantidad - cantidadNum;
      await updateDoc(doc(db, 'inventario_portal', item.id), {
        cantidad: nuevaCantidad,
        actualizadoPor: userEmail,
        actualizadoEn: serverTimestamp(),
      });

      await addDoc(collection(db, 'actividad_inventario'), {
        itemId: item.id,
        itemNombre: item.nombre,
        accion: 'prestó',
        detalle: `${cantidadNum} a ${ministerios[destino]?.nombre || destino}`,
        quien: userEmail,
        ministerio: item.ministerio,
        timestamp: serverTimestamp(),
      });

      onPrestado(nuevaCantidad);
      onClose();
    } catch (err) {
      console.error('Error registrando préstamo:', err);
      setError('No se pudo registrar el préstamo. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--portal-text)' }}>Prestar item</h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--portal-muted)' }}>
              {item.nombre} · {item.cantidad} disponible(s)
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={20} />
          </button>
        </div>

        {opcionesMinisterio.length === 0 ? (
          <p style={{ color: 'var(--portal-muted)', fontSize: '14px' }}>
            No hay otros ministerios registrados todavía.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Prestar a</label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                style={inputStyle}
                disabled={guardando}
              >
                {opcionesMinisterio.map((mId) => (
                  <option key={mId} value={mId}>
                    {ministerios[mId]?.nombre || mId}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Cantidad</label>
              <input
                type="number"
                min="1"
                max={item.cantidad}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                style={inputStyle}
                disabled={guardando}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Notas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                disabled={guardando}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button type="submit" className="portal-button-primary" style={submitBtnStyle} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Registrar préstamo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

const modalStyle = {
  background: 'var(--portal-card-bg)',
  border: '1px solid var(--portal-card-border)',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '420px',
  boxSizing: 'border-box',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  color: 'var(--portal-muted)',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--portal-label-text)',
};

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--portal-input-border)',
  background: 'var(--portal-input-bg)',
  color: 'var(--portal-input-text)',
  fontSize: '14px',
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'inherit',
};

const errorStyle = {
  color: 'var(--portal-error-text)',
  background: 'var(--portal-error-bg)',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  margin: 0,
};

const submitBtnStyle = {
  background: 'var(--color-primario, #3DDC04)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
};