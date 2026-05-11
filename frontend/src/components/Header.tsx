import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

export default function Header() {
  const { user, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="header-logo">🧼 Мыловарня</Link>

        <nav className="header-nav">
          <Link to="/" className="nav-link">Каталог</Link>

          {user ? (
            <>
              <Link to="/orders" className="nav-link">Заказы</Link>
              <Link to="/profile" className="nav-link">Профиль</Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="nav-link">Админка</Link>
              )}
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm">Войти</Link>
          )}

          <Link to="/cart" className="cart-badge">
            🛒 {count > 0 ? count : ''}
          </Link>
        </nav>
      </div>
    </header>
  );
}
