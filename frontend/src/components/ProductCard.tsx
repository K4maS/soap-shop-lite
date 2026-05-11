import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../api';

interface Props { product: Product; }

export default function ProductCard({ product }: Props) {
  const add = useCartStore((s) => s.add);

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="product-card-img" />
        ) : (
          <div className="product-card-img-placeholder">🧼</div>
        )}
      </Link>
      <div className="product-card-body">
        <div className="product-card-name">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </div>
        <div className="product-card-desc">{product.description}</div>
        <div className="product-card-footer">
          <span className="product-price">{Number(product.price).toLocaleString('ru')} ₽</span>
          {product.stock > 0 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => add(product)}
            >
              В корзину
            </button>
          ) : (
            <span className="product-stock">Нет в наличии</span>
          )}
        </div>
      </div>
    </div>
  );
}
