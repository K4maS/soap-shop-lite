import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../api';
import type { Order } from '../api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'Обрабатывается',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner">Загрузка...</div>;

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Мои заказы</h1>

        {orders.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Заказов пока нет</div>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Перейти в каталог</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((order) => (
              <div key={order.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Заказ #{order.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleString('ru')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`status-badge status-${order.status}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    {order.payment && (
                      <span className={`status-badge status-${order.payment.status}`}>
                        {order.payment.status === 'PAID' ? '✓ Оплачен' :
                         order.payment.status === 'FAILED' ? 'Ошибка оплаты' : 'Не оплачен'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: '.9rem', color: 'var(--text-muted)' }}>
                  {order.items.map((i) => `${i.product?.name || 'Товар'} × ${i.quantity}`).join(', ')}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontWeight: 700 }}>{Number(order.total).toLocaleString('ru')} ₽</span>
                  <Link to={`/orders/${order.id}`} className="btn btn-outline btn-sm">Подробнее</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
