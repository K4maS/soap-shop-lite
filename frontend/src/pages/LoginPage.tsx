import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../api';
import { useAuthStore } from '../store/authStore';

// Форматирует 10 цифр (без +7) в читаемый вид: (999) 999-99-99
function formatMask(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  let out = '(' + d.slice(0, 3);
  if (d.length > 3) out += ') ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}

// Извлекает только цифры, убирает первую 7 или 8
function extractDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('7') || digits.startsWith('8')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const inputRef = useRef<HTMLInputElement>(null);

  // Храним только 10 цифр (без +7)
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const displayValue = digits.length > 0 ? '+7 ' + formatMask(digits) : '';
  const isValid = digits.length === 10;
  const showError = touched && !isValid && digits.length > 0;
  const fullPhone = `+7${digits}`;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Если стёрли всё — сбрасываем
    if (raw === '' || raw === '+7 ' || raw === '+7') {
      setDigits('');
      return;
    }
    const extracted = extractDigits(raw);
    setDigits(extracted);
  };

  // Запрет на ввод не-цифр, кроме разрешённых клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { handleSendOtp(); return; }
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  // Правильная вставка из буфера
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const extracted = extractDigits(pasted);
    setDigits(extracted);
  };

  const handleSendOtp = async () => {
    setTouched(true);
    if (!isValid) {
      setError('Введите корректный номер: +7 (XXX) XXX-XX-XX');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(fullPhone);
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
      setError('Введите 6-значный код из SMS');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await verifyOtp(fullPhone, code);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('phone');
    setCode('');
    setError('');
    setTouched(false);
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
                ref={inputRef}
                className="form-input"
                type="tel"
                inputMode="numeric"
                placeholder="+7 (___) ___-__-__"
                value={displayValue}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => setTouched(true)}
                style={{
                  borderColor: showError ? 'var(--danger)' : undefined,
                  letterSpacing: '0.04em',
                }}
                autoFocus
                autoComplete="tel"
              />
              {showError && (
                <span style={{ fontSize: '.8rem', color: 'var(--danger)', marginTop: 4 }}>
                  Введите 10 цифр после +7
                </span>
              )}
              {isValid && touched && (
                <span style={{ fontSize: '.8rem', color: '#2b8a3e', marginTop: 4 }}>
                  ✓ {fullPhone}
                </span>
              )}
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSendOtp}
              disabled={loading || (!isValid && touched)}
            >
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
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.9rem' }}>
                Код отправлен на <strong>{fullPhone}</strong>
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleReset}
                style={{ flexShrink: 0, marginLeft: 8 }}
              >
                Изменить
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Код из SMS</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => {
                  setError('');
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                style={{
                  fontSize: '1.4rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  borderColor: error ? 'var(--danger)' : undefined,
                }}
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              {countdown > 0 ? (
                <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                  Отправить снова через{' '}
                  <strong style={{ color: 'var(--text)' }}>{countdown}</strong> сек.
                </span>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={handleReset}>
                  Отправить код снова
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
