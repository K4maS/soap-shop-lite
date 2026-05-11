import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createOrder, createPayment } from '../api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clear } = useCartStore();
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    phone: user?.phone || '',
    address: '',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }
    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const order = await createOrder({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        address: form.address,
        name: form.name,
        phone: form.phone,
        comment: form.comment || undefined,
      });

      clear();

      // Create payment
      try {
        const payment = await createPayment(order.data.id);
        if (payment.data.confirmUrl) {
          window.location.href = payment.data.confirmUrl;
          return;
        }
      } catch {
        // Payment creation failed — still go to orders
      }

      navigate(`/orders/${order.data.id}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка оформления заказа');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="page">
        <div className="container">
          <div className="alert alert-info">Корзина пуста. <Link to="/">Вернуться в каталог</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Оформление заказа</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>Данные доставки</h3>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Имя *</label>
              <input className="form-input" placeholder="Иван Иванов" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Телефон *</label>
              <input className="form-input" type="tel" placeholder="+79000000000" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Адрес доставки *</label>
              <input className="form-input" placeholder="Город, улица, дом, квартира" value={form.address} onChange={set('address')} />
            </div>
            <div className="form-group">
              <label className="form-label">Комментарий к заказу</label>
              <textarea className="form-input" placeholder="Пожелания, удобное время доставки..." value={form.comment} onChange={set('comment')} />
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Оформление...' : 'Оформить и перейти к оплате'}
            </button>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Ваш заказ</h3>
            {items.map((item) => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.product.name} × {item.quantity}</span>
                <span>{(Number(item.product.price) * item.quantity).toLocaleString('ru')} ₽</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Итого</span>
              <span>{total().toLocaleString('ru')} ₽</span>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
              Оплата через YooKassa. Принимаем карты Visa, Mastercard, МИР.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
