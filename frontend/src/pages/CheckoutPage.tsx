import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createOrder, createPayment, getProfile } from '../api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const NAME_RE = /^[a-zA-Zа-яА-ЯёЁ\s'-]+$/;
const POSTAL_RE = /\b\d{6}\b/;

export function validateAddress(value: string): string | undefined {
  if (!value.trim()) return 'Укажите адрес доставки';
  if (value.trim().length < 10) return 'Адрес слишком короткий';
  if (!POSTAL_RE.test(value)) return 'Укажите почтовый индекс (6 цифр) в начале адреса';
  return undefined;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
}

function validateForm(form: { name: string; phone: string; address: string }): FormErrors {
  const e: FormErrors = {};

  if (!form.name.trim()) {
    e.name = 'Укажите получателя';
  } else if (form.name.trim().length < 2) {
    e.name = 'Минимум 2 символа';
  } else if (!NAME_RE.test(form.name.trim())) {
    e.name = 'Только буквы, пробелы и дефис';
  }

  if (!form.phone.trim()) {
    e.phone = 'Укажите телефон';
  } else if (!/^\+7\d{10}$/.test(form.phone.trim())) {
    e.phone = 'Формат: +7XXXXXXXXXX';
  }

  const addrErr = validateAddress(form.address);
  if (addrErr) e.address = addrErr;

  return e;
}

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [serverError, setServerError] = useState('');

  // Автозаполнение из профиля
  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        setForm((f) => ({
          ...f,
          name: [data.firstName, data.lastName].filter(Boolean).join(' ') || f.name,
          phone: f.phone || data.phone,
          address: data.defaultAddress || f.address,
        }));
        setProfileLoaded(!!data.firstName || !!data.defaultAddress);
      })
      .catch(() => {});
  }, []);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const blur = (field: string) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async () => {
    // Пометить все поля как touched
    setTouched({ name: true, phone: true, address: true });
    const errs = validateForm(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (items.length === 0) {
      setServerError('Корзина пуста');
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const order = await createOrder({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        address: form.address.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        comment: form.comment.trim() || undefined,
      });

      clear();

      try {
        const payment = await createPayment(order.data.id);
        if (payment.data.confirmUrl) {
          window.location.href = payment.data.confirmUrl;
          return;
        }
      } catch {
        // оплата не критична для создания заказа
      }

      navigate(`/orders/${order.data.id}`);
    } catch (e: any) {
      setServerError(
        Array.isArray(e.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e.response?.data?.message || 'Ошибка оформления заказа',
      );
    } finally {
      setLoading(false);
    }
  };

  const field = (
    name: keyof FormErrors,
    label: string,
    input: React.ReactNode,
  ) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {input}
      {touched[name] && errors[name] && (
        <span style={{ fontSize: '.8rem', color: 'var(--danger)', marginTop: 2 }}>
          {errors[name]}
        </span>
      )}
    </div>
  );

  if (items.length === 0) {
    return (
      <main className="page">
        <div className="container">
          <div className="alert alert-info">
            Корзина пуста. <Link to="/">Вернуться в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="page-title">Оформление заказа</h1>

        {profileLoaded && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            Данные подставлены из вашего профиля.{' '}
            <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 500 }}>
              Редактировать профиль
            </Link>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>Данные доставки</h3>

            {serverError && <div className="alert alert-error">{serverError}</div>}

            {field('name', 'Получатель *',
              <input
                className="form-input"
                placeholder="Иван Иванов"
                value={form.name}
                onChange={set('name')}
                onBlur={blur('name')}
                style={{ borderColor: touched.name && errors.name ? 'var(--danger)' : undefined }}
              />,
            )}

            {field('phone', 'Телефон получателя *',
              <input
                className="form-input"
                type="tel"
                placeholder="+79000000000"
                value={form.phone}
                onChange={set('phone')}
                onBlur={blur('phone')}
                style={{ borderColor: touched.phone && errors.phone ? 'var(--danger)' : undefined }}
              />,
            )}

            {field('address', 'Адрес доставки *',
              <input
                className="form-input"
                placeholder="101000, г. Москва, ул. Примерная, д. 1, кв. 1"
                value={form.address}
                onChange={set('address')}
                onBlur={blur('address')}
                style={{ borderColor: touched.address && errors.address ? 'var(--danger)' : undefined }}
              />,
            )}

            <div className="form-group">
              <label className="form-label">
                Комментарий{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(необязательно)</span>
              </label>
              <textarea
                className="form-input"
                placeholder="Удобное время, подъезд, код домофона..."
                value={form.comment}
                onChange={set('comment')}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Оформление...' : 'Оформить и перейти к оплате'}
            </button>
          </div>

          {/* Итог */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Ваш заказ</h3>
            {items.map((item) => (
              <div
                key={item.product.id}
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.9rem' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {item.product.name} × {item.quantity}
                </span>
                <span>{(Number(item.product.price) * item.quantity).toLocaleString('ru')} ₽</span>
              </div>
            ))}
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12,
              display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem',
            }}>
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
