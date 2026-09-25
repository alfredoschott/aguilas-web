// Qué tan "rara" es la carta de un joven según su nivel de experiencia:
// sube de común a legendaria conforme avanza. La líder siempre es de líder.
export function rarezaDe(nivel, esLider) {
  if (esLider) return { id: 'lider', nombre: 'Líder', color: '#f0c14b' }
  if (nivel >= 10) return { id: 'legendaria', nombre: 'Legendaria', color: '#f0c14b' }
  if (nivel >= 6) return { id: 'epica', nombre: 'Épica', color: '#9333e3' }
  if (nivel >= 3) return { id: 'rara', nombre: 'Rara', color: '#1fb57a' }
  return { id: 'comun', nombre: 'Común', color: '#3a7bff' }
}

// Mismos degradados que `.re-fondo-perfil--*` en radgen.css, para que la
// imagen compartida se vea igual que la carta en pantalla.
export const FONDOS_CARTA = {
  fuego: ['#ff9d5c', '#ff3b3b'],
  oceano: ['#6fc6ff', '#2952e3'],
  bosque: ['#8be08c', '#1f8a4c'],
  amanecer: ['#ffd93b', '#ff6a3b'],
  noche: ['#3a3a52', '#101014'],
}
export const FONDO_CARTA_POR_DEFECTO = ['#bcd3ff', '#3a7bff']

// Número de carta estable por joven (mismo joven, mismo número siempre).
export function numeroDeCarta(uid) {
  let hash = 7
  for (let i = 0; i < (uid || '').length; i++) hash = (hash * 31 + uid.charCodeAt(i)) % 9973
  return String(hash).padStart(4, '0')
}

// La bio como "texto de ambientación" de la carta, entre comillas — salvo
// que el joven ya haya puesto las suyas (p. ej. al citar un versículo).
export function bioDeCarta(bio, maximo = Infinity) {
  const limpia = (bio || '').trim().slice(0, maximo)
  if (!limpia) return 'Águila en formación. Hay un lugar para ti.'
  return /["“”]/.test(limpia) ? limpia : `“${limpia}”`
}
