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
  const [isChamadosOpen, setIsChamadosOpen] = useState(false);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setSessionUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pathname && pathname.startsWith('/dashboard/chamados')) {
      setIsChamadosOpen(true);
    }
  }, [pathname]);

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
          {/* Início — visível para todos */}
          <Link 
            href="/dashboard"
            className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
          >
            <span className="icon">🏠</span>
            <span className="label">Início</span>
          </Link>
          
          {/* Clientes — apenas ADMINISTRADOR e TECCOSTA_GESTAO */}
          {sessionUser && (sessionUser.role === 'ADMINISTRADOR' || sessionUser.role === 'TECCOSTA_GESTAO') && (
            <Link 
              href="/dashboard/clientes"
              className={`nav-item ${pathname === '/dashboard/clientes' ? 'active' : ''}`}
            >
              <span className="icon">👥</span>
              <span className="label">Clientes</span>
            </Link>
          )}

          {/* Usuários — apenas ADMINISTRADOR e TECCOSTA_GESTAO */}
          {sessionUser && (sessionUser.role === 'ADMINISTRADOR' || sessionUser.role === 'TECCOSTA_GESTAO') && (
            <Link 
              href="/dashboard/usuarios"
              className={`nav-item ${pathname === '/dashboard/usuarios' ? 'active' : ''}`}
            >
              <span className="icon">👤</span>
              <span className="label">Usuários</span>
            </Link>
          )}

          {/* Grupo de Chamados — visível para todos, mas submenus filtrados por role */}
          {sessionUser && (() => {
            const role = sessionUser.role;
            const canSolicitacao = role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO' || role === 'CONDOMINIO_EMPRESA' || role === 'ADMINISTRADORA_CONDOMINIO';
            const canClassificacao = role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO';
            const canAgendamento = role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO';
            const canAcompanhamento = role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO' || role === 'TECNICO';
            const hasAnyChamado = canSolicitacao || canClassificacao || canAgendamento || canAcompanhamento;
            if (!hasAnyChamado) return null;
            return (
              <div className="nav-group">
                <button 
                  onClick={() => setIsChamadosOpen(!isChamadosOpen)}
                  className={`group-header-btn ${pathname.startsWith('/dashboard/chamados') ? 'group-active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="icon">📋</span>
                    <span className="label">Chamados</span>
                  </div>
                  <span className={`arrow ${isChamadosOpen ? 'arrow-open' : ''}`}>▼</span>
                </button>

                {isChamadosOpen && (
                  <div className="nav-submenu">
                    {canSolicitacao && (
                      <Link 
                        href="/dashboard/chamados/solicitacao"
                        className={`submenu-item ${pathname === '/dashboard/chamados/solicitacao' ? 'active' : ''}`}
                      >
                        <span className="icon">📝</span>
                        <span className="label">Solicitação</span>
                      </Link>
                    )}
                    {canClassificacao && (
                      <Link 
                        href="/dashboard/chamados/classificacao"
                        className={`submenu-item ${pathname === '/dashboard/chamados/classificacao' ? 'active' : ''}`}
                      >
                        <span className="icon">🗂️</span>
                        <span className="label">Classificação</span>
                      </Link>
                    )}
                    {canAgendamento && (
                      <Link 
                        href="/dashboard/chamados/acompanhamento"
                        className={`submenu-item ${pathname === '/dashboard/chamados/acompanhamento' ? 'active' : ''}`}
                      >
                        <span className="icon">📊</span>
                        <span className="label">Agendamento</span>
                      </Link>
                    )}
                    {canAcompanhamento && (
                      <Link 
                        href="/dashboard/chamados/acompanhamento-chamado"
                        className={`submenu-item ${pathname === '/dashboard/chamados/acompanhamento-chamado' ? 'active' : ''}`}
                      >
                        <span className="icon">📈</span>
                        <span className="label">Acompanhamento</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
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

        /* Submenu and groups */
        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .group-header-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s;
          font-weight: 500;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }

        .group-header-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .group-active {
          color: white;
          font-weight: 600;
        }

        .arrow {
          font-size: 0.7rem;
          transition: transform 0.2s ease;
          color: rgba(255, 255, 255, 0.5);
        }

        .arrow-open {
          transform: rotate(180deg);
        }

        .nav-submenu {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 20px;
          margin-top: 2px;
          border-left: 1px dashed rgba(255, 255, 255, 0.2);
          margin-left: 24px;
          animation: slideDownSubmenu 0.25s ease-out forwards;
        }

        .submenu-item {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.65);
          transition: all 0.2s;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .submenu-item:hover {
          background-color: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .submenu-item.active {
          background-color: var(--secondary-color);
          color: white;
          font-weight: 600;
        }

        .submenu-item .icon {
          margin-right: 10px;
          font-size: 1.1rem;
        }

        @keyframes slideDownSubmenu {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
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
