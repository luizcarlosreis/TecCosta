'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logoutAction } from '@/app/actions/auth';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Dados do usuário logado lidos via API (cookie httpOnly não é acessível no browser)
  const [sessionUser, setSessionUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setSessionUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Gera as iniciais a partir do nome completo
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Rótulo amigável do role
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMINISTRADOR': return 'Administrador';
      case 'TECCOSTA_GESTAO': return 'TecCosta Gestão';
      case 'CONDOMINIO_EMPRESA': return 'Gestor';
      case 'TECNICO': return 'Técnico';
      case 'ADMINISTRADORA_CONDOMINIO': return 'Administradora';
      case 'CLIENTE': return 'Cliente';
      default: return role;
    }
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  const menuItems = [
    { name: 'Início', href: '/dashboard', icon: '🏠' },
    { name: 'Clientes', href: '/dashboard/clientes', icon: '👥' },
    { name: 'Usuários', href: '/dashboard/usuarios', icon: '👤' },
    { name: 'Solicitação de Chamado', href: '/dashboard/chamados/solicitacao', icon: '📝' },
    { name: 'Classificação do Chamado', href: '/dashboard/chamados/classificacao', icon: '🗂️' },
    { name: 'Agendamento do chamado', href: '/dashboard/chamados/acompanhamento', icon: '📊' },
    { name: 'Acompanhamento de chamado', href: '/dashboard/chamados/acompanhamento-chamado', icon: '📈' },
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Image 
            src="/logo.png" 
            alt="TecCosta Logo" 
            width={320} 
            height={120} 
            style={{ width: '100%', height: 'auto' }} 
            priority 
          />
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="icon">🚪</span>
            <span className="label">Sair</span>
          </button>
          <div className="app-version">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header glass">
          <div className="header-user">
            <div className="user-info">
              <p className="user-name">{sessionUser ? sessionUser.name : '...'}</p>
              <p className="user-role">{sessionUser ? getRoleLabel(sessionUser.role) : ''}</p>
            </div>
            <div className="user-avatar">
              {sessionUser ? getInitials(sessionUser.name) : '??'}
            </div>
          </div>
        </header>
        
        <div className="dashboard-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background-color: #f8fafc;
        }

        .sidebar {
          width: 350px;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          flex-direction: column;
          padding: 20px 0;
          transition: all 0.3s;
          position: relative;
          z-index: 200;
        }

        .sidebar-header {
          padding: 10px 10px 25px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 25px;
          display: flex;
          justify-content: center;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s;
          font-weight: 500;
        }

        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .nav-item.active {
          background-color: var(--secondary-color);
          color: white;
        }

        .nav-item .icon {
          margin-right: 12px;
          font-size: 1.2rem;
        }

        .sidebar-footer {
          padding: 20px 12px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .app-version {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.35);
          text-align: center;
          margin-top: 12px;
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s;
          width: 100%;
          text-align: left;
        }

        .logout-btn:hover {
          color: #ff6b6b;
        }

        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dashboard-header {
          height: 70px;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          border-bottom: 1px solid #e2e8f0;
          background: white;
          position: relative;
          z-index: 90;
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .user-info {
          text-align: right;
        }

        .user-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .dashboard-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
          position: relative;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}
