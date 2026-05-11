import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../api';
import type { UserProfile } from '../api';
import { useAuthStore } from '../store/authStore';
import { validateAddress } from './CheckoutPage';

const NAME_RE = /^[a-zA-Zа-яА-ЯёЁ\s'-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  firstName?: string;
  lastName?: string;
  email?: string;
  defaultAddress?: string;
}

function validate(form: Partial<UserProfile>): Errors {
  const e: Errors = {};
  if (form.firstName !== undefined && form.firstName !== '') {
    if (form.firstName.length < 2) e.firstName = 'Минимум 2 символа';
    else if (!NAME_RE.test(form.firstName)) e.firstName = 'Только буквы';
  }
  if (form.lastName !== undefined && form.lastName !== '') {
    if (form.lastName.length < 2) e.lastName = 'Минимум 2 символа';
    else if (!NAME_RE.test(form.lastName)) e.lastName = 'Только буквы';
  }
  if (form.email && !EMAIL_RE.test(form.email)) {
    e.email = 'Некорректный email';
  }
  if (form.defaultAddress && form.defaultAddress !== '') {
    const addrErr = validateAddress(form.defaultAddress);
    if (addrErr) e.defaultAddress = addrErr;
  }
  return e;
}

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', defaultAddress: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    getProfile()
      .then((r) => {
        setProfile(r.data);
        setForm({
          firstName: r.data.firstName || '',
          lastName: r.data.lastName || '',
          email: r.data.email || '',
          defaultAddress: r.data.defaultAddress || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    // Сброс ошибки поля при вводе
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(false);
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError('');
    try {
      const payload: Partial<UserProfile> = {};
      if (form.firstName.trim()) payload.firstName = form.firstName.trim();
      if (form.lastName.trim()) payload.lastName = form.lastName.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.defaultAddress.trim()) payload.defaultAddress = form.defaultAddress.trim();

      const { data } = await updateProfile(payload);
      setProfile(data);
      // Обновить user в store (если имя изменилось)
      if (user && token) setAuth({ ...user }, token);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setServerError(e.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner">Загрузка...</div>;

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <h1 className="page-title">Мой профиль</h1>

        {/* Карточка пользователя */}
        <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, flexShrink: 0,
          }}>
            {fullName ? fullName[0].toUpperCase() : profile?.phone[3]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              {fullName || 'Имя не указано'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>{profile?.phone}</div>
            {profile?.email && <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{profile.email}</div>}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`status-badge ${profile?.role === 'ADMIN' ? 'status-CONFIRMED' : 'status-DELIVERED'}`}>
              {profile?.role === 'ADMIN' ? 'Администратор' : 'Покупатель'}
            </span>
          </div>
        </div>

        {/* Форма */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Личные данные</h3>

          {serverError && <div className="alert alert-error">{serverError}</div>}
          {success && <div className="alert alert-success">✓ Данные сохранены</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Имя</label>
              <input
                className="form-input"
                placeholder="Иван"
                value={form.firstName}
                onChange={set('firstName')}
                style={{ borderColor: errors.firstName ? 'var(--danger)' : undefined }}
              />
              {errors.firstName && <span style={{ fontSize: '.8rem', color: 'var(--danger)' }}>{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Фамилия</label>
              <input
                className="form-input"
                placeholder="Иванов"
                value={form.lastName}
                onChange={set('lastName')}
                style={{ borderColor: errors.lastName ? 'var(--danger)' : undefined }}
              />
              {errors.lastName && <span style={{ fontSize: '.8rem', color: 'var(--danger)' }}>{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Телефон</label>
            <input
              className="form-input"
              value={profile?.phone || ''}
              disabled
              style={{ background: 'var(--bg)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
            />
            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
              Телефон изменить нельзя — он используется для входа
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(необязательно)</span></label>
            <input
              className="form-input"
              type="email"
              placeholder="ivan@example.com"
              value={form.email}
              onChange={set('email')}
              style={{ borderColor: errors.email ? 'var(--danger)' : undefined }}
            />
            {errors.email && <span style={{ fontSize: '.8rem', color: 'var(--danger)' }}>{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Адрес доставки по умолчанию{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(необязательно)</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="101000, г. Москва, ул. Примерная, д. 1, кв. 1"
              value={form.defaultAddress}
              onChange={set('defaultAddress')}
              style={{ borderColor: errors.defaultAddress ? 'var(--danger)' : undefined }}
            />
            {errors.defaultAddress
              ? <span style={{ fontSize: '.8rem', color: 'var(--danger)' }}>{errors.defaultAddress}</span>
              : form.defaultAddress.length > 0 && (
                <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                  Формат: <strong>индекс</strong>, город, улица, дом, квартира — будет подставляться при оформлении заказа
                </span>
              )
            }
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        {/* Статистика */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)' }}>
              {/* Заглушка — можно добавить кол-во заказов */}—
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Заказов</div>
          </div>
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Аккаунт с{' '}
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
