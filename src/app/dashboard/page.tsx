'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardStatsAction } from '@/app/actions/requests';

interface RecentRequest {
  id: number;
  description: string;
  tipoChamado: string;
  categoria: string;
  status: string;
  createdAt: string;
  client: {
    name: string;
  };
}

export default function DashboardPage() {
  const [sessionUser, setSessionUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [stats, setStats] = useState<{ solicitados: number; classificados: number; paraAgendar: number; finalizados: number } | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setSessionUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionUser) {
      getDashboardStatsAction()
        .then((res) => {
          if (res?.stats) {
            setStats(res.stats);
          }
          if (res?.recentRequests) {
            setRecentRequests(res.recentRequests);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [sessionUser]);

  const getGreeting = () => {
    if (!sessionUser) return 'Olá, ...';
    return `Olá, ${sessionUser.name}`;
  };

  const getSubtitle = () => {
    if (!sessionUser) return 'Carregando portal...';
    switch (sessionUser.role) {
      case 'ADMINISTRADOR':
        return 'Aqui está o resumo em tempo real de todas as atividades do portal administrativo.';
      case 'TECCOSTA_GESTAO':
        return 'Gerencie clientes, técnicos e acompanhe o fluxo de chamados da TecCosta.';
      case 'CONDOMINIO_EMPRESA':
      case 'ADMINISTRADORA_CONDOMINIO':
        return 'Acompanhe as solicitações abertas e crie novos chamados para seus condomínios.';
      case 'TECNICO':
        return 'Acesse seus chamados de manutenção e gerencie seus agendamentos.';
      default:
        return 'Bem-vindo ao portal da TecCosta.';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'EM_ANDAMENTO': return 'Em Andamento';
      case 'CONCLUIDO': return 'Concluído';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'status-pending';
      case 'EM_ANDAMENTO': return 'status-progress';
      case 'CONCLUIDO': return 'status-completed';
      case 'CANCELADO': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="welcome-section">
        <h1>{getGreeting()}</h1>
        <p>{getSubtitle()}</p>
      </div>

      {/* Grid de Estatísticas Dinâmicas */}
      <div className="stats-grid">
        <div className="stat-card glass">
          <p className="stat-label">Chamados Solicitados</p>
          {loading ? (
            <div className="skeleton skeleton-value"></div>
          ) : (
            <p className="stat-value" style={{ color: '#0284c7' }}>{stats?.solicitados ?? 0}</p>
          )}
        </div>
        <div className="stat-card glass">
          <p className="stat-label">Chamados Classificados</p>
          {loading ? (
            <div className="skeleton skeleton-value"></div>
          ) : (
            <p className="stat-value" style={{ color: '#7c3aed' }}>{stats?.classificados ?? 0}</p>
          )}
        </div>
        <div className="stat-card glass">
          <p className="stat-label">Para serem Agendados</p>
          {loading ? (
            <div className="skeleton skeleton-value"></div>
          ) : (
            <p className="stat-value" style={{ color: '#d97706' }}>{stats?.paraAgendar ?? 0}</p>
          )}
        </div>
        <div className="stat-card glass">
          <p className="stat-label">Chamados Finalizados</p>
          {loading ? (
            <div className="skeleton skeleton-value"></div>
          ) : (
            <p className="stat-value" style={{ color: '#059669' }}>{stats?.finalizados ?? 0}</p>
          )}
        </div>
      </div>

      {/* Solicitações Recentes */}
      <div className="dashboard-sections">
        <section className="recent-requests glass">
          <div className="section-header">
            <h2>{sessionUser?.role === 'TECNICO' ? 'Seus Últimos 5 Chamados Abertos' : 'Últimas 5 Solicitações Abertas'}</h2>
            {sessionUser?.role === 'TECNICO' ? (
              <Link href="/dashboard/chamados/acompanhamento-chamado" className="view-all">Ver todos</Link>
            ) : (
              <Link href="/dashboard/chamados/solicitacao" className="view-all">Ver todas</Link>
            )}
          </div>
          
          <div className="request-list">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="request-item skeleton-item">
                  <div className="skeleton skeleton-id"></div>
                  <div className="skeleton-info">
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-client"></div>
                  </div>
                  <div className="skeleton skeleton-badge"></div>
                </div>
              ))
            ) : (
              recentRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-id">#{String(request.id).padStart(3, '0')}</div>
                  <div className="request-info">
                    <p className="request-title">{request.categoria}</p>
                    <p className="request-desc">{request.description}</p>
                    <p className="request-client">🏢 {request.client.name}</p>
                  </div>
                  <div className={`request-status ${getStatusClass(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </div>
                </div>
              ))
            )}
            
            {!loading && recentRequests.length === 0 && (
              <p className="text-muted text-center py-4">Nenhuma solicitação recente encontrada.</p>
            )}
          </div>
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
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          padding: 30px;
          border-radius: var(--border-radius);
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.08);
        }

        .stat-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
        }

        .dashboard-sections {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h2 {
          font-size: 1.25rem;
          color: var(--primary-color);
          font-weight: 700;
          margin: 0;
        }

        .view-all {
          color: var(--secondary-color);
          font-weight: 700;
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .view-all:hover {
          color: var(--primary-color);
        }

        .recent-requests {
          padding: 30px;
          border-radius: var(--border-radius);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .request-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .request-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          transition: background 0.2s, transform 0.2s;
        }

        .request-item:hover {
          background: white;
          transform: translateX(5px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .request-id {
          font-weight: 800;
          color: var(--primary-color);
          margin-right: 20px;
          min-width: 60px;
          font-size: 1rem;
        }

        .request-info {
          flex: 1;
        }

        .request-title {
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 4px 0;
          font-size: 0.95rem;
        }

        .request-desc {
          font-size: 0.875rem;
          color: #475569;
          margin: 0 0 6px 0;
          max-width: 800px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .request-client {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          margin: 0;
        }

        .request-status {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.725rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .status-pending {
          background: #fef3c7;
          color: #d97706;
          border: 1px solid rgba(217, 119, 6, 0.2);
        }

        .status-progress {
          background: #ede9fe;
          color: #7c3aed;
          border: 1px solid rgba(124, 58, 237, 0.2);
        }

        .status-completed {
          background: #dcfce7;
          color: #059669;
          border: 1px solid rgba(5, 150, 105, 0.2);
        }

        .status-cancelled {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.2);
        }

        /* Skeletons */
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-value {
          height: 3.5rem;
          width: 80px;
          margin: 0 auto;
        }

        .skeleton-item {
          background: rgba(255, 255, 255, 0.3) !important;
          border-color: rgba(226, 232, 240, 0.4) !important;
          pointer-events: none;
        }

        .skeleton-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skeleton-id {
          height: 20px;
          width: 50px;
          margin-right: 20px;
        }

        .skeleton-title {
          height: 18px;
          width: 150px;
        }

        .skeleton-client {
          height: 14px;
          width: 250px;
        }

        .skeleton-badge {
          height: 24px;
          width: 80px;
          border-radius: 20px;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
