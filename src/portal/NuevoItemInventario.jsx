// src/portal/NuevoItemInventario.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { db, storage } from '../firebase';
import { usePortalAuth } from './PortalAuthContext';
import ModalCategorias from './ModalCategorias';
import { crearNotificacionInventario } from './notificaciones';

const ESTADOS = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'dañado', label: 'Dañado' },
  { value: 'necesita_reemplazo', label: 'Necesita reemplazo' },
  { value: 'prestado', label: 'Prestado' },
];

export default function NuevoItemInventario() {
  const { userData, user } = usePortalAuth();
  const navigate = useNavigate();

  const esRolDirectivo = ['pastor', 'administrativo'].includes(userData?.rol);
  const ministerio = userData?.ministerio;

  const [ministerios, setMinisterios] = useState({});
  const [ministeriosCargados, setMinisteriosCargados] = useState(false);

  const colorMinisterioPropio =
    userData?.rol === 'lider' && ministerio ? ministerios[ministerio]?.color : null;
  const accentColor = colorMinisterioPropio || (esRolDirectivo ? '#D4AF37' : '#3DDC04');
  const listoParaMostrar = esRolDirectivo || ministeriosCargados;

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [cantidadMinima, setCantidadMinima] = useState('');
  const [estado, setEstado] = useState('bueno');
  const [ubicacion, setUbicacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [notas, setNotas] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const [mostrarModalCategorias, setMostrarModalCategorias] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMinisterios();
    cargarCategorias();
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
    } finally {
      setMinisteriosCargados(true);
    }
  }

  async function cargarCategorias() {
    if (!ministerio) return;
    setCargandoCategorias(true);
    try {
      const ref = doc(db, 'categorias_ministerio', ministerio);
      const snap = await getDoc(ref);
      const lista = snap.exists() ? snap.data().categorias || [] : [];
      setCategorias(lista);
      if (lista.length > 0 && !categoria) {
        setCategoria(lista[0]);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setCargandoCategorias(false);
    }
  }

  function cerrarModalCategorias() {
    setMostrarModalCategorias(false);
    cargarCategorias();
  }

  // Comprime la imagen en el navegador antes de subirla (reduce tamaño y ahorra espacio en Storage)
  function comprimirImagen(file, maxWidth = 1000, calidad = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const lector = new FileReader();

      lector.onload = (e) => {
        img.src = e.target.result;
      };
      lector.onerror = reject;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('No se pudo comprimir la imagen'));
          },
          'image/jpeg',
          calidad
        );
      };
      img.onerror = reject;

      lector.readAsDataURL(file);
    });
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }

    try {
      const comprimida = await comprimirImagen(file);
      setFoto(comprimida);
      setFotoPreview(URL.createObjectURL(comprimida));
      setError('');
    } catch (err) {
      console.error('Error comprimiendo imagen:', err);
      setError('No se pudo procesar la imagen. Intenta con otra.');
    }
  }

  function quitarFoto() {
    setFoto(null);
    setFotoPreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!categoria) {
      setError('Selecciona una categoría (o crea una primero).');
      return;
    }
    if (!ministerio) {
      setError('No se pudo determinar tu ministerio. Contacta al administrador.');
      return;
    }

    setGuardando(true);
    try {
      let fotoURL = null;
      if (foto) {
        const nombreArchivo = `inventario/${ministerio}/${Date.now()}.jpg`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        fotoURL = await getDownloadURL(storageRef);
      }

      const nuevoItem = {
        nombre: nombre.trim(),
        categoria,
        cantidad: Number(cantidad) || 0,
        cantidadMinima: cantidadMinima !== '' ? Number(cantidadMinima) : null,
        estado,
        ubicacion: ubicacion.trim(),
        codigo: codigo.trim(),
        notas: notas.trim(),
        fotoURL,
        ministerio,
        creadoPor: user.email,
        creadoEn: serverTimestamp(),
        actualizadoPor: user.email,
        actualizadoEn: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'inventario_portal'), nuevoItem);

      await addDoc(collection(db, 'actividad_inventario'), {
        itemId: docRef.id,
        itemNombre: nuevoItem.nombre,
        accion: 'agregó',
        detalle: `Cantidad inicial: ${nuevoItem.cantidad}`,
        quien: user.email,
        ministerio,
        timestamp: serverTimestamp(),
      });

      if (nuevoItem.cantidadMinima != null && nuevoItem.cantidad < nuevoItem.cantidadMinima) {
        await crearNotificacionInventario({
          ministerioId: ministerio,
          itemId: docRef.id,
          itemNombre: nuevoItem.nombre,
          cantidad: nuevoItem.cantidad,
          cantidadMinima: nuevoItem.cantidadMinima,
          creadoPor: user.email,
        });
      }

      navigate('/lideres/inventario');
    } catch (err) {
      console.error('Error guardando item:', err);
      setError('No se pudo guardar el item. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  if (!listoParaMostrar) {
    return <div style={containerStyle} />;
  }

  return (
    <div style={containerStyle}>
      <div style={{ ...accentBarStyle, background: accentColor }} />

      <button onClick={() => navigate('/lideres/inventario')} style={backBtnStyle}>
        <ArrowLeft size={18} /> Volver a inventario
      </button>

      <h2 style={{ marginBottom: '4px', color: 'var(--portal-text)' }}>Nuevo item de inventario</h2>
      <p style={{ color: 'var(--portal-muted)', marginTop: 0, marginBottom: '24px' }}>
        Ministerio: <strong>{ministerios[ministerio]?.nombre || ministerio || '—'}</strong>
      </p>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Micrófono inalámbrico"
            style={inputStyle}
            disabled={guardando}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Categoría *</label>
          {cargandoCategorias ? (
            <p style={{ fontSize: '13px', color: 'var(--portal-muted)' }}>Cargando categorías...</p>
          ) : categorias.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--portal-error-text)' }}>
              Aún no tienes categorías.{' '}
              <button
                type="button"
                onClick={() => setMostrarModalCategorias(true)}
                style={linkBtnStyle}
              >
                Crea la primera aquí
              </button>
            </p>
          ) : (
            <div style={selectRowStyle}>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={selectStyle}
                disabled={guardando}
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMostrarModalCategorias(true)}
                className="portal-button-secondary"
                style={manageBtnStyle}
              >
                Gestionar
              </button>
            </div>
          )}
        </div>

        <div style={rowStyle}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>Cantidad *</label>
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={inputStyle}
              disabled={guardando}
            />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>Cantidad mínima (opcional)</label>
            <input
              type="number"
              min="0"
              value={cantidadMinima}
              onChange={(e) => setCantidadMinima(e.target.value)}
              placeholder="Alerta si baja de..."
              style={inputStyle}
              disabled={guardando}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={selectStyle}
            disabled={guardando}
          >
            {ESTADOS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={rowStyle}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>Ubicación</label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej. Bodega principal"
              style={inputStyle}
              disabled={guardando}
            />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>Código / etiqueta (opcional)</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. AUD-003"
              style={inputStyle}
              disabled={guardando}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
            disabled={guardando}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Foto (opcional)</label>
          {fotoPreview ? (
            <div style={fotoPreviewWrapStyle}>
              <img src={fotoPreview} alt="Vista previa" style={fotoPreviewStyle} />
              <button type="button" onClick={quitarFoto} style={quitarFotoBtnStyle}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <label style={uploadBtnStyle}>
              <Upload size={18} />
              <span>Subir foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
                disabled={guardando}
              />
            </label>
          )}
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <button
          type="submit"
          style={{ ...submitBtnStyle, background: accentColor }}
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : 'Guardar item'}
        </button>
      </form>

      {mostrarModalCategorias && (
        <ModalCategorias ministerio={ministerio} onClose={cerrarModalCategorias} />
      )}
    </div>
  );
}

