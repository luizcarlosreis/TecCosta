'use client';

import { useState } from 'react';

interface Tecnico {
  id: number;
  name: string;
  cpf: string;
  specialty: string;
  status: 'Ativo' | 'Inativo';
}

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([
    { id: 1, name: 'Ricardo Santos', cpf: '111.222.333-44', specialty: 'Elétrica / Automação', status: 'Ativo' },
    { id: 2, name: 'Marcos Lima', cpf: '555.666.777-88', specialty: 'Câmeras / Segurança', status: 'Ativo' },
    { id: 3, name: 'Paulo Silva', cpf: '999.000.111-22', specialty: 'Hidráulica / Alvenaria', status: 'Ativo' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newTecnico: Tecnico = {
      id: tecnicos.length + 1,
      name: newName,
      cpf: newCpf,
      specialty: newSpecialty,
      status: 'Ativo'
    };
    setTecnicos([...tecnicos, newTecnico]);
    setIsModalOpen(false);
    setNewName('');
    setNewCpf('');
    setNewSpecialty('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Equipe Técnica</h1>
          <p>Cadastre e gerencie os técnicos da TecCosta.</p>
        </div>
        <button className="btn-add" onClick={() => setIsModalOpen(true)}>
          + Novo Técnico
        </button>
      </div>

      <div className="table-container glass">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>CPF</th>
              <th>Especialidade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((t) => (
              <tr key={t.id}>
                <td className="font-bold">#{t.id}</td>
                <td className="tecnico-name">{t.name}</td>
                <td>{t.cpf}</td>
                <td>{t.specialty}</td>
                <td>
                  <span className={`status-dot ${t.status === 'Ativo' ? 'dot-active' : 'dot-inactive'}`}></span>
                  {t.status}
                </td>
                <td>
                  <button className="btn-action">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-fade-in">
            <h2>Cadastrar Técnico</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>CPF</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00" 
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Especialidade Principal</label>
                <input 
                  type="text" 
                  placeholder="Ex: Câmeras e Alarmes" 
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-submit">Cadastrar</button>
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
        }

        .btn-add {
          background: var(--primary-color);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
        }

        .table-container {
          border-radius: var(--border-radius);
          overflow: hidden;
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
        }

        .data-table td {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .tecnico-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .dot-active { background: var(--success-color); }
        .dot-inactive { background: var(--error-color); }

        .btn-action {
          color: var(--primary-color);
          font-weight: 600;
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

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
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
