import { useEffect, useState, useMemo } from 'react';
import { getProducts } from '../api';
import type { Product } from '../api';
import ProductCard from '../components/ProductCard';

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    getProducts()
      .then((r) => setProducts(r.data))
      .catch(() => setError('Не удалось загрузить товары'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }

    if (maxPrice && Number(maxPrice) > 0) {
      list = list.filter((p) => Number(p.price) <= Number(maxPrice));
    }

    switch (sort) {
      case 'price_asc':  list.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price_desc': list.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'name':       list.sort((a, b) => a.name.localeCompare(b.name, 'ru')); break;
    }

    return list;
  }, [products, search, sort, maxPrice]);

  const hasFilters = search || maxPrice || sort !== 'default';

  const resetFilters = () => {
    setSearch('');
    setMaxPrice('');
    setSort('default');
  };

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Каталог товаров</h1>

        {/* Панель поиска и фильтров */}
        {!loading && !error && products.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
          }}>
            <input
              className="form-input"
              style={{ flex: '1 1 220px', margin: 0 }}
              placeholder="🔍 Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="form-input"
              style={{ width: 180, margin: 0 }}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="default">По умолчанию</option>
              <option value="price_asc">Цена: дешевле</option>
              <option value="price_desc">Цена: дороже</option>
              <option value="name">По названию</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>До</span>
              <input
                className="form-input"
                style={{ width: 110, margin: 0 }}
                type="number"
                min="0"
                placeholder="цена ₽"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            {hasFilters && (
              <button className="btn btn-outline btn-sm" onClick={resetFilters}>
                Сбросить
              </button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} из {products.length}
            </span>
          </div>
        )}

        {loading && <div className="spinner">Загрузка...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">{products.length === 0 ? '🧼' : '🔍'}</div>
            <div className="empty-title">
              {products.length === 0 ? 'Товары скоро появятся' : 'Ничего не найдено'}
            </div>
            {hasFilters && (
              <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={resetFilters}>
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        <div className="products-grid">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  );
}
