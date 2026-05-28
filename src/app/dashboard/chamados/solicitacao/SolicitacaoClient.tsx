'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { createRequestAction, deleteRequestAction, getRequestsAction } from '@/app/actions/requests';

interface SerializedClient {
  id: string;
  name: string;
  cnpj: string;
}

interface SerializedRequest {
  id: number;
  description: string;
  tipoChamado: string;
  categoria: string;
  subItem: string | null;
  observacao: string | null;
  openedBy: string | null;
  createdById: string | null;
  nivelCriticidade: string | null;
  classifiedBy: string | null;
  classifiedAt: string | null;
  prazoSla: string | null;
  dataAtendimento: string | null;
  status: string;
  createdAt: string;
  client: SerializedClient;
  technician: { id: string; name: string } | null;
}

interface SolicitacaoClientProps {
  initialRequests: SerializedRequest[];
  allClients: SerializedClient[];
  userClients: { id: string; name: string }[];
  sessionUser: { id: string; name: string; role: string };
}

// Definição dos mapeamentos de categorias e sub-itens
const OPERACIONAIS_MAP: Record<string, string[]> = {
  'Elétrica': [
    'Iluminação não emergencial',
    'Conserto de tomadas',
    'Interfone',
    'Antena',
    'Luz piloto',
    'Preventiva'
  ],
  'Câmeras': [
    'Manutenção preventiva',
    'Ajustes de imagem',
    'Troca de cabos/conectores',
    'Instalação de novas câmeras'
  ],
  'Cerca Elétrica': [
    'Problemas no funcionamento',
    'Limpeza de isoladores',
    'Troca de fios danificados'
  ],
  'Antenas': [
    'Problemas no funcionamento',
    'Substituição de cabeamento',
    'Ajustes de sinal'
  ],
  'Interfone': [
    'Problemas no funcionamento',
    'Substituição de cabeamento',
    'Ajustes de sinal'
  ],
  'Luz Piloto': [
    'Problemas no funcionamento',
    'Substituição de cabeamento',
    'Ajustes de sinal'
  ],
  'Orçamento': [] // Indica que exibirá campo livre para orçamento
};

const EMERGENCIAIS_MAP: Record<string, string[]> = {
  'Câmeras de Monitoramento': [
    'Sistema todo inoperante',
    'DVR/NVR sem gravação',
    'Perda total de monitoramento'
  ],
  'Portão da garagem': [
    'Travados sem abrir/fechar',
    'Risco de acidente',
    'Quebra de motor'
  ],
  'Porta de entrada': [
    'Travados sem abrir/fechar',
    'Risco de acidente',
    'Quebra de motor'
  ],
  'Cerca elétrica': [
    'Desligada totalmente',
    'Falha crítica de choque',
    'Curtos que gerem risco'
  ],
  'Iluminação de segurança': [
    'Desligada totalmente',
    'Falha crítica de choque',
    'Curtos que gerem risco'
  ]
};

const NIVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'N1 – Emergencial', color: '#dc2626', bg: '#fee2e2' },
  '2': { label: 'N2 – Urgente',     color: '#d97706', bg: '#fef3c7' },
  '3': { label: 'N3 – Programado',  color: '#0369a1', bg: '#e0f2fe' },
  '4': { label: 'N4 – Agendado',    color: '#7c3aed', bg: '#ede9fe' },
};

function calculateBusinessSla(startDate: Date, hoursToAdd: number): Date {
  const date = new Date(startDate);

  // Se a hora inicial estiver fora do horário comercial:
  // Se for antes das 08:00, ajusta para 08:00 do mesmo dia.
  // Se for a partir das 18:00, ajusta para 08:00 do dia seguinte.
  if (date.getHours() < 8) {
    date.setHours(8, 0, 0, 0);
  } else if (date.getHours() >= 18) {
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
  }

  let remainingHours = hoursToAdd;
  while (remainingHours > 0) {
    const currentHour = date.getHours();
    const availableHoursToday = 18 - currentHour;

    if (availableHoursToday <= 0) {
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);
      continue;
    }

    if (remainingHours <= availableHoursToday) {
      date.setHours(currentHour + remainingHours);
      remainingHours = 0;
    } else {
      remainingHours -= availableHoursToday;
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);
    }
  }
  return date;
}

