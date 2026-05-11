import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-links">
          <Link to="/about">О компании</Link>
          <Link to="/privacy">Политика конфиденциальности</Link>
          <Link to="/terms">Пользовательское соглашение</Link>
          <Link to="/offer">Оферта</Link>
        </div>
        <p>© {new Date().getFullYear()} Мыловарня. Все права защищены.</p>
      </div>
    </footer>
  );
}
