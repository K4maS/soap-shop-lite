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
const PAYMENT_RU: Record<string, string> = {
  PENDING: 'Не оплачен', PAID: 'Оплачен', FAILED: 'Ошибка', REFUNDED: 'Возврат',
};

type Tab = 'products' | 'orders';

const emptyForm = { name: '', description: '', price: '', stock: '', imageUrl: '' };

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  // Product form
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Product filters
  const [productSearch, setProductSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  // Order filters & expanded rows
  const [statusFilter, setStatusFilter] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadProducts = () => {
    setLoading(true);
    adminGetProducts().then((r) => setProducts(r.data)).finally(() => setLoading(false));
  };
  const loadOrders = () => {
    setLoading(true);
    adminGetOrders().then((r) => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'products') loadProducts(); else loadOrders();
  }, [tab]);

  const setField = (f: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.price || !form.stock) {
      setFormError('Заполните все обязательные поля');
      return;
    }
    if (Number(form.price) < 0 || Number(form.stock) < 0) {
      setFormError('Цена и количество не могут быть отрицательными');
      return;
    }
    setFormError('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl.trim() || undefined,
    };
    try {
      if (editId) {
        await updateProduct(editId, payload);
        showToast('Товар обновлён');
      } else {
        await createProduct(payload);
        showToast('Товар добавлен');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      loadProducts();
    } catch (e: any) {
      setFormError(e.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      imageUrl: p.imageUrl || '',
    });
    setEditId(p.id);
    setFormError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (p: Product) => {
    const action = p.active ? 'Скрыть товар?' : 'Восстановить товар?';
    if (!confirm(action)) return;
    await updateProduct(p.id, { active: !p.active });
    showToast(p.active ? 'Товар скрыт' : 'Товар восстановлен');
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить товар безвозвратно?')) return;
    await deleteProduct(id);
    showToast('Товар удалён');
    loadProducts();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setFormError('');
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    showToast('Статус заказа обновлён');
    loadOrders();
  };

  const handleExport = async () => {
    const resp = await exportOrdersCsv();
    const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchHidden = showHidden ? true : p.active;
    return matchSearch && matchHidden;
  });

  const filteredOrders = orders.filter((o) => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchPhone = !searchPhone || o.phone.includes(searchPhone) || o.name.toLowerCase().includes(searchPhone.toLowerCase());
    const matchFrom = !dateFrom || new Date(o.createdAt) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(o.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchStatus && matchPhone && matchFrom && matchTo;
  });

  const activeCount = products.filter((p) => p.active).length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <main className="page">
      <div className="container">
        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ position: 'fixed', top: 70, right: 16, zIndex: 200, minWidth: 240, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
            ✓ {toast}
          </div>
        )}

        <h1 className="page-title">Администрирование</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('products')}
          >
            Товары
            <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 10, padding: '0 7px', marginLeft: 4, fontSize: '.8rem' }}>
              {activeCount}
            </span>
          </button>
          <button
            className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('orders')}
          >
            Заказы
            {pendingOrders > 0 && (
              <span style={{ background: '#dc3545', color: '#fff', borderRadius: 10, padding: '0 7px', marginLeft: 4, fontSize: '.8rem' }}>
                {pendingOrders}
              </span>
            )}
          </button>
        </div>

        {/* ───────── ТОВАРЫ ───────── */}
        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => { handleCancelForm(); setShowForm(true); }}>
                + Добавить товар
              </button>
              <input
                className="form-input"
                style={{ width: 220, margin: 0 }}
                placeholder="Поиск по названию..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.9rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                Показать скрытые
              </label>
              {(productSearch || showHidden) && (
                <button className="btn btn-outline btn-sm" onClick={() => { setProductSearch(''); setShowHidden(false); }}>
                  Сбросить
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: 'var(--text-muted)' }}>
                {filteredProducts.length} из {products.length}
              </span>
            </div>

            {/* Форма добавления/редактирования */}
            {showForm && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 20 }}>{editId ? 'Редактировать товар' : 'Новый товар'}</h3>
                {formError && <div className="alert alert-error">{formError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Название *</label>
                    <input className="form-input" placeholder="Мыло с лавандой" value={form.name} onChange={setField('name')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Цена (₽) *</label>
                    <input className="form-input" type="number" min="0" step="1" placeholder="350" value={form.price} onChange={setField('price')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Количество на складе *</label>
                    <input className="form-input" type="number" min="0" step="1" placeholder="50" value={form.stock} onChange={setField('stock')} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Описание * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(минимум 10 символов)</span></label>
                    <textarea className="form-input" rows={3} placeholder="Натуральное мыло ручной работы..." value={form.description} onChange={setField('description')} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Изображение (URL)</label>
                    <input className="form-input" type="url" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={setField('imageUrl')} />
                    {form.imageUrl && (
                      <img
                        src={form.imageUrl}
                        alt="preview"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        style={{ marginTop: 8, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={handleSave}>
                    {editId ? 'Сохранить изменения' : 'Добавить товар'}
                  </button>
                  <button className="btn btn-outline" onClick={handleCancelForm}>Отмена</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="spinner">Загрузка...</div>
            ) : products.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📦</div>
                <div className="empty-title">Товаров нет</div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
                  Добавить первый товар
                </button>
              </div>
            ) : (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Фото</th>
                      <th>Название</th>
                      <th>Цена</th>
                      <th>Остаток</th>
                      <th>Статус</th>
                      <th style={{ minWidth: 180 }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                        <td>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                          ) : (
                            <div style={{ width: 48, height: 48, background: 'var(--bg)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🧼</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                            {p.description}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{Number(p.price).toLocaleString('ru')} ₽</td>
                        <td>
                          <span style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 5 ? '#f59f00' : 'inherit' }}>
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${p.active ? 'status-DELIVERED' : 'status-CANCELLED'}`}>
                            {p.active ? 'Активен' : 'Скрыт'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}>
                              ✏️ Изменить
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleToggleActive(p)}
                              style={{ color: p.active ? '#856404' : '#2b8a3e' }}
                            >
                              {p.active ? '🙈 Скрыть' : '👁 Показать'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ───────── ЗАКАЗЫ ───────── */}
        {tab === 'orders' && (
          <>
            {/* Панель фильтров и экспорта */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ width: 200, margin: 0 }}
                placeholder="Поиск по имени / телефону"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <select
                className="form-input"
                style={{ width: 170, margin: 0 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Все статусы</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_RU[s]}</option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>с</span>
                <input
                  className="form-input"
                  style={{ width: 140, margin: 0 }}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>по</span>
                <input
                  className="form-input"
                  style={{ width: 140, margin: 0 }}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {(statusFilter || searchPhone || dateFrom || dateTo) && (
                <button className="btn btn-outline btn-sm" onClick={() => { setStatusFilter(''); setSearchPhone(''); setDateFrom(''); setDateTo(''); }}>
                  Сбросить
                </button>
              )}
              <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filteredOrders.length} из {orders.length}
              </span>
              <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={handleExport}>
                ⬇ Экспорт CSV
              </button>
            </div>

            {loading ? (
              <div className="spinner">Загрузка...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <div className="empty-title">{orders.length === 0 ? 'Заказов пока нет' : 'Ничего не найдено'}</div>
              </div>
            ) : (
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <>
                        <tr key={o.id} style={{ background: expandedOrder === o.id ? 'var(--bg)' : undefined }}>
                          <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                            #{o.id.slice(0, 8)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '.85rem' }}>
                            {new Date(o.createdAt).toLocaleDateString('ru')}<br />
                            <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>
                              {new Date(o.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{o.name}</div>
                            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{o.phone}</div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {Number(o.total).toLocaleString('ru')} ₽
                          </td>
                          <td>
                            <span className={`status-badge status-${o.status}`}>
                              {STATUS_RU[o.status]}
                            </span>
                          </td>
                          <td>
                            {o.payment ? (
                              <span className={`status-badge status-${o.payment.status}`}>
                                {PAYMENT_RU[o.payment.status] || o.payment.status}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>—</span>}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '4px 8px', fontSize: '.85rem', minWidth: 140 }}
                              value={o.status}
                              onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_RU[s]}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                            >
                              {expandedOrder === o.id ? '▲' : '▼ Состав'}
                            </button>
                          </td>
                        </tr>

                        {/* Развёрнутая строка с деталями заказа */}
                        {expandedOrder === o.id && (
                          <tr key={`${o.id}-detail`}>
                            <td colSpan={8} style={{ background: 'var(--bg)', padding: 0 }}>
                              <div style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                  <div>
                                    <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Состав заказа</div>
                                    {o.items.map((item) => (
                                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.9rem' }}>
                                        <span>{item.product?.name || 'Товар'} × {item.quantity}</span>
                                        <span style={{ fontWeight: 600 }}>
                                          {(Number(item.price) * item.quantity).toLocaleString('ru')} ₽
                                        </span>
                                      </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontWeight: 700 }}>
                                      <span>Итого</span>
                                      <span>{Number(o.total).toLocaleString('ru')} ₽</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Доставка</div>
                                    <div style={{ fontSize: '.9rem', lineHeight: 1.8 }}>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Получатель:</span> {o.name}</div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Телефон:</span> {o.phone}</div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Адрес:</span> {o.address}</div>
                                      {o.comment && <div><span style={{ color: 'var(--text-muted)' }}>Комментарий:</span> {o.comment}</div>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
