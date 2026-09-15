import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

// Mismo proyecto de Firebase que ya usa el sitio principal de la iglesia
// (aguilas-web-iglesia) — RadGen Education vive ahí también, en sus
// propias colecciones (prefijo `radgen`), sin tocar las de la iglesia.
const firebaseConfig = {
  apiKey: "AIzaSyDfqj9bnJvTWonmsKUkjwMPGgKtxjPDyQ8",
  authDomain: "aguilas-cfc-tizayuca.firebaseapp.com",
  projectId: "aguilas-cfc-tizayuca",
  storageBucket: "aguilas-cfc-tizayuca.firebasestorage.app",
  messagingSenderId: "204649179835",
  appId: "1:204649179835:web:32d27592ff64d85057579e",
  measurementId: "G-PX06ZT05PQ",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
