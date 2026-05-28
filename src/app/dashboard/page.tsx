'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RecentRequest {
  id: string;
  title: string;
  client: string;
  status: string;
  statusLabel: string;
}

export default function DashboardPage() {
  const [sessionUser, setSessionUser] = useState<{ id: string; name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setSessionUser(data.user);
      })
      .catch(() => {});
  }, []);

  const getGreeting = () => {
    if (!sessionUser) return 'Olá, ...';
    return `Olá, ${sessionUser.name}`;
  };

  const getSubtitle = () => {
    if (!sessionUser) return 'Carregando portal...';
    switch (sessionUser.role) {
      case 'ADMINISTRADOR':
        return 'Aqui está um resumo de todas as atividades do portal administrativo.';
      case 'TECCOSTA_GESTAO':
        return 'Gerencie clientes, técnicos e acompanhe o fluxo de chamados da TecCosta.';
      case 'CONDOMINIO_EMPRESA':
      case 'ADMINISTRADORA_CONDOMINIO':
        return 'Acompanhe suas solicitações abertas e crie novos chamados para seus condomínios.';
      case 'TECNICO':
        return 'Acesse seus chamados de manutenção e gerencie seus agendamentos.';
      default:
        return 'Bem-vindo ao portal da TecCosta.';
    }
  };

  // Stats dynamically configured depending on the user's role
  const getStats = () => {
    if (!sessionUser) return [];
    const role = sessionUser.role;
    if (role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO') {
      return [
        { label: 'Chamados em Aberto', value: '8', color: 'var(--secondary-color)' },
        { label: 'Em Andamento', value: '4', color: 'var(--primary-color)' },
        { label: 'Concluídos este Mês', value: '32', color: 'var(--success-color)' },
        { label: 'Clientes Ativos', value: '18', color: 'var(--primary-color)' },
      ];
    } else if (role === 'TECNICO') {
      return [
        { label: 'Chamados Atribuídos', value: '3', color: 'var(--secondary-color)' },
        { label: 'Em Andamento', value: '2', color: 'var(--primary-color)' },
        { label: 'Seus Concluídos (Mês)', value: '15', color: 'var(--success-color)' },
      ];
    } else {
      // Clients
      return [
        { label: 'Seus Chamados Abertos', value: '3', color: 'var(--secondary-color)' },
        { label: 'Em Andamento', value: '1', color: 'var(--primary-color)' },
        { label: 'Concluídos recentemente', value: '12', color: 'var(--success-color)' },
      ];
    }
  };

  const getRecentRequests = (): RecentRequest[] => {
    if (!sessionUser) return [];
    const role = sessionUser.role;
    if (role === 'TECNICO') {
      return [
        { id: '#0052', title: 'Manutenção Preventiva de Motores', client: 'Condomínio Spazio', status: 'progress', statusLabel: 'Em Andamento' },
        { id: '#0054', title: 'Ajuste de Câmera de Entrada', client: 'Residencial Plaza', status: 'pending', statusLabel: 'Pendente' },
      ];
    } else if (role === 'CONDOMINIO_EMPRESA' || role === 'ADMINISTRADORA_CONDOMINIO') {
      return [
        { id: '#0056', title: 'Verificação de Curto-Circuito', client: 'Condomínio Vista Alegre', status: 'pending', statusLabel: 'Pendente' },
        { id: '#0058', title: 'Substituição de Lâmpadas LED', client: 'Condomínio Vista Alegre', status: 'progress', statusLabel: 'Em Andamento' },
      ];
    } else {
      return [
        { id: '#0051', title: 'Reparo em Portão Automático', client: 'Residencial Aurora', status: 'pending', statusLabel: 'Pendente' },
        { id: '#0053', title: 'Instalação de Câmeras IP', client: 'Edifício Horizonte', status: 'progress', statusLabel: 'Em Andamento' },
        { id: '#0055', title: 'Troca de Sensores de Presença', client: 'Condomínio Solar', status: 'pending', statusLabel: 'Pendente' },
      ];
    }
  };

  const renderQuickActions = () => {
    if (!sessionUser) return null;
    const role = sessionUser.role;
    if (role === 'ADMINISTRADOR' || role === 'TECCOSTA_GESTAO') {
      return (
        <div className="actions-grid">
          <Link href="/dashboard/clientes" className="action-btn text-center">Novo Cliente</Link>
          <Link href="/dashboard/usuarios" className="action-btn text-center">Cadastrar Técnico</Link>
          <Link href="/dashboard/chamados/solicitacao" className="action-btn text-center">Nova Solicitação</Link>
          <Link href="/dashboard/chamados/classificacao" className="action-btn text-center">Classificar Chamados</Link>
        </div>
      );
    } else if (role === 'TECNICO') {
      return (
        <div className="actions-grid">
          <Link href="/dashboard/chamados/acompanhamento-chamado" className="action-btn text-center">Ver Meus Chamados</Link>
        </div>
      );
    } else {
      return (
        <div className="actions-grid">
          <Link href="/dashboard/chamados/solicitacao" className="action-btn text-center">Nova Solicitação</Link>
          <Link href="/dashboard/chamados/solicitacao" className="action-btn text-center">Minhas Solicitações</Link>
        </div>
      );
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="welcome-section">
        <h1>{getGreeting()}</h1>
        <p>{getSubtitle()}</p>
      </div>

      <div className="stats-grid">
        {getStats().map((stat, idx) => (
          <div key={idx} className="stat-card glass">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <section className="recent-requests glass">
          <div className="section-header">
            <h2>{sessionUser?.role === 'TECNICO' ? 'Seus Chamados Recentes' : 'Solicitações Recentes'}</h2>
            {sessionUser?.role === 'TECNICO' ? (
              <Link href="/dashboard/chamados/acompanhamento-chamado" className="view-all">Ver todos</Link>
            ) : (
              <Link href="/dashboard/chamados/solicitacao" className="view-all">Ver todas</Link>
            )}
          </div>
          
          <div className="request-list">
            {getRecentRequests().map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-id">{request.id}</div>
                <div className="request-info">
                  <p className="request-title">{request.title}</p>
                  <p className="request-client">{request.client}</p>
                </div>
                <div className={`request-status status-${request.status}`}>
                  {request.statusLabel}
                </div>
              </div>
            ))}
            {getRecentRequests().length === 0 && (
              <p className="text-muted text-center py-4">Nenhuma solicitação recente encontrada.</p>
            )}
          </div>
        </section>

        <section className="quick-actions glass">
          <h2>Ações Rápidas</h2>
          {renderQuickActions()}
        </section>
      </div>

      <style jsx>{`
        .welcome-section {
          margin-bottom: 40px;
        }

        .welcome-section h1 {
          font-size: 2rem;
          color: var(--primary-color);
          margin-bottom: 8px;
        }

        .welcome-section p {
          color: var(--text-secondary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          padding: 30px;
          border-radius: var(--border-radius);
          text-align: center;
          transition: transform 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
        }

        .dashboard-sections {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }

        @media (max-width: 992px) {
          .dashboard-sections {
            grid-template-columns: 1fr;
          }
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h2, .quick-actions h2 {
          font-size: 1.25rem;
          color: var(--primary-color);
          font-weight: 700;
        }

        .view-all {
          color: var(--secondary-color);
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
        }

        .recent-requests, .quick-actions {
          padding: 30px;
          border-radius: var(--border-radius);
        }

        .request-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .request-item {
          display: flex;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          transition: background 0.2s;
        }

        .request-item:hover {
          background: white;
        }

        .request-id {
          font-weight: 700;
          color: var(--primary-color);
          margin-right: 20px;
          min-width: 60px;
        }

        .request-info {
          flex: 1;
        }

        .request-title {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .request-client {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .request-status {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-progress {
          background: #eff6ff;
          color: #1e40af;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 24px;
        }

        .action-btn {
          padding: 12px;
          background: var(--primary-color);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
          text-decoration: none;
        }

        .action-btn:hover {
          background: var(--secondary-color);
          transform: translateX(5px);
        }

        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
}
