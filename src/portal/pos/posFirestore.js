// Punto único de acceso a Firestore para el POS.
export {
  collection, doc, query, where, onSnapshot, getDocs, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
export { db } from '../../firebase'
