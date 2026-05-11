import { useEffect, useState } from 'react';
import {
  adminGetProducts, adminGetOrders, createProduct, updateProduct,
  deleteProduct, updateOrderStatus, exportOrdersCsv,
} from '../api';
import type { Product, Order } from '../api';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_RU: Record<string, string> = {
  PENDING: 'Ожидает', CONFIRMED: 'Подтверждён', PROCESSING: 'Обрабатывается',
  SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
};

type Tab = 'products' | 'orders';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Product form
  const emptyForm = { name: '', description: '', price: '', stock: '', imageUrl: '' };
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    adminGetProducts().then((r) => setProducts(r.data)).finally(() => setLoading(false));
  };
  const loadOrders = () => {
    setLoading(true);
    adminGetOrders().then((r) => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === 'products') loadProducts(); else loadOrders(); }, [tab]);

  const setField = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price || !form.stock) {
      setError('Заполните все обязательные поля'); return;
    }
    setError('');
    const payload = {
      name: form.name, description: form.description,
      price: Number(form.price), stock: Number(form.stock),
      imageUrl: form.imageUrl || undefined,
    };
    try {
      if (editId) {
        await updateProduct(editId, payload);
      } else {
        await createProduct(payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      loadProducts();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description, price: String(p.price), stock: String(p.stock), imageUrl: p.imageUrl || '' });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Скрыть товар?')) return;
    await deleteProduct(id);
    loadProducts();
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    loadOrders();
  };

  const handleExport = async () => {
    const resp = await exportOrdersCsv();
    const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Администрирование</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('products')}>
            Товары
          </button>
          <button className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('orders')}>
            Заказы
          </button>
        </div>

        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
                + Добавить товар
              </button>
            </div>

            {showForm && (
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать товар' : 'Новый товар'}</h3>
                {error && <div className="alert alert-error">{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Название *</label>
                    <input className="form-input" value={form.name} onChange={setField('name')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Изображение (URL)</label>
                    <input className="form-input" value={form.imageUrl} onChange={setField('imageUrl')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Цена (₽) *</label>
                    <input className="form-input" type="number" min="0" value={form.price} onChange={setField('price')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Количество *</label>
                    <input className="form-input" type="number" min="0" value={form.stock} onChange={setField('stock')} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Описание *</label>
                    <textarea className="form-input" value={form.description} onChange={setField('description')} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
                  <button className="btn btn-outline" onClick={() => setShowForm(false)}>Отмена</button>
                </div>
              </div>
            )}

            {loading ? <div className="spinner">Загрузка...</div> : (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Цена</th>
                      <th>Остаток</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{Number(p.price).toLocaleString('ru')} ₽</td>
                        <td>{p.stock}</td>
                        <td>
                          <span className={`status-badge ${p.active ? 'status-DELIVERED' : 'status-CANCELLED'}`}>
                            {p.active ? 'Активен' : 'Скрыт'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}>Изменить</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Скрыть</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-outline" onClick={handleExport}>⬇ Экспорт CSV</button>
            </div>

            {loading ? <div className="spinner">Загрузка...</div> : (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Дата</th>
                      <th>Покупатель</th>
                      <th>Сумма</th>
                      <th>Статус</th>
                      <th>Оплата</th>
                      <th>Изменить статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{o.id.slice(0, 8)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString('ru')}</td>
                        <td>{o.name}<br /><span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{o.phone}</span></td>
                        <td>{Number(o.total).toLocaleString('ru')} ₽</td>
                        <td><span className={`status-badge status-${o.status}`}>{STATUS_RU[o.status]}</span></td>
                        <td>
                          {o.payment ? (
                            <span className={`status-badge status-${o.payment.status}`}>{o.payment.status}</span>
                          ) : '—'}
                        </td>
                        <td>
                          <select
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '.85rem' }}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_RU[s]}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
