// src/portal/InventarioMinisterio.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ArrowLeft, Plus, Search, Trash2, Settings, Package, Undo2, Pencil, Clock, HandCoins, ArrowRightLeft, Download } from 'lucide-react';
import { db } from '../firebase';
import { usePortalAuth } from './PortalAuthContext';
import ModalCategorias from './ModalCategorias';
import ModalHistorialItem from './ModalHistorialItem';
import ModalPrestarItem from './ModalPrestarItem';
import { exportarPDF, exportarExcel } from './exportarInventario';

const ESTADOS = [
  { value: 'bueno', label: 'Bueno', color: '#2BAF1E' },
  { value: 'dañado', label: 'Dañado', color: '#D97706' },
  { value: 'necesita_reemplazo', label: 'Necesita reemplazo', color: '#D92D20' },
  { value: 'prestado', label: 'Prestado', color: '#1976D2' },
];

function badgeEstado(estado) {
  return ESTADOS.find((e) => e.value === estado) || ESTADOS[0];
}

export default function InventarioMinisterio() {
  const { userData, user } = usePortalAuth();
  const navigate = useNavigate();

  const esRolDirectivo = ['pastor', 'administrativo'].includes(userData?.rol);
  const ministerio = userData?.ministerio;

  const [ministerios, setMinisterios] = useState({});
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroMinisterio, setFiltroMinisterio] = useState('todos');
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);

  const [mostrarModalCategorias, setMostrarModalCategorias] = useState(false);
  const [itemHistorial, setItemHistorial] = useState(null);
  const [itemPrestar, setItemPrestar] = useState(null);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Toast de confirmación + deshacer
  const [toast, setToast] = useState(null); // { mensaje, onDeshacer }
  const toastTimeoutRef = useRef(null);

  const [ministeriosCargados, setMinisteriosCargados] = useState(false);

  const colorMinisterioPropio =
    userData?.rol === 'lider' && ministerio ? ministerios[ministerio]?.color : null;
  const accentColor = colorMinisterioPropio || (esRolDirectivo ? '#D4AF37' : '#3DDC04');

  // Para roles 'lider' esperamos a tener el color real del ministerio antes de
  // pintar (evita el flash de verde por defecto mientras carga Firestore).
  const listoParaMostrar = esRolDirectivo || ministeriosCargados;

  useEffect(() => {
    cargarMinisterios();
    cargarInventario();
    return () => clearTimeout(toastTimeoutRef.current);
  }, [ministerio]);

  function mostrarToast(mensaje, onDeshacer) {
    clearTimeout(toastTimeoutRef.current);
    setToast({ mensaje, onDeshacer });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000);
  }

  function cerrarToast() {
    clearTimeout(toastTimeoutRef.current);
    setToast(null);
  }

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
    } finally {
      setMinisteriosCargados(true);
    }
  }

  async function cargarInventario() {
    if (!esRolDirectivo && !ministerio) return;
    setCargando(true);
    setError('');
    try {
      const ref = collection(db, 'inventario_portal');
      const q = esRolDirectivo ? ref : query(ref, where('ministerio', '==', ministerio));
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setItems(lista);

      const cats = [...new Set(lista.map((i) => i.categoria).filter(Boolean))];
      setCategoriasDisponibles(cats);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setError('No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  }

  async function registrarActividad(item, accion, detalle) {
    await addDoc(collection(db, 'actividad_inventario'), {
      itemId: item.id,
      itemNombre: item.nombre,
      accion,
      detalle,
      quien: user.email,
      ministerio,
      timestamp: serverTimestamp(),
    });
  }

  async function aplicarCambioEstado(item, nuevoEstado) {
    const ref = doc(db, 'inventario_portal', item.id);
    await updateDoc(ref, {
      estado: nuevoEstado,
      actualizadoPor: user.email,
      actualizadoEn: serverTimestamp(),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, estado: nuevoEstado } : i)));
  }

  async function cambiarEstado(item, nuevoEstado) {
    if (nuevoEstado === item.estado) return;
    const estadoAnterior = item.estado;
    try {
      await aplicarCambioEstado(item, nuevoEstado);
      await registrarActividad(
        item,
        'cambió_estado',
        `${badgeEstado(estadoAnterior).label} → ${badgeEstado(nuevoEstado).label}`
      );

      mostrarToast(`Estado de "${item.nombre}" actualizado a ${badgeEstado(nuevoEstado).label}.`, async () => {
        try {
          await aplicarCambioEstado({ ...item, estado: nuevoEstado }, estadoAnterior);
          await registrarActividad(
            item,
            'cambió_estado',
            `${badgeEstado(nuevoEstado).label} → ${badgeEstado(estadoAnterior).label} (deshecho)`
          );
        } catch (err) {
          console.error('Error deshaciendo cambio de estado:', err);
        }
        cerrarToast();
      });
    } catch (err) {
      console.error('Error actualizando estado:', err);
      setError('No se pudo actualizar el estado.');
    }
  }

  async function eliminarItem(item) {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del inventario?`)) return;
    try {
      await deleteDoc(doc(db, 'inventario_portal', item.id));
      await registrarActividad(item, 'eliminó', '');
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      mostrarToast(`"${item.nombre}" eliminado.`, async () => {
        try {
          const { id, ...datosItem } = item;
          await setDoc(doc(db, 'inventario_portal', id), datosItem);
          await registrarActividad(item, 'restauró', '');
          setItems((prev) => {
            const yaEsta = prev.some((i) => i.id === id);
            if (yaEsta) return prev;
            const nuevaLista = [...prev, item];
            nuevaLista.sort((a, b) => a.nombre.localeCompare(b.nombre));
            return nuevaLista;
          });
        } catch (err) {
          console.error('Error restaurando item:', err);
          setError('No se pudo restaurar el item.');
        }
        cerrarToast();
      });
    } catch (err) {
      console.error('Error eliminando item:', err);
      setError('No se pudo eliminar el item.');
    }
  }

  function cerrarModalCategorias() {
    setMostrarModalCategorias(false);
    cargarInventario();
  }

  const nombreMinisterioActual = esRolDirectivo
    ? 'todos-los-ministerios'
    : (ministerios[ministerio]?.nombre || ministerio || 'inventario').toLowerCase().replace(/\s+/g, '-');

  async function handleExportar(formato) {
    setMostrarMenuExportar(false);
    setExportando(true);
    try {
      const opciones = {
        ministerios,
        incluirMinisterio: esRolDirectivo,
        nombreArchivo: `inventario-${nombreMinisterioActual}`,
      };
      if (formato === 'pdf') {
        await exportarPDF(itemsFiltrados, {
          ...opciones,
          titulo: esRolDirectivo
            ? 'Inventario — Todos los ministerios'
            : `Inventario — ${ministerios[ministerio]?.nombre || ministerio}`,
        });
      } else {
        await exportarExcel(itemsFiltrados, opciones);
      }
    } catch (err) {
      console.error('Error exportando:', err);
      setError('No se pudo exportar. Verifica que las librerías estén instaladas.');
    } finally {
      setExportando(false);
    }
  }

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const coincideBusqueda =
        !busqueda.trim() ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.codigo && item.codigo.toLowerCase().includes(busqueda.toLowerCase())) ||
        (item.ubicacion && item.ubicacion.toLowerCase().includes(busqueda.toLowerCase()));
      const coincideCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria;
      const coincideEstado = filtroEstado === 'todos' || item.estado === filtroEstado;
      const coincideMinisterio =
        !esRolDirectivo || filtroMinisterio === 'todos' || item.ministerio === filtroMinisterio;
      return coincideBusqueda && coincideCategoria && coincideEstado && coincideMinisterio;
    });
  }, [items, busqueda, filtroCategoria, filtroEstado, filtroMinisterio, esRolDirectivo]);

  if (!listoParaMostrar) {
    return <div style={containerStyle} />;
  }

  return (
    <div style={containerStyle}>
      <div style={{ ...accentBarStyle, background: accentColor }} />

      <button onClick={() => navigate('/lideres/dashboard')} style={backBtnStyle}>
        <ArrowLeft size={18} /> Volver al dashboard
      </button>

      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--portal-text)' }}>Inventario</h2>
          <p style={{ color: 'var(--portal-muted)', margin: '4px 0 0' }}>
            {esRolDirectivo
              ? 'Vista consolidada — todos los ministerios'
              : ministerios[ministerio]?.nombre || ministerio || 'ministerio'}
          </p>
        </div>
        <div style={headerBtnsStyle}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMostrarMenuExportar((v) => !v)}
              className="portal-button-secondary"
              style={secondaryBtnStyle}
              disabled={exportando}
            >
              <Download size={16} /> {exportando ? 'Exportando...' : 'Exportar'}
            </button>
            {mostrarMenuExportar && (
              <div style={menuExportarStyle}>
                <button onClick={() => handleExportar('pdf')} style={menuExportarItemStyle}>
                  Exportar a PDF
                </button>
                <button onClick={() => handleExportar('excel')} style={menuExportarItemStyle}>
                  Exportar a Excel
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/lideres/inventario/prestamos')} className="portal-button-secondary" style={secondaryBtnStyle}>
            <ArrowRightLeft size={16} /> Préstamos
          </button>
          {!esRolDirectivo && (
            <>
              <button onClick={() => setMostrarModalCategorias(true)} className="portal-button-secondary" style={secondaryBtnStyle}>
                <Settings size={16} /> Categorías
              </button>
              <button
                onClick={() => navigate('/lideres/inventario/nuevo')}
                style={{ ...primaryBtnStyle, background: accentColor }}
              >
                <Plus size={16} /> Agregar item
              </button>
            </>
          )}
        </div>
      </div>

      <div style={filtrosStyle}>
        <div style={searchBoxStyle}>
          <Search size={16} color="var(--portal-muted)" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={filtroSelectStyle}
        >
          <option value="todas">Todas las categorías</option>
          {categoriasDisponibles.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={filtroSelectStyle}
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        {esRolDirectivo && (
          <select
            value={filtroMinisterio}
            onChange={(e) => setFiltroMinisterio(e.target.value)}
            style={filtroSelectStyle}
          >
            <option value="todos">Todos los ministerios</option>
            {Object.keys(ministerios)
              .sort((a, b) => (ministerios[a]?.nombre || a).localeCompare(ministerios[b]?.nombre || b))
              .map((mId) => (
                <option key={mId} value={mId}>
                  {ministerios[mId]?.nombre || mId}
                </option>
              ))}
          </select>
        )}
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {cargando ? (
        <p style={{ color: 'var(--portal-muted)' }}>Cargando inventario...</p>
      ) : itemsFiltrados.length === 0 ? (
        <div style={emptyStateStyle}>
          <Package size={40} color="var(--portal-muted-2)" />
          <p style={{ color: 'var(--portal-muted)', marginTop: '8px' }}>
            {items.length === 0
              ? 'Aún no hay items en tu inventario.'
              : 'Ningún item coincide con tu búsqueda/filtros.'}
          </p>
        </div>
      ) : (
        <div style={listaStyle}>
          {itemsFiltrados.map((item) => {
            const badge = badgeEstado(item.estado);
            const bajoStock =
              item.cantidadMinima != null && item.cantidad < item.cantidadMinima;
            return (
              <div key={item.id} style={cardStyle}>
                {item.fotoURL && (
                  <img src={item.fotoURL} alt={item.nombre} style={fotoStyle} />
                )}
                <div style={cardBodyStyle}>
                  <div style={cardTopRowStyle}>
                    <div>
                      <strong style={{ color: 'var(--portal-text)' }}>{item.nombre}</strong>
                      {item.codigo && <span style={codigoStyle}> · {item.codigo}</span>}
                    </div>
                    <span
                      style={{
                        ...badgeStyle,
                        color: badge.color,
                        background: 'var(--portal-badge-bg)',
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div style={cardInfoRowStyle}>
                    <span>{item.categoria}</span>
                    {esRolDirectivo && (
                      <>
                        <span>·</span>
                        <span style={{ fontWeight: 600 }}>
                          {ministerios[item.ministerio]?.nombre || item.ministerio}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span style={bajoStock ? { color: '#D92D20', fontWeight: 600 } : undefined}>
                      Cantidad: {item.cantidad}
                      {item.cantidadMinima != null && ` (mín. ${item.cantidadMinima})`}
                    </span>
                    {item.ubicacion && (
                      <>
                        <span>·</span>
                        <span>{item.ubicacion}</span>
                      </>
                    )}
                  </div>

                  <div style={cardActionsStyle}>
                    <select
                      value={item.estado}
                      onChange={(e) => cambiarEstado(item, e.target.value)}
                      style={estadoSelectStyle}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setItemHistorial(item)}
                      style={iconBtnStyle}
                      title="Ver historial"
                    >
                      <Clock size={16} />
                    </button>
                    {!esRolDirectivo && item.cantidad > 0 && (
                      <button
                        onClick={() => setItemPrestar(item)}
                        style={iconBtnStyle}
                        title="Prestar a otro ministerio"
                      >
                        <HandCoins size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/lideres/inventario/${item.id}/editar`)}
                      style={iconBtnStyle}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => eliminarItem(item)}
                      style={iconBtnStyle}
                      title="Eliminar"
                    >
                      <Trash2 size={16} color="#D92D20" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mostrarModalCategorias && (
        <ModalCategorias ministerio={ministerio} onClose={cerrarModalCategorias} />
      )}

      {itemHistorial && (
        <ModalHistorialItem
          itemId={itemHistorial.id}
          itemNombre={itemHistorial.nombre}
          ministerio={itemHistorial.ministerio}
          onClose={() => setItemHistorial(null)}
        />
      )}

      {itemPrestar && (
        <ModalPrestarItem
          item={itemPrestar}
          ministerios={ministerios}
          userEmail={user.email}
          onClose={() => setItemPrestar(null)}
          onPrestado={(nuevaCantidad) => {
            setItems((prev) =>
              prev.map((i) => (i.id === itemPrestar.id ? { ...i, cantidad: nuevaCantidad } : i))
            );
          }}
        />
      )}

      {toast && (
        <div style={toastStyle}>
          <span>{toast.mensaje}</span>
          {toast.onDeshacer && (
            <button onClick={toast.onDeshacer} style={toastBtnStyle}>
              <Undo2 size={14} /> Deshacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '24px 16px',
  boxSizing: 'border-box',
  background: 'var(--portal-bg)',
};

const accentBarStyle = {
  height: '4px',
  borderRadius: '2px',
  marginBottom: '16px',
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
  marginBottom: '16px',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '20px',
};

const headerBtnsStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const primaryBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#fff',
  border: 'none',
  borderRadius: '999px',
  padding: '10px 16px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const secondaryBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'var(--portal-button-secondary-bg)',
  color: 'var(--portal-text)',
  border: '1px solid var(--portal-button-secondary-border)',
  borderRadius: '999px',
  padding: '10px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const filtrosStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '20px',
};

const searchBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid var(--portal-input-border)',
  background: 'var(--portal-input-bg)',
  borderRadius: '8px',
  padding: '8px 12px',
  flex: '1 1 220px',
  boxSizing: 'border-box',
};

const searchInputStyle = {
  border: 'none',
  outline: 'none',
  fontSize: '14px',
  flex: 1,
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'var(--portal-input-text)',
};

const filtroSelectStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--portal-input-border)',
  background: 'var(--portal-input-bg)',
  color: 'var(--portal-input-text)',
  fontSize: '14px',
};

