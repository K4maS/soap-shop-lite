import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function CartPage() {
  const { items, remove, update, total, clear } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <main className="page">
        <div className="container">
          <h1 className="page-title">Корзина</h1>
          <div className="empty">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">Корзина пуста</div>
            <p style={{ marginBottom: 20 }}>Добавьте товары из каталога</p>
            <Link to="/" className="btn btn-primary">Перейти в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Корзина</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          <div className="card">
            {items.map((item) => (
              <div key={item.product.id} className="cart-item">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="cart-item-img" />
                ) : (
                  <div className="cart-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🧼</div>
                )}
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="cart-item-price">{Number(item.product.price).toLocaleString('ru')} ₽</div>
                </div>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => update(item.product.id, item.quantity - 1)}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => update(item.product.id, item.quantity + 1)}>+</button>
                </div>
                <div style={{ fontWeight: 700, minWidth: 80, textAlign: 'right' }}>
                  {(Number(item.product.price) * item.quantity).toLocaleString('ru')} ₽
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => remove(item.product.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Итого</h3>
            {items.map((item) => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.product.name} × {item.quantity}</span>
                <span>{(Number(item.product.price) * item.quantity).toLocaleString('ru')} ₽</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Сумма</span>
              <span>{total().toLocaleString('ru')} ₽</span>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleCheckout}>
              Оформить заказ
            </button>
            <button className="btn btn-outline btn-full btn-sm" style={{ marginTop: 8 }} onClick={clear}>
              Очистить корзину
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
