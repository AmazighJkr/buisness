import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../hooks/useCart.js'

export default function NavCart() {
  const { itemCount } = useCart()

  return (
    <Link to="/shop/cart" className="nav-cart-link" title="Cart" aria-label={`Cart (${itemCount} items)`}>
      <ShoppingCart className="h-4 w-4 shrink-0" />
      {itemCount > 0 && <span className="nav-cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>}
    </Link>
  )
}