const errorStyle = {
  color: 'var(--portal-error-text)',
  background: 'var(--portal-error-bg)',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '48px 16px',
};

const listaStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardStyle = {
  display: 'flex',
  gap: '12px',
  border: '1px solid var(--portal-card-border)',
  borderRadius: '10px',
  padding: '12px',
  background: 'var(--portal-card-bg)',
  boxSizing: 'border-box',
};

const fotoStyle = {
  width: '64px',
  height: '64px',
  objectFit: 'cover',
  borderRadius: '8px',
  flexShrink: 0,
};

const cardBodyStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minWidth: 0,
};

const cardTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '8px',
  flexWrap: 'wrap',
};

const codigoStyle = {
  color: 'var(--portal-muted)',
  fontSize: '13px',
};

const badgeStyle = {
  fontSize: '12px',
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: '999px',
  whiteSpace: 'nowrap',
  color: 'var(--portal-badge-text)',
};

const cardInfoRowStyle = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  fontSize: '13px',
  color: 'var(--portal-muted)',
};

const cardActionsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: '4px',
};

const estadoSelectStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--portal-input-border)',
  background: 'var(--portal-input-bg)',
  color: 'var(--portal-input-text)',
  fontSize: '13px',
};

const iconBtnStyle = {
  background: 'none',
  border: '1px solid var(--portal-card-border)',
  borderRadius: '6px',
  padding: '6px',
  cursor: 'pointer',
  display: 'flex',
};

const toastStyle = {
  position: 'fixed',
  bottom: '24px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--portal-card-bg)',
  border: '1px solid var(--portal-card-border)',
  color: 'var(--portal-text)',
  borderRadius: '10px',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  fontSize: '14px',
  zIndex: 1200,
  maxWidth: '90vw',
};

const toastBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  background: 'none',
  border: 'none',
  color: 'var(--portal-text)',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontSize: '14px',
};

const menuExportarStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: 'var(--portal-card-bg)',
  border: '1px solid var(--portal-card-border)',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  zIndex: 50,
  minWidth: '160px',
};

const menuExportarItemStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: '13px',
  color: 'var(--portal-text)',
  cursor: 'pointer',
};