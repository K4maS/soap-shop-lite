import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct } from '../api';
import type { Product } from '../api';
import { useCartStore } from '../store/cartStore';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((r) => setProduct(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return <div className="spinner">Загрузка...</div>;
  if (!product) return (
    <div className="page"><div className="container">
      <div className="alert alert-error">Товар не найден</div>
      <Link to="/" className="btn btn-outline">← Назад</Link>
    </div></div>
  );

  return (
    <main className="page">
      <div className="container">
        <Link to="/" className="btn btn-outline btn-sm" style={{ marginBottom: 24 }}>← Назад</Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
          <div>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: '100%', borderRadius: 8, maxHeight: 400, objectFit: 'cover' }}
              />
            ) : (
              <div className="product-card-img-placeholder" style={{ height: 400, borderRadius: 8 }}>🧼</div>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>{product.name}</h1>
            <div className="product-price" style={{ fontSize: '1.6rem', marginBottom: 16 }}>
              {Number(product.price).toLocaleString('ru')} ₽
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
              {product.description}
            </p>

            {product.stock > 0 ? (
              <>
                <div className="qty-control" style={{ marginBottom: 16 }}>
                  <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
                  <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                    Доступно: {product.stock}
                  </span>
                </div>
                <button className="btn btn-primary btn-full" onClick={handleAdd}>
                  {added ? '✓ Добавлено в корзину' : 'Добавить в корзину'}
                </button>
              </>
            ) : (
              <div className="alert alert-error">Нет в наличии</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
