// Recorta a cuadrado y comprime una foto elegida por el usuario antes de
// guardarla — así una selfie de varios MB queda en unos cuantos KB, seguro
// para vivir en localStorage. Todo pasa en el navegador, sin subir nada.
export function recortarYComprimir(archivo, { lado = 260, calidad = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const ladoOriginal = Math.min(img.width, img.height)
        const sx = (img.width - ladoOriginal) / 2
        const sy = (img.height - ladoOriginal) / 2

        const canvas = document.createElement('canvas')
        canvas.width = lado
        canvas.height = lado
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, ladoOriginal, ladoOriginal, 0, 0, lado, lado)

        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}
