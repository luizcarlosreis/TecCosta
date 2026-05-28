'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { classifyRequestAction } from '@/app/actions/requests';

interface SerializedClient {
  id: string;
  name: string;
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

interface ClassificacaoClientProps {
  pendingRequests: SerializedRequest[];
  sessionUser: { id: string; name: string; role: string };
}

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

// Definições dos níveis de criticidade
const NIVEIS = {
  '1': {
    label: 'Nível 1 – Emergencial (até 4h)',
    descricao: 'Situações críticas que colocam em risco a segurança ou funcionamento essencial do condomínio.',
    exemplos: 'Ex: Câmeras prioritárias, porta principal, portão de garagem.',
    obs: 'Chamados que exigem troca de equipamento serão tratados como Nível 4 até que a peça esteja disponível.',
    sla: '4 horas',
    horas: 4,
    color: '#dc2626',
    bg: '#fee2e2',
    tipos: ['Emergenciais']
  },
  '2': {
    label: 'Nível 2 – Urgente (até 24h)',
    descricao: 'Impacta parcialmente a operação, mas não compromete totalmente.',
    exemplos: 'Ex: Iluminação de segurança, câmeras de monitoramento, cerca elétrica.',
    obs: 'Chamados que exigem troca de equipamento serão tratados como Nível 4 até que a peça esteja disponível.',
    sla: '24 horas',
    horas: 24,
    color: '#d97706',
    bg: '#fef3c7',
    tipos: ['Emergenciais']
  },
  '3': {
    label: 'Nível 3 – Programado / Operacional (até 72h)',
    descricao: 'Serviços de rotina, manutenção preventiva ou corretiva que não comprometem de imediato.',
    exemplos: 'Ex: Reparo de interfone em um apartamento, substituição de lâmpadas não emergenciais, antena, luz piloto.',
    obs: '',
    sla: '72 horas',
    horas: 72,
    color: '#0369a1',
    bg: '#e0f2fe',
    tipos: ['Operacionais']
  },
  '4': {
    label: 'Nível 4 – Agendado (data a definir)',
    descricao: 'Serviços novos de instalação ou chamados que aguardam peças para substituição.',
    exemplos: 'Ex: Instalação de novas câmeras, troca de equipamento aguardando peça.',
    obs: '',
    sla: 'Data informada',
    horas: null,
    color: '#7c3aed',
    bg: '#ede9fe',
    tipos: ['Operacionais'] // Nível 4 apenas para Operacionais
  }
};

function calcularDataAtendimento(nivelCriticidade: string): Date {
  const nivel = NIVEIS[nivelCriticidade as keyof typeof NIVEIS];
  const now = new Date();
  if (nivel.horas !== null) {
    return new Date(now.getTime() + nivel.horas * 60 * 60 * 1000);
  }
  return now;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDateTimeCalc(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Retorna os níveis disponíveis para o tipo do chamado
function getNiveisDisponiveis(tipoChamado: string): string[] {
  return Object.entries(NIVEIS)
    .filter(([, info]) => info.tipos.includes(tipoChamado))
    .map(([key]) => key);
}

export default function ClassificacaoClient({ pendingRequests, sessionUser }: ClassificacaoClientProps) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedRequest, setSelectedRequest] = useState<SerializedRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const PAGE_SIZE = 4;

  // Campos do formulário de classificação
  const [nivelCriticidade, setNivelCriticidade] = useState('');
  const [prazoSlaManual, setPrazoSlaManual] = useState('');

  // Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lista local (remove chamado classificado sem reload)
  const [requests, setRequests] = useState<SerializedRequest[]>(pendingRequests);

  const isAdmin = sessionUser.role === 'ADMINISTRADOR' || sessionUser.role === 'TECCOSTA_GESTAO';

  // Listas únicas para os filtros de cliente e técnico
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

  // Helper para obter a data local YYYY-MM-DD a partir de uma data UTC string
  const getLocalDateString = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchQuery = (
      String(r.id).includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.client.name.toLowerCase().includes(q) ||
      r.tipoChamado.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q) ||
      (r.openedBy && r.openedBy.toLowerCase().includes(q))
    );
    const matchClient = filterClient === '' || r.client.id === filterClient;
    const matchTechnician = filterTechnician === '' ||
      (filterTechnician === '__none__' ? !r.technician : r.technician?.id === filterTechnician);
    const matchDate = filterDate === '' || (r.dataAtendimento && getLocalDateString(r.dataAtendimento) === filterDate);
    return matchQuery && matchClient && matchTechnician && matchDate;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setCurrentPage(1);
  };

  const handleClassificarClick = (req: SerializedRequest) => {
    setSelectedRequest(req);
    // Pré-selecionar o primeiro nível disponível para o tipo
    const niveisDisponiveis = getNiveisDisponiveis(req.tipoChamado);
    setNivelCriticidade(niveisDisponiveis[0] || '');
    setPrazoSlaManual('');
    setError(null);
    setSuccess(null);
    setLoading(false);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setSelectedRequest(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('nivelCriticidade', nivelCriticidade);
      if (nivelCriticidade === '4') {
        if (!prazoSlaManual) {
          setError('Por favor, informe a data limite de SLA.');
          setLoading(false);
          return;
        }
        formData.append('prazoSla', prazoSlaManual);
      }

      const result = await classifyRequestAction(selectedRequest.id, formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(`Chamado #${String(selectedRequest.id).padStart(3, '0')} classificado com sucesso como ${NIVEIS[nivelCriticidade as keyof typeof NIVEIS]?.label}!`);
        setLoading(false); // Reseta loading imediatamente no sucesso
        // Remover da lista local
        setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
        setTimeout(() => {
          handleCloseForm();
        }, 2000);
      }
    } catch (err) {
      console.error('Error classifying request:', err);
      setError('Erro de conexão ao classificar o chamado.');
      setLoading(false);
    }
  };

  // Nível selecionado atual
  const nivelInfo = nivelCriticidade ? NIVEIS[nivelCriticidade as keyof typeof NIVEIS] : null;

  // Data calculada para exibição (exceto nível 4)
  const dataCalculada = nivelCriticidade && nivelCriticidade !== '4'
    ? calcularDataAtendimento(nivelCriticidade)
    : null;

  // ------ FORM VIEW ------
  if (view === 'form' && selectedRequest) {
    const niveisDisponiveis = getNiveisDisponiveis(selectedRequest.tipoChamado);

    return (
      <div className={styles.pageContainer}>
        <button className={styles.backBtn} onClick={handleCloseForm}>
          ← Voltar para a lista
        </button>

        <div className={styles.pageHeader}>
          <div>
            <h1>Classificar Chamado #{String(selectedRequest.id).padStart(3, '0')}</h1>
            <p>Defina o nível de criticidade e a data prevista de atendimento.</p>
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

        {/* Painel de informações do chamado */}
        <div className={styles.requestInfoPanel}>
          <div className={styles.requestInfoHeader}>
            <span className={styles.requestInfoTitle}>📋 Informações do Chamado</span>
            <span className={`${styles.tipoBadge} ${selectedRequest.tipoChamado === 'Emergenciais' ? styles.tipoBadgeEmergencial : ''}`}>
              {selectedRequest.tipoChamado}
            </span>
          </div>
          <div className={styles.requestInfoGrid}>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Chamado</span>
              <span className={styles.requestInfoValue} style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                #{String(selectedRequest.id).padStart(3, '0')}
              </span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Cliente</span>
              <span className={styles.requestInfoValue}>{selectedRequest.client.name}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Categoria</span>
              <span className={styles.requestInfoValue}>{selectedRequest.categoria}</span>
            </div>
            {selectedRequest.subItem && (
              <div className={styles.requestInfoItem}>
                <span className={styles.requestInfoLabel}>Sub-item</span>
                <span className={styles.requestInfoValue}>{selectedRequest.subItem}</span>
              </div>
            )}
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Solicitante</span>
              <span className={styles.requestInfoValue}>{selectedRequest.openedBy || '—'}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Data/Hora Abertura</span>
              <span className={styles.requestInfoValue}>{formatDateTime(selectedRequest.createdAt)}</span>
            </div>
            <div className={`${styles.requestInfoItem} ${styles.requestInfoFull}`}>
              <span className={styles.requestInfoLabel}>Descritivo</span>
              <span className={styles.requestInfoValue}>{selectedRequest.description}</span>
            </div>
            {selectedRequest.observacao && (
              <div className={`${styles.requestInfoItem} ${styles.requestInfoFull}`}>
                <span className={styles.requestInfoLabel}>Observações</span>
                <span className={styles.requestInfoValue}>{selectedRequest.observacao}</span>
              </div>
            )}
          </div>
        </div>

        {/* Formulário de Classificação */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>

              {/* Nível de Criticidade */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="nivelCriticidade">
                  Nível de Criticidade <span className={styles.required}>*</span>
                </label>
                <select
                  id="nivelCriticidade"
                  value={nivelCriticidade}
                  onChange={(e) => {
                    setNivelCriticidade(e.target.value);
                    setPrazoSlaManual('');
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">-- Selecione o nível --</option>
                  {niveisDisponiveis.map((n) => (
                    <option key={n} value={n}>
                      {NIVEIS[n as keyof typeof NIVEIS].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card explicativo do nível selecionado */}
              {nivelInfo && (
                <div
                  className={`${styles.nivelCard} ${styles.fullWidth}`}
                  style={{ borderLeftColor: nivelInfo.color, backgroundColor: nivelInfo.bg }}
                >
                  <div className={styles.nivelCardHeader} style={{ color: nivelInfo.color }}>
                    ⏱ SLA: {nivelInfo.sla}
                  </div>
                  <p className={styles.nivelCardDesc}>{nivelInfo.descricao}</p>
                  <p className={styles.nivelCardExemplos}>{nivelInfo.exemplos}</p>
                  {nivelInfo.obs && (
                    <p className={styles.nivelCardObs}>⚠️ {nivelInfo.obs}</p>
                  )}
                </div>
              )}

              {/* Prazo Final (SLA) */}
              {nivelCriticidade && nivelCriticidade !== '4' && dataCalculada && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Prazo Final de Atendimento (SLA - calculado)</label>
                  <input
                    type="text"
                    value={formatDateTimeCalc(dataCalculada)}
                    className={`${styles.readonlyField} ${styles.dataAtendimentoCalc}`}
                    readOnly
                    disabled
                  />
                </div>
              )}

              {nivelCriticidade === '4' && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label htmlFor="prazoSla">Prazo Limite de Atendimento (SLA) <span className={styles.required}>*</span></label>
                  <input
                    type="datetime-local"
                    id="prazoSla"
                    value={prazoSlaManual}
                    onChange={(e) => setPrazoSlaManual(e.target.value)}
                    required
                    disabled={loading}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              {/* Classificado por */}
              <div className={styles.formGroup}>
                <label>Classificado por</label>
                <input
                  type="text"
                  value={sessionUser.name}
                  className={styles.readonlyField}
                  readOnly
                  disabled
                />
              </div>

              {/* Data/Hora da classificação */}
              <div className={styles.formGroup}>
                <label>Data/Hora da Classificação</label>
                <input
                  type="text"
                  value={formatDateTimeCalc(new Date())}
                  className={styles.readonlyField}
                  readOnly
                  disabled
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
                disabled={loading || !nivelCriticidade}
              >
                {loading ? 'Classificando...' : '✓ Confirmar Classificação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ------ LIST VIEW ------
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Classificação do Chamado</h1>
          <p>
            {isAdmin
              ? 'Chamados pendentes aguardando classificação de criticidade e data de atendimento.'
              : 'Somente a equipe TecCosta pode classificar chamados.'}
          </p>
        </div>
        <div className={styles.pendingCounter}>
          <span className={styles.pendingCounterNumber}>{requests.length}</span>
          <span className={styles.pendingCounterLabel}>Pendente{requests.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {!isAdmin && (
        <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>
          ⚠️ Você não possui permissão para classificar chamados. Apenas administradores e a equipe de gestão TecCosta podem realizar esta ação.
        </div>
      )}

      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar chamados pendentes por número, cliente, categoria..."
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
          <span className={styles.emptyStateIcon}>🎉</span>
          <h3>{requests.length === 0 ? 'Nenhum chamado pendente!' : 'Nenhum chamado encontrado'}</h3>
          <p>
            {requests.length === 0
              ? 'Todos os chamados já foram classificados. Ótimo trabalho!'
              : 'Tente ajustar os termos da pesquisa.'}
          </p>
        </div>
      ) : (
        <>
          <div className={`${styles.tableContainer} glass`}>
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
                        {isAdmin ? (
                          <button
                            className={styles.btnClassificar}
                            onClick={() => handleClassificarClick(req)}
                          >
                            🗂️ Classificar
                          </button>
                        ) : (
                          <span className={styles.unassigned}>—</span>
                        )}
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