function getPrazoFinal(req: SerializedRequest): string | null {
  if (!req.classifiedAt || !req.nivelCriticidade) return null;
  const classifiedDate = new Date(req.classifiedAt);
  if (req.nivelCriticidade === '1') {
    return calculateBusinessSla(classifiedDate, 4).toISOString();
  }
  if (req.nivelCriticidade === '2') {
    return calculateBusinessSla(classifiedDate, 24).toISOString();
  }
  if (req.nivelCriticidade === '3') {
    return calculateBusinessSla(classifiedDate, 72).toISOString();
  }
  if (req.nivelCriticidade === '4') {
    return req.dataAtendimento;
  }
  return null;
}

export default function SolicitacaoClient({
  initialRequests,
  allClients,
  userClients,
  sessionUser
}: SolicitacaoClientProps) {
  const [requests, setRequests] = useState<SerializedRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 4;
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [tipoChamado, setTipoChamado] = useState('Operacionais');
  const [categoria, setCategoria] = useState('');
  const [subItem, setSubItem] = useState('');
  const [observacao, setObservacao] = useState('');
  const [clientId, setClientId] = useState('');

  // Orcamento Necessidade (Campo livre quando categoria é Orçamento)
  const [orcamentoNecessidade, setOrcamentoNecessidade] = useState('');

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Inicializar dados do cliente logado se for gestor
  const isManager = sessionUser.role === 'CONDOMINIO_EMPRESA';
  const managerClientName = isManager && userClients.length > 0 ? userClients[0].name : '';

  // Efeito para preencher valores padrões de categoria e subItem conforme o Tipo do Chamado muda
  useEffect(() => {
    if (editingRequestId) return; // Não resetar campos dinamicamente ao editar
    if (tipoChamado === 'Operacionais') {
      setCategoria('Elétrica');
      setSubItem(OPERACIONAIS_MAP['Elétrica'][0]);
    } else {
      setCategoria('Câmeras de Monitoramento');
      setSubItem(EMERGENCIAIS_MAP['Câmeras de Monitoramento'][0]);
    }
  }, [tipoChamado, editingRequestId]);

  // Efeito para preencher valor padrão de subItem ao trocar de categoria
  useEffect(() => {
    if (editingRequestId) return; // Não resetar campos dinamicamente ao editar
    if (tipoChamado === 'Operacionais') {
      const subs = OPERACIONAIS_MAP[categoria];
      if (subs && subs.length > 0) {
        setSubItem(subs[0]);
      } else {
        setSubItem('');
      }
    } else {
      const subs = EMERGENCIAIS_MAP[categoria];
      if (subs && subs.length > 0) {
        setSubItem(subs[0]);
      } else {
        setSubItem('');
      }
    }
  }, [categoria, tipoChamado, editingRequestId]);

  const handleNewClick = () => {
    setEditingRequestId(null);
    setDescription('');
    setTipoChamado('Operacionais');
    setCategoria('Elétrica');
    setSubItem(OPERACIONAIS_MAP['Elétrica'][0]);
    setObservacao('');
    setOrcamentoNecessidade('');
    setClientId(isManager && userClients.length > 0 ? userClients[0].id : '');
    setError(null);
    setSuccess(null);
    setLoading(false);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setEditingRequestId(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleEditClick = (req: SerializedRequest) => {
    setEditingRequestId(req.id);
    setDescription(req.description);
    setTipoChamado(req.tipoChamado);
    setCategoria(req.categoria);
    
    // Carregar orçamento se for o caso
    if (req.tipoChamado === 'Operacionais' && req.categoria === 'Orçamento') {
      const budgetText = req.subItem || '';
      const match = budgetText.match(/^Orçamento:\s*(.*)$/);
      setOrcamentoNecessidade(match ? match[1] : budgetText);
      setSubItem('');
    } else {
      setSubItem(req.subItem || '');
      setOrcamentoNecessidade('');
    }

    setObservacao(req.observacao || '');
    setClientId(req.client.id);
    setError(null);
    setSuccess(null);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validação
    if (!description.trim()) {
      setError('Por favor, preencha o descritivo da solicitação.');
      setLoading(false);
      return;
    }

    if (!isManager && !clientId) {
      setError('Por favor, selecione um Cliente (Condomínio/Empresa).');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('tipoChamado', tipoChamado);
      formData.append('categoria', categoria);
      
      // Se for a categoria Orçamento, manda a necessidade no campo subItem
      if (tipoChamado === 'Operacionais' && categoria === 'Orçamento') {
        if (!orcamentoNecessidade.trim()) {
          setError('Por favor, descreva a necessidade do orçamento.');
          setLoading(false);
          return;
        }
        formData.append('subItem', `Orçamento: ${orcamentoNecessidade}`);
      } else {
        formData.append('subItem', subItem);
      }

      formData.append('observacao', observacao);
      formData.append('clientId', clientId);

      const { updateRequestAction } = await import('@/app/actions/requests');
      const result = editingRequestId
        ? await updateRequestAction(editingRequestId, formData)
        : await createRequestAction(formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(editingRequestId ? 'Solicitação de chamado atualizada com sucesso!' : 'Solicitação de chamado enviada com sucesso!');
        setLoading(false); // Reseta loading imediatamente no sucesso
        
        // Recarregar lista do banco de dados de forma resiliente
        try {
          const updated = await getRequestsAction();
          if (updated?.requests) {
            setRequests(updated.requests as unknown as SerializedRequest[]);
          }
        } catch (fetchErr) {
          console.error('Erro ao recarregar a lista de chamados:', fetchErr);
        }

        setTimeout(() => {
          handleCloseForm();
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Erro de conexão ao enviar o chamado.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(`Deseja realmente excluir a solicitação de chamado #${String(id).padStart(3, '0')}?`)) {
      try {
        const result = await deleteRequestAction(id);
        if (result?.error) {
          alert(result.error);
        } else {
          setRequests(requests.filter((r) => r.id !== id));
        }
      } catch (err) {
        console.error('Error deleting request:', err);
        alert('Erro ao tentar excluir chamado.');
      }
    }
  };

  // Formatador de data e hora do chamado solicitado
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Helper para obter a data local YYYY-MM-DD a partir de uma data UTC string
  const getLocalDateString = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtrar chamados
  const filteredRequests = requests.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchQuery = (
      r.description.toLowerCase().includes(query) ||
      r.categoria.toLowerCase().includes(query) ||
      (r.subItem && r.subItem.toLowerCase().includes(query)) ||
      r.client.name.toLowerCase().includes(query) ||
      (r.openedBy && r.openedBy.toLowerCase().includes(query)) ||
      String(r.id).includes(query)
    );
    const matchClient = filterClient === '' || r.client.id === filterClient;
    const matchTechnician = filterTechnician === '' ||
      (filterTechnician === '__none__' ? !r.technician : r.technician?.id === filterTechnician);
    const matchDate = filterDate === '' || (r.dataAtendimento && getLocalDateString(r.dataAtendimento) === filterDate);
    return matchQuery && matchClient && matchTechnician && matchDate;
  });

  // Listas únicas para os filtros
  const uniqueClients = Array.from(
    new Map(requests.map((r) => [r.client.id, r.client.name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const uniqueTechnicians = Array.from(
    new Map(
      requests
        .filter((r) => r.technician)
        .map((r) => [r.technician!.id, r.technician!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setCurrentPage(1);
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
      case 'PENDENTE': return styles.statusPending;
      case 'EM_ANDAMENTO': return styles.statusInProgress;
      case 'CONCLUIDO': return styles.statusCompleted;
      case 'CANCELADO': return styles.statusCancelled;
      default: return '';
    }
  };

  if (view === 'form') {
    return (
      <div className={styles.pageContainer}>
        <button className={styles.backBtn} onClick={handleCloseForm}>
          ← Voltar para a lista
        </button>

        <div className={styles.pageHeader}>
          <div>
            <h1>{editingRequestId ? 'Editar Solicitação de Chamado' : 'Solicitar Novo Chamado'}</h1>
            <p>
              {editingRequestId 
                ? 'Altere os campos abaixo para atualizar a sua solicitação de chamado.'
                : 'Preencha os campos abaixo para abrir um chamado operacional ou emergencial para atendimento.'}
            </p>
          </div>
        </div>

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

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              
              {/* Nome do Condomínio / Empresa (Readonly se for gestor logado, ou dropdown para Admin) */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Condomínio ou Empresa Cliente <span className={styles.required}>*</span></label>
                {isManager ? (
                  <input
                    type="text"
                    value={managerClientName || 'Carregando condomínio...'}
                    className={styles.readonlyField}
                    readOnly
                    disabled
                  />
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">-- Selecione o Cliente --</option>
                    {allClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} (CNPJ: {client.cnpj})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Solicitante (Usuário Logado) */}
              <div className={styles.formGroup}>
                <label>Solicitante (Usuário Logado)</label>
                <input
                  type="text"
                  value={sessionUser.name}
                  className={styles.readonlyField}
                  readOnly
                  disabled
                />
              </div>

              {/* Data da Abertura (Nativo hoje - Readonly) */}
              <div className={styles.formGroup}>
                <label>Data de Abertura</label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString('pt-BR')}
                  className={styles.readonlyField}
                  readOnly
                  disabled
                />
              </div>

              {/* Tipo do Chamado */}
              <div className={styles.formGroup}>
                <label htmlFor="tipoChamado">Tipo do Chamado <span className={styles.required}>*</span></label>
                <select
                  id="tipoChamado"
                  value={tipoChamado}
                  onChange={(e) => setTipoChamado(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="Operacionais">Operacionais</option>
                  <option value="Emergenciais">Emergenciais</option>
                </select>
              </div>

              {/* Classificação do Chamado (Categoria) */}
              <div className={styles.formGroup}>
                <label htmlFor="categoria">Classificação do Chamado <span className={styles.required}>*</span></label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                  disabled={loading}
                >
                  {tipoChamado === 'Operacionais'
                    ? Object.keys(OPERACIONAIS_MAP).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    : Object.keys(EMERGENCIAIS_MAP).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))
                  }
                </select>
              </div>

              {/* Sub Item ou Campo Livre de Orçamento */}
              {tipoChamado === 'Operacionais' && categoria === 'Orçamento' ? (
                <div className={styles.formGroup}>
                  <label htmlFor="orcamento">Descreva a necessidade do Orçamento <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    id="orcamento"
                    placeholder="Ex: Aquisição de 2 novas câmeras para o portão"
                    value={orcamentoNecessidade}
                    onChange={(e) => setOrcamentoNecessidade(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label htmlFor="subItem">Sub-item / Detalhe <span className={styles.required}>*</span></label>
                  <select
                    id="subItem"
                    value={subItem}
                    onChange={(e) => setSubItem(e.target.value)}
                    required
                    disabled={loading}
                  >
                    {tipoChamado === 'Operacionais'
                      ? (OPERACIONAIS_MAP[categoria] || []).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                      : (EMERGENCIAIS_MAP[categoria] || []).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                    }
                  </select>
                </div>
              )}

              {/* Descritivo da Solicitação */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="description">Descritivo da Solicitação <span className={styles.required}>*</span></label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Descreva detalhadamente o problema ou solicitação de serviço..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Observação */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="observacao">Observações (opcional)</label>
                <textarea
                  id="observacao"
                  rows={3}
                  placeholder="Qualquer informação ou observação adicional de apoio..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={handleCloseForm}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={loading}
              >
                {loading ? 'Salvando...' : (editingRequestId ? 'Salvar Alterações' : 'Salvar Chamado')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Solicitação de Chamado</h1>
          <p>Abra chamados técnicos e gerencie os serviços de manutenção corporativa.</p>
        </div>
        <button className={styles.btnAdd} onClick={handleNewClick}>
          <span>➕</span> Solicitar Chamado
        </button>
      </div>

      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar chamados por descritivo, cliente ou categoria..."
          value={searchQuery}
          onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.selectFilterGroup} style={{ marginBottom: '20px', alignItems: 'center' }}>
        <select
          className={styles.filterSelect}
          value={filterClient}
          onChange={(e) => handleFilterChange(() => setFilterClient(e.target.value))}
        >
          <option value="">👤 Todos os Clientes</option>
          {uniqueClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterTechnician}
          onChange={(e) => handleFilterChange(() => setFilterTechnician(e.target.value))}
        >
          <option value="">🔧 Todos os Técnicos</option>
          <option value="__none__">Não atribuído</option>
          {uniqueTechnicians.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="date"
            className={styles.filterSelect}
            value={filterDate}
            onChange={(e) => handleFilterChange(() => setFilterDate(e.target.value))}
            style={{ paddingRight: filterDate ? '34px' : '14px' }}
            title="Filtrar por data de agendamento"
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => handleFilterChange(() => setFilterDate(''))}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: '#94a3b8',
                padding: '4px',
              }}
              title="Limpar data"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>📝</span>
          <h3>Nenhum chamado encontrado</h3>
          <p>{searchQuery ? 'Tente ajustar os termos da pesquisa.' : 'Abra o seu primeiro chamado clicando no botão acima.'}</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer + ' glass'}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Chamado</th>
                  <th>Solicitante</th>
                  <th>Cliente</th>
                  <th>Tipo / Nível</th>
                  <th>Categoria</th>
                  <th>Data Abertura</th>
                  <th>Prazo Final (SLA)</th>
                  <th>Data Agendada</th>
                  <th>Técnico</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req) => {
                  const nivel = req.nivelCriticidade ? NIVEL_LABELS[req.nivelCriticidade] : null;
                  const prazoFinal = req.prazoSla;
                  return (
                    <tr key={req.id} className={styles.rowHover}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                          #{String(req.id).padStart(3, '0')}
                        </div>
                        <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.description}>
                          {req.description}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {req.openedBy || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Não registrado</span>}
                        </div>
                      </td>
                      <td>
                        <span className={styles.clientText}>{req.client.name}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${req.tipoChamado === 'Emergenciais' ? styles.typeBadgeEmergencial : styles.typeBadge}`}>
                          {req.tipoChamado}
                        </span>
                        {nivel && (
                          <div style={{ marginTop: 4 }}>
                            <span className={styles.nivelBadge} style={{ color: nivel.color, backgroundColor: nivel.bg }}>
                              {nivel.label}
                            </span>
                          </div>
                        )}
                        {!nivel && (
                          <div style={{ marginTop: 4 }}>
                            <span className={styles.nivelBadgeEmpty}>Sem nível</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={styles.categoryLabel}>{req.categoria}</span>
                        {req.subItem && (
                          <span className={styles.subItemLabel}>{req.subItem}</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.dateText}>
                          {formatDateTime(req.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.dateText} style={{ fontWeight: 600, color: '#dc2626' }}>
                          {formatDateTime(prazoFinal)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.dateText} style={req.dataAtendimento ? { fontWeight: 600, color: 'var(--primary-color)' } : {}}>
                          {formatDateTime(req.dataAtendimento)}
                        </span>
                      </td>
                      <td>
                        {req.technician ? (
                          <span className={styles.technicianName}>{req.technician.name}</span>
                        ) : (
                          <span className={styles.unassigned}>Não atribuído</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          {req.status === 'PENDENTE' && (sessionUser.role !== 'CONDOMINIO_EMPRESA' || req.createdById === sessionUser.id || req.createdById === null) && (
                            <button
                              className={styles.btnEdit}
                              onClick={() => handleEditClick(req)}
                            >
                              Editar
                            </button>
                          )}
                          {req.status === 'PENDENTE' && (sessionUser.role !== 'CONDOMINIO_EMPRESA' || req.createdById === sessionUser.id || req.createdById === null) && (
                            <button
                              className={styles.btnDelete}
                              onClick={() => handleDelete(req.id)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className={styles.paginationRow}>
              <span className={styles.paginationInfo}>
                Exibindo {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredRequests.length)} de {filteredRequests.length} chamados
              </span>
              <div className={styles.paginationControls}>
                <button className={styles.pageBtn} onClick={() => setCurrentPage(1)} disabled={safePage === 1} title="Primeira página">«</button>
                <button className={styles.pageBtn} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>‹ Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                ))}
                <button className={styles.pageBtn} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Próximo ›</button>
                <button className={styles.pageBtn} onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} title="Última página">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
