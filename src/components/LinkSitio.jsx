import { Link } from 'react-router-dom'
import { esExterna } from '../dominios'

// <Link> que se vuelve <a> normal cuando el destino está en el otro dominio.
export default function LinkSitio({ to, ...props }) {
  return esExterna(to) ? <a href={to} {...props} /> : <Link to={to} {...props} />
}
