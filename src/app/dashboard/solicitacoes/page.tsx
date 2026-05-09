'use client';

import { useState } from 'react';

interface Solicitation {
  id: number;
  title: string;
  client: string;
  date: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
}

export default function SolicitacoesPage() {
  const [solicitations, setSolicitations] = useState<Solicitation[]>([
    { id: 50, title: 'Manutenção de Portão Eletrônico', client: 'Residencial Aurora', date: '09/05/2026', status: 'Em Andamento' },
    { id: 51, title: 'Troca de Sensores de Presença', client: 'Edifício Horizonte', date: '08/05/2026', status: 'Pendente' },
    { id: 52, title: 'Instalação de Câmera IP', client: 'Condomínio Solar', date: '07/05/2026', status: 'Concluído' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = solicitations.length > 0 ? Math.max(...solicitations.map(s => s.id)) + 1 : 50;
    const newSolicitation: Solicitation = {
      id: nextId,
      title: newTitle,
      client: newClient,
      date: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente'
    };
    setSolicitations([newSolicitation, ...solicitations]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewClient('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Solicitações de Reparo</h1>
          <p>Gerencie e acompanhe todas as ordens de serviço.</p>
        </div>
        <button className="btn-add" onClick={() => setIsModalOpen(true)}>
          + Nova Solicitação
        </button>
      </div>

      <div className="table-container glass">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Título / Descrição</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {solicitations.map((s) => (
              <tr key={s.id}>
                <td className="font-bold">#{s.id}</td>
                <td>{s.title}</td>
                <td>{s.client}</td>
                <td>{s.date}</td>
                <td>
                  <span className={`status-badge status-${s.status.toLowerCase().replace(' ', '-')}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button className="btn-action">Visualizar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-fade-in">
            <h2>Nova Solicitação de Manutenção</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Título da Solicitação</label>
                <input 
                  type="text" 
                  placeholder="Ex: Reparo em vazamento" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Cliente</label>
                <select 
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  <option value="Residencial Aurora">Residencial Aurora</option>
                  <option value="Edifício Horizonte">Edifício Horizonte</option>
                  <option value="Condomínio Solar">Condomínio Solar</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-submit">Criar Solicitação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: var(--primary-color);
          font-size: 1.8rem;
          margin-bottom: 4px;
        }

        .page-header p {
          color: var(--text-secondary);
        }

        .btn-add {
          background: var(--secondary-color);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          transition: all 0.2s;
        }

        .btn-add:hover {
          background: var(--secondary-light);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 102, 0, 0.2);
        }

        .table-container {
          overflow: hidden;
          border-radius: var(--border-radius);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .data-table th {
          padding: 16px 24px;
          background: rgba(0, 51, 102, 0.05);
          color: var(--primary-color);
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .data-table td {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .font-bold {
          font-weight: 700;
          color: var(--primary-color);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .status-pendente { background: #fee2e2; color: #b91c1c; }
        .status-em-andamento { background: #eff6ff; color: #1d4ed8; }
        .status-concluído { background: #dcfce7; color: #15803d; }

        .btn-action {
          color: var(--primary-color);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 40px;
          border-radius: var(--border-radius);
          background: white;
        }

        .modal-content h2 {
          color: var(--primary-color);
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .form-group input, .form-group select {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
        }

        .btn-cancel {
          padding: 12px 20px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .btn-submit {
          padding: 12px 24px;
          background: var(--primary-color);
          color: white;
          border-radius: 8px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
