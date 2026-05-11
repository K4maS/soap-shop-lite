import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMyOrder, createPayment } from '../api';
import type { Order } from '../api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMyOrder(id).then((r) => setOrder(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    if (!id) return;
    setPayLoading(true);
    try {
      const { data } = await createPayment(id);
      if (data.confirmUrl) window.location.href = data.confirmUrl;
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return <div className="spinner">Загрузка...</div>;
  if (!order) return (
    <main className="page"><div className="container">
      <div className="alert alert-error">Заказ не найден</div>
    </div></main>
  );

  const unpaid = !order.payment || order.payment.status === 'PENDING' || order.payment.status === 'FAILED';

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <Link to="/orders" className="btn btn-outline btn-sm" style={{ marginBottom: 24 }}>← Мои заказы</Link>

        <h1 className="page-title" style={{ marginBottom: 8 }}>
          Заказ #{order.id.slice(0, 8)}
        </h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <span className={`status-badge status-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
          {order.payment && (
            <span className={`status-badge status-${order.payment.status}`}>
              {order.payment.status === 'PAID' ? '✓ Оплачен' :
               order.payment.status === 'FAILED' ? 'Ошибка оплаты' : 'Ожидает оплаты'}
            </span>
          )}
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Состав заказа</h3>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{item.product?.name || 'Товар'} × {item.quantity}</span>
              <span style={{ fontWeight: 600 }}>{(Number(item.price) * item.quantity).toLocaleString('ru')} ₽</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 12 }}>
            <span>Итого</span>
            <span>{Number(order.total).toLocaleString('ru')} ₽</span>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Доставка</h3>
          <p><strong>Получатель:</strong> {order.name}</p>
          <p><strong>Телефон:</strong> {order.phone}</p>
          <p><strong>Адрес:</strong> {order.address}</p>
          {order.comment && <p><strong>Комментарий:</strong> {order.comment}</p>}
        </div>

        {unpaid && order.status !== 'CANCELLED' && (
          <button className="btn btn-primary btn-full" onClick={handlePay} disabled={payLoading}>
            {payLoading ? 'Перенаправление...' : `Оплатить ${Number(order.total).toLocaleString('ru')} ₽`}
          </button>
        )}
      </div>
    </main>
  );
}
