'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { createClientAction, deleteClientAction, getClientsAction, updateClientAction } from '@/app/actions/clients';

interface SerializedUser {
  id: string;
  name: string;
  cpfCnpj: string;
  role: string;
  subRole: string | null;
}

interface SerializedClient {
  id: string;
  clientCode: number;
  name: string;
  cnpj: string;
  phone: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  createdAt: string;
  managers: SerializedUser[];
}

interface ClientesClientProps {
  initialClients: SerializedClient[];
  eligibleManagers: SerializedUser[];
}

// Formatting and Input Masking Helpers
const formatCNPJ = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 14);
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 5) return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2)}`;
  if (cleanValue.length <= 8) return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5)}`;
  if (cleanValue.length <= 12) return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5, 8)}/${cleanValue.slice(8)}`;
  return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2, 5)}.${cleanValue.slice(5, 8)}/${cleanValue.slice(8, 12)}-${cleanValue.slice(12)}`;
};

const formatCEP = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 8);
  if (cleanValue.length <= 5) return cleanValue;
  return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
};

const formatPhone = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 11);
  if (cleanValue.length <= 2) return cleanValue.length > 0 ? `(${cleanValue}` : '';
  if (cleanValue.length <= 7) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
};

const getManagerRoleLabel = (user: SerializedUser) => {
  if (user.role === 'ADMINISTRADORA_CONDOMINIO') {
    return 'Administradora';
  }
  if (user.role === 'CONDOMINIO_EMPRESA') {
    return user.subRole || 'Gestor';
  }
  return 'Responsável';
};

