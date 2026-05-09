'use client';

export default function DashboardPage() {
  const stats = [
    { label: 'Solicitações Abertas', value: '12', color: 'var(--secondary-color)' },
    { label: 'Em Andamento', value: '5', color: 'var(--primary-color)' },
    { label: 'Finalizadas (Mês)', value: '48', color: 'var(--success-color)' },
    { label: 'Clientes Ativos', value: '156', color: 'var(--primary-color)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="welcome-section">
        <h1>Olá, Administrador</h1>
        <p>Aqui está um resumo do que está acontecendo no portal hoje.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card glass">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <section className="recent-requests glass">
          <div className="section-header">
            <h2>Solicitações Recentes</h2>
            <button className="view-all">Ver todas</button>
          </div>
          
          <div className="request-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="request-item">
                <div className="request-id">#00{i + 50}</div>
                <div className="request-info">
                  <p className="request-title">Reparo em Câmera de Segurança</p>
                  <p className="request-client">Condomínio Mar Azul</p>
                </div>
                <div className="request-status status-pending">Pendente</div>
              </div>
            ))}
          </div>
        </section>

        <section className="quick-actions glass">
          <h2>Ações Rápidas</h2>
          <div className="actions-grid">
            <button className="action-btn">Novo Cliente</button>
            <button className="action-btn">Cadastrar Técnico</button>
            <button className="action-btn">Nova Solicitação</button>
            <button className="action-btn">Gerar Relatório</button>
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
        }

        .action-btn:hover {
          background: var(--secondary-color);
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
}