const containerStyle = {
  maxWidth: '560px',
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
  marginBottom: '20px',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const rowStyle = {
  display: 'flex',
  gap: '12px',
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

const selectStyle = {
  ...inputStyle,
};

const selectRowStyle = {
  display: 'flex',
  gap: '8px',
};

const manageBtnStyle = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--portal-button-secondary-border)',
  background: 'var(--portal-button-secondary-bg)',
  color: 'var(--portal-text)',
  cursor: 'pointer',
  fontSize: '13px',
  whiteSpace: 'nowrap',
};

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-primario, #3DDC04)',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: 0,
  fontSize: '13px',
};

const uploadBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px dashed var(--portal-input-border)',
  background: 'var(--portal-input-bg)',
  color: 'var(--portal-text)',
  cursor: 'pointer',
  fontSize: '14px',
  width: 'fit-content',
};

const fotoPreviewWrapStyle = {
  position: 'relative',
  width: 'fit-content',
};

const fotoPreviewStyle = {
  width: '140px',
  height: '140px',
  objectFit: 'cover',
  borderRadius: '8px',
  border: '1px solid var(--portal-card-border)',
  display: 'block',
};

const quitarFotoBtnStyle = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  background: '#D92D20',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  color: '#fff',
  border: 'none',
  borderRadius: '999px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '8px',
};