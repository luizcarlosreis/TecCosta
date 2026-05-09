'use client';

import { useState } from 'react';

interface Contact {
  name: string;
  phone: string;
  role: string;
}

interface Client {
  id: number;
  name: string;
  cnpj: string;
  contacts: Contact[];
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([
    { 
      id: 1, 
      name: 'Residencial Aurora', 
      cnpj: '12.345.678/0001-90',
      contacts: [{ name: 'Carlos Silva', phone: '(12) 98888-1111', role: 'Síndico' }]
    },
    { 
      id: 2, 
      name: 'Edifício Horizonte', 
      cnpj: '98.765.432/0001-21',
      contacts: [{ name: 'Ana Oliveira', phone: '(12) 97777-2222', role: 'Zeladora' }]
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: clients.length + 1,
      name: newName,
      cnpj: newCnpj,
      contacts: []
    };
    setClients([...clients, newClient]);
    setIsModalOpen(false);
    setNewName('');
    setNewCnpj('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Cadastro de Clientes</h1>
          <p>Gerencie os condomínios e empresas atendidas.</p>
        </div>
        <button className="btn-add" onClick={() => setIsModalOpen(true)}>
          + Novo Cliente
        </button>
      </div>

      <div className="clients-grid">
        {clients.map((client) => (
          <div key={client.id} className="client-card glass">
            <div className="client-header">
              <h3>{client.name}</h3>
              <span className="client-id">ID: #{client.id}</span>
            </div>
            <p className="cnpj">CNPJ: {client.cnpj}</p>
            
            <div className="contacts-section">
              <h4>Responsáveis</h4>
              {client.contacts.length > 0 ? (
                client.contacts.map((c, idx) => (
                  <div key={idx} className="contact-item">
                    <p><strong>{c.name}</strong> ({c.role})</p>
                    <p>{c.phone}</p>
                  </div>
                ))
              ) : (
                <p className="no-contacts">Nenhum responsável cadastrado.</p>
              )}
              <button className="btn-add-contact">+ Adicionar Responsável</button>
            </div>
            
            <div className="card-actions">
              <button className="btn-edit">Editar</button>
              <button className="btn-delete">Remover</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-fade-in">
            <h2>Cadastrar Novo Cliente</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Nome do Condomínio / Empresa</label>
                <input 
                  type="text" 
                  placeholder="Ex: Residencial Jardins" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>CNPJ</label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0001-00" 
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(e.target.value)}
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-submit">Salvar Cliente</button>
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

        .btn-add {
          background: var(--primary-color);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
        }

        .clients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .client-card {
          padding: 24px;
          border-radius: var(--border-radius);
          display: flex;
          flex-direction: column;
        }

        .client-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .client-header h3 {
          color: var(--primary-color);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .client-id {
          font-size: 0.75rem;
          background: #e2e8f0;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .cnpj {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .contacts-section {
          background: rgba(0, 51, 102, 0.03);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          flex: 1;
        }

        .contacts-section h4 {
          font-size: 0.875rem;
          color: var(--primary-color);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contact-item {
          font-size: 0.9rem;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .contact-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .no-contacts {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .btn-add-contact {
          margin-top: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--secondary-color);
        }

        .card-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .btn-edit, .btn-delete {
          flex: 1;
          padding: 10px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .btn-edit {
          background: #f1f5f9;
          color: var(--primary-color);
        }

        .btn-delete {
          background: #fee2e2;
          color: #b91c1c;
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
