// Sube la imagen destacada de una lección a Firebase Storage — mismo
// patrón que ya usa el portal de inventario/anuncios (comprimir en el
// navegador antes de subir, para no llenar el storage de fotos de varios MB).
import imageCompression from 'browser-image-compression'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../firebase'

export async function subirImagenLeccion(archivo) {
  const comprimido = await imageCompression(archivo, { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true })
  const nombreArchivo = `radgenLecciones/${Date.now()}-${archivo.name}`
  const storageRef = ref(storage, nombreArchivo)
  await uploadBytes(storageRef, comprimido)
  return getDownloadURL(storageRef)
}

// Solo borra si la URL es de nuestro Storage — una lección vieja puede
// traer todavía un link externo de cuando el campo era una URL a mano.
export function borrarImagenLeccion(url) {
  if (!url || !url.includes('firebasestorage')) return
  try {
    const path = decodeURIComponent(url.split('/o/')[1].split('?')[0])
    deleteObject(ref(storage, path)).catch(() => {})
  } catch {
    // URL con formato inesperado — no hay nada que borrar.
  }
}
