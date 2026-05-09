'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="landing-container">
      <header className="header glass">
        <div className="container header-content">
          <div className="logo-section">
            <Image src="/logo.png" alt="TecCosta Logo" width={150} height={50} style={{ objectFit: 'contain' }} />
          </div>
          <nav className="nav">
            <a href="#services">Serviços</a>
            <a href="#about">Sobre</a>
            <Link href="/login" className="login-nav-btn">Área do Cliente</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg">
            <Image 
              src="/login-bg.png" 
              alt="TecCosta Hero" 
              fill 
              style={{ objectFit: 'cover' }}
              priority
            />
            <div className="hero-overlay"></div>
          </div>
          
          <div className="container hero-content animate-fade-in">
            <h1>Soluções Inteligentes para seu Condomínio</h1>
            <p>Manutenção predial, segurança eletrônica e automação com a excelência que você merece.</p>
            <div className="hero-actions">
              <Link href="/login" className="btn btn-primary">Registrar Solicitação</Link>
              <a href="#services" className="btn btn-secondary">Nossos Serviços</a>
            </div>
          </div>
        </section>

        <section id="services" className="services">
          <div className="container">
            <h2 className="section-title">O que fazemos</h2>
            <div className="services-grid">
              <div className="service-card glass">
                <div className="service-icon">🏗️</div>
                <h3>Manutenção Predial</h3>
                <p>Reparos hidráulicos, elétricos e estruturais com técnicos especializados.</p>
              </div>
              <div className="service-card glass">
                <div className="service-icon">📹</div>
                <h3>Câmeras de Segurança</h3>
                <p>Monitoramento 24h com sistemas de alta definição e acesso remoto.</p>
              </div>
              <div className="service-card glass">
                <div className="service-icon">🚪</div>
                <h3>Automação de Portões</h3>
                <p>Agilidade e segurança no acesso ao seu patrimônio.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <p>&copy; 2026 TecCosta Soluções Integradas. Todos os direitos reservados.</p>
          <div className="footer-links">
            <span>(12) 99765-4321</span>
            <span>TEC-COSTA.COM.BR</span>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 80px;
          display: flex;
          align-items: center;
          z-index: 1000;
        }

        .header-content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav {
          display: flex;
          gap: 30px;
          align-items: center;
        }

        .nav a {
          font-weight: 600;
          color: var(--primary-color);
          transition: color 0.2s;
        }

        .nav a:hover {
          color: var(--secondary-color);
        }

        .login-nav-btn {
          padding: 10px 20px;
          background: var(--primary-color);
          color: white !important;
          border-radius: 50px;
          transition: all 0.3s;
        }

        .login-nav-btn:hover {
          background: var(--secondary-color);
          transform: translateY(-2px);
        }

        .hero {
          position: relative;
          height: 90vh;
          display: flex;
          align-items: center;
          color: white;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, rgba(0, 30, 60, 0.95), rgba(0, 51, 102, 0.6));
        }

        .hero h1 {
          font-size: 3.5rem;
          line-height: 1.1;
          margin-bottom: 20px;
          font-weight: 800;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .hero p {
          font-size: 1.25rem;
          margin-bottom: 40px;
          opacity: 0.9;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
        }

        .btn {
          padding: 15px 30px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .btn-primary {
          background: var(--secondary-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--secondary-light);
          transform: scale(1.05);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .services {
          padding: 100px 0;
          background: #f1f5f9;
        }

        .section-title {
          text-align: center;
          font-size: 2.5rem;
          color: var(--primary-color);
          margin-bottom: 60px;
          font-weight: 800;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .service-card {
          padding: 40px;
          text-align: center;
          border-radius: var(--border-radius);
          transition: all 0.3s;
        }

        .service-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--box-shadow-hover);
        }

        .service-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }

        .service-card h3 {
          color: var(--primary-color);
          margin-bottom: 15px;
          font-size: 1.5rem;
        }

        .service-card p {
          color: var(--text-secondary);
        }

        .footer {
          padding: 40px 0;
          background: var(--primary-color);
          color: white;
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          opacity: 0.8;
        }

        .footer-links {
          display: flex;
          gap: 30px;
        }
      `}</style>
    </div>
  );
}