export default function ClientesClient({ initialClients, eligibleManagers }: ClientesClientProps) {
  const [clients, setClients] = useState<SerializedClient[]>(initialClients);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    const matchesNameOrCnpj =
      client.name.toLowerCase().includes(query) || client.cnpj.toLowerCase().includes(query);
    const matchesManager = client.managers.some((m) =>
      m.name.toLowerCase().includes(query)
    );
    return matchesNameOrCnpj || matchesManager;
  });

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatCEP(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClientId(null);
    setName('');
    setCnpj('');
    setPhone('');
    setCep('');
    setRua('');
    setNumero('');
    setBairro('');
    setSelectedManagerIds([]);
    setError(null);
    setSuccess(null);
  };

  const handleEditClick = (client: SerializedClient) => {
    setEditingClientId(client.id);
    setName(client.name);
    setCnpj(client.cnpj);
    setPhone(client.phone || '');
    setCep(client.cep || '');
    setRua(client.rua || '');
    setNumero(client.numero || '');
    setBairro(client.bairro || '');
    setSelectedManagerIds(client.managers.map((m) => m.id));
    setIsModalOpen(true);
  };

  const handleCheckboxChange = (managerId: string) => {
    if (selectedManagerIds.includes(managerId)) {
      setSelectedManagerIds(selectedManagerIds.filter((id) => id !== managerId));
    } else {
      setSelectedManagerIds([...selectedManagerIds, managerId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validações simples
    if (cnpj.length < 18) {
      setError('CNPJ inválido. Preencha completamente.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('cnpj', cnpj);
      formData.append('phone', phone);
      formData.append('cep', cep);
      formData.append('rua', rua);
      formData.append('numero', numero);
      formData.append('bairro', bairro);
      formData.append('managerIds', JSON.stringify(selectedManagerIds));

      const result = editingClientId
        ? await updateClientAction(editingClientId, formData)
        : await createClientAction(formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(editingClientId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
        
        // Recarregar lista do banco de dados
        const updated = await getClientsAction();
        if (updated.clients) {
          setClients(updated.clients as unknown as SerializedClient[]);
        }

        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting client form:', err);
      setError('Erro de conexão ao enviar o formulário.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza de que deseja excluir o cliente "${name}"?`)) {
      try {
        const result = await deleteClientAction(id);
        if (result?.error) {
          alert(result.error);
        } else {
          // Remover do state local
          setClients(clients.filter((client) => client.id !== id));
        }
      } catch (err) {
        console.error('Error deleting client:', err);
        alert('Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Cadastrar Novo Cliente</h1>
          <p>Preencha os campos abaixo para registrar um condomínio ou empresa cliente.</p>
        </div>
        <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
          <span>➕</span> Novo Cliente
        </button>
      </div>

      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar por condomínio, CNPJ ou gestor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredClients.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>🏢</span>
          <h3>Nenhum cliente encontrado</h3>
          <p>{searchQuery ? 'Tente ajustar os termos da pesquisa.' : 'Cadastre um novo cliente para iniciar.'}</p>
        </div>
      ) : (
        <div className={styles.clientsGrid}>
          {filteredClients.map((client) => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientCardHeader}>
                <h3 className={styles.clientTitle}>{client.name}</h3>
                <span className={styles.clientCodeBadge}>
                  Cód: #{String(client.clientCode).padStart(3, '0')}
                </span>
              </div>
              <p className={styles.cnpjText}>CNPJ: {client.cnpj}</p>

              <div className={styles.infoDetails}>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>📞</span>
                  <span>{client.phone || <span className={styles.emptyValue}>Não cadastrado</span>}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>📍</span>
                  <span>
                    {client.rua ? (
                      `${client.rua}, ${client.numero || 'S/N'} - ${client.bairro || ''} (CEP: ${client.cep || ''})`
                    ) : (
                      <span className={styles.emptyValue}>Endereço não informado</span>
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.managersSection}>
                <h4>Responsáveis Vinculados</h4>
                {client.managers.length > 0 ? (
                  <div className={styles.managerList}>
                    {client.managers.map((manager) => (
                      <div key={manager.id} className={styles.managerItem}>
                        <span className={styles.managerName}>{manager.name}</span>
                        <div className={styles.managerMeta}>
                          <span className={styles.managerRole}>
                            {getManagerRoleLabel(manager)}
                          </span>
                          <span>CPF: {manager.cpfCnpj}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={styles.noManagers}>Nenhum gestor/administradora vinculado.</span>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnEdit}
                  onClick={() => handleEditClick(client)}
                >
                  Editar
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDelete(client.id, client.name)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent + ' glass'}>
            <h2>{editingClientId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h2>
            <p className={styles.modalSubtitle}>
              {editingClientId
                ? 'Edite as informações abaixo para atualizar os dados do cliente.'
                : 'Preencha os campos abaixo para registrar um condomínio ou empresa cliente.'}
            </p>

            {error && (
              <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className={`${styles.feedbackMessage} ${styles.feedbackSuccess}`}>
                ✓ {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label htmlFor="clientName">
                    Nome do Condomínio / Empresa <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    placeholder="Ex: Condomínio Residencial Aurora"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientCnpj">
                    CNPJ <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="clientCnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientPhone">Telefone de Contato</label>
                  <input
                    type="text"
                    id="clientPhone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientCep">CEP</label>
                  <input
                    type="text"
                    id="clientCep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={handleCepChange}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientRua">Rua / Logradouro</label>
                  <input
                    type="text"
                    id="clientRua"
                    placeholder="Ex: Av. Atlântica"
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientNumero">Número</label>
                  <input
                    type="text"
                    id="clientNumero"
                    placeholder="Ex: 1200"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="clientBairro">Bairro</label>
                  <input
                    type="text"
                    id="clientBairro"
                    placeholder="Ex: Centro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Vincular Responsáveis (Síndico, Zelador ou Administradora)</label>
                  {eligibleManagers.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 0' }}>
                      Nenhum gestor com perfil "Condomínio/Empresa" ou "Administradora" cadastrado ainda.
                    </div>
                  ) : (
                    <div className={styles.managersChecklist}>
                      {eligibleManagers.map((manager) => (
                        <label key={manager.id} className={styles.checkItem}>
                          <input
                            type="checkbox"
                            checked={selectedManagerIds.includes(manager.id)}
                            onChange={() => handleCheckboxChange(manager.id)}
                            disabled={loading}
                          />
                          <div className={styles.checkItemText}>
                            <span className={styles.checkItemName}>{manager.name}</span>
                            <span className={styles.checkItemRole}>
                              {getManagerRoleLabel(manager)} (CPF: {manager.cpfCnpj})
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : (editingClientId ? 'Salvar Alterações' : 'Salvar Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
