import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const formatPhone = (v: string) => {
    let digits = v.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);
    const p = '+' + digits;
    return p;
  };

  const handleSendOtp = async () => {
    const formatted = formatPhone(phone);
    if (!/^\+7\d{10}$/.test(formatted)) {
      setError('Введите корректный номер телефона');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(formatted);
      setPhone(formatted);
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await verifyOtp(phone, code);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 400 }}>
        <h1 className="page-title">Вход в аккаунт</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 'phone' ? (
          <>
            <div className="form-group">
              <label className="form-label">Номер телефона</label>
              <input
                className="form-input"
                type="tel"
                placeholder="+7 (999) 999-99-99"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleSendOtp} disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
            <p style={{ marginTop: 16, fontSize: '.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Продолжая, вы соглашаетесь с{' '}
              <Link to="/terms" style={{ color: 'var(--primary)' }}>условиями</Link> и{' '}
              <Link to="/privacy" style={{ color: 'var(--primary)' }}>политикой конфиденциальности</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>
              Код отправлен на <strong>{phone}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Код из SMS</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                autoFocus
              />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleVerify} disabled={loading}>
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              {countdown > 0 ? (
                <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                  Повторная отправка через {countdown} сек.
                </span>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                >
                  Изменить номер / отправить снова
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
