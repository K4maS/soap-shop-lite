import { useEffect, useState } from 'react';
import { getProducts } from '../api';
import type { Product } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts()
      .then((r) => setProducts(r.data))
      .catch(() => setError('Не удалось загрузить товары'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Каталог товаров</h1>

        {loading && <div className="spinner">Загрузка...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && products.length === 0 && !error && (
          <div className="empty">
            <div className="empty-icon">🧼</div>
            <div className="empty-title">Товары скоро появятся</div>
          </div>
        )}

        <div className="products-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  );
}
