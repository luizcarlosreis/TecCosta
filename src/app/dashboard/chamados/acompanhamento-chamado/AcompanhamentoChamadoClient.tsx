'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { finalizeRequestAction } from '@/app/actions/requests';

interface SerializedClient { id: string; name: string; }
interface SerializedTechnician { id: string; name: string; }

interface SerializedRequest {
  id: number;
  description: string;
  tipoChamado: string;
  categoria: string;
  subItem: string | null;
  observacao: string | null;
  openedBy: string | null;
  nivelCriticidade: string | null;
  classifiedBy: string | null;
  classifiedAt: string | null;
  prazoSla: string | null;
  dataAtendimento: string | null;
  finishedAt: string | null;
  finishedBy: string | null;
  finalObservacao: string | null;
  status: string;
  createdAt: string;
  client: SerializedClient;
  technician: SerializedTechnician | null;
}

interface AcompanhamentoChamadoClientProps {
  initialRequests: SerializedRequest[];
  sessionUser: { id: string; name: string; role: string };
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

const NIVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'N1 – Emergencial', color: '#dc2626', bg: '#fee2e2' },
  '2': { label: 'N2 – Urgente',     color: '#d97706', bg: '#fef3c7' },
  '3': { label: 'N3 – Programado',  color: '#0369a1', bg: '#e0f2fe' },
  '4': { label: 'N4 – Agendado',    color: '#7c3aed', bg: '#ede9fe' },
};

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00'
];

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

function getCurrentDateTimeLocal(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AcompanhamentoChamadoClient({
  initialRequests,
  sessionUser,
}: AcompanhamentoChamadoClientProps) {
  const [requests, setRequests] = useState<SerializedRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'abertos' | 'fechados'>('todos');
  const [filterClient, setFilterClient] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const PAGE_SIZE = 4;
  const [view, setView] = useState<'list' | 'finalize'>('list');
  const [selectedRequest, setSelectedRequest] = useState<SerializedRequest | null>(null);

  // Form states
  const [finishedAtInput, setFinishedAtInput] = useState('');
  const [finalObservacao, setFinalObservacao] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canFinalize = sessionUser.role === 'ADMINISTRADOR' || 
                      sessionUser.role === 'TECCOSTA_GESTAO' || 
                      sessionUser.role === 'TECNICO';

  // Helpers de classificação de status conforme regras do negócio
  const getTicketStatus = (req: SerializedRequest) => {
    if (req.status === 'CONCLUIDO' || req.status === 'CANCELADO') {
      return { label: 'Fechado', class: styles.statusClosed };
    }
    if (req.nivelCriticidade === null) {
      return { label: 'Aberto/Pendente de Classificação', class: styles.statusUnclassified };
    }
    if (req.technician === null) {
      return { label: 'Classificado/Pendente de Agendamento', class: styles.statusUnscheduled };
    }
    return { label: 'Agendado', class: styles.statusScheduled };
  };

  const getAtendimentoStatus = (req: SerializedRequest) => {
    if (req.status === 'CONCLUIDO' || req.status === 'CANCELADO') {
      return { label: 'Finalizado', class: styles.serviceFinished };
    }
    const ticketStatus = getTicketStatus(req).label;
    if (ticketStatus === 'Aberto/Pendente de Classificação' || ticketStatus === 'Classificado/Pendente de Agendamento') {
      return { label: 'Em aberto', class: styles.serviceOpen };
    }
    return { label: 'Em atendimento', class: styles.serviceInProgress };
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

  // Filtragem e busca
  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      String(r.id).includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.client.name.toLowerCase().includes(q) ||
      r.tipoChamado.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q) ||
      (r.openedBy && r.openedBy.toLowerCase().includes(q)) ||
      (r.technician && r.technician.name.toLowerCase().includes(q));

    const isClosed = r.status === 'CONCLUIDO' || r.status === 'CANCELADO';
    const matchStatus =
      filterStatus === 'todos' ? true :
      filterStatus === 'abertos' ? !isClosed :
      isClosed;

    const matchClient = filterClient === '' || r.client.id === filterClient;
    const matchTechnician = filterTechnician === '' ||
      (filterTechnician === '__none__' ? !r.technician : r.technician?.id === filterTechnician);
    const matchDate = filterDate === '' || (r.dataAtendimento && getLocalDateString(r.dataAtendimento) === filterDate);

    return matchQuery && matchStatus && matchClient && matchTechnician && matchDate;
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

  // Contadores
  const totalAbertos = requests.filter((r) => r.status !== 'CONCLUIDO' && r.status !== 'CANCELADO').length;
  const totalFechados = requests.filter((r) => r.status === 'CONCLUIDO' || r.status === 'CANCELADO').length;

  const handleFinalizeClick = (req: SerializedRequest) => {
    setSelectedRequest(req);
    setFinishedAtInput(getCurrentDateTimeLocal());
    setFinalObservacao('');
    setError(null);
    setSuccess(null);
    setLoading(false);
    setView('finalize');
  };

  const handleCloseFinalize = () => {
    setView('list');
    setSelectedRequest(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleSubmitFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validar horário comercial diretamente a partir do texto do input (das 08:00 às 18:00)
    const hourPart = finishedAtInput.split('T')[1];
    if (hourPart) {
      const hour = parseInt(hourPart.split(':')[0], 10);
      if (hour < 8 || hour >= 18) {
        setError('O horário do atendimento real deve ser comercial, das 08:00 às 18:00.');
        setLoading(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('finishedAt', finishedAtInput);
      formData.append('finalObservacao', finalObservacao);

      const result = await finalizeRequestAction(selectedRequest.id, formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess('Chamado finalizado com sucesso!');
        setLoading(false); // Reseta loading imediatamente no sucesso
        
        // Atualiza a lista local de chamados
        const updatedRequests = requests.map(r => {
          if (r.id === selectedRequest.id) {
            return {
              ...r,
              status: 'CONCLUIDO',
              finishedAt: new Date(finishedAtInput).toISOString(),
              finishedBy: sessionUser.name,
              finalObservacao: finalObservacao || null
            };
          }
          return r;
        });
        setRequests(updatedRequests);
        
        setTimeout(() => handleCloseFinalize(), 1500);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao finalizar o chamado.');
      setLoading(false);
    }
  };

  // ---- VIEW FINALIZAR CHAMADO ----
  if (view === 'finalize' && selectedRequest) {
    return (
      <div className={styles.pageContainer}>
        <button className={styles.backBtn} onClick={handleCloseFinalize}>
          ← Voltar para a lista
        </button>

        <div className={styles.pageHeader}>
          <div>
            <h1>Finalizar Chamado #{String(selectedRequest.id).padStart(3, '0')}</h1>
            <p>Registre a conclusão dos serviços e o horário de atendimento real.</p>
          </div>
        </div>

        {error && <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>⚠️ {error}</div>}
        {success && <div className={`${styles.feedbackMessage} ${styles.feedbackSuccess}`}>✓ {success}</div>}

        {/* Resumo do Chamado */}
        <div className={styles.requestInfoPanel}>
          <div className={styles.requestInfoHeader}>
            <span className={styles.requestInfoTitle}>📋 Resumo do Chamado</span>
            <span className={`${styles.tipoBadge} ${selectedRequest.tipoChamado === 'Emergenciais' ? styles.tipoBadgeEmergencial : ''}`}>
              {selectedRequest.tipoChamado}
            </span>
          </div>
          <div className={styles.requestInfoGrid}>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Cliente</span>
              <span className={styles.requestInfoValue}>{selectedRequest.client.name}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Categoria</span>
              <span className={styles.requestInfoValue}>{selectedRequest.categoria}{selectedRequest.subItem ? ` – ${selectedRequest.subItem}` : ''}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Técnico Responsável</span>
              <span className={styles.requestInfoValue} style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                {selectedRequest.technician?.name || '—'}
              </span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Data Abertura</span>
              <span className={styles.requestInfoValue}>{formatDateTime(selectedRequest.createdAt)}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Data Agendada</span>
              <span className={styles.requestInfoValue}>{formatDateTime(selectedRequest.dataAtendimento)}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Abertura por</span>
              <span className={styles.requestInfoValue}>{selectedRequest.openedBy || '—'}</span>
            </div>
            <div className={`${styles.requestInfoItem} ${styles.requestInfoFull}`}>
              <span className={styles.requestInfoLabel}>Descritivo da Solicitação</span>
              <span className={styles.requestInfoValue}>{selectedRequest.description}</span>
            </div>
          </div>
        </div>

        {/* Formulário de Encerramento */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmitFinalize}>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="finishedAt">Data e Hora do Atendimento Real <span className={styles.required}>*</span></label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="date"
                    required
                    value={finishedAtInput ? finishedAtInput.split('T')[0] || '' : ''}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const currentTime = finishedAtInput ? finishedAtInput.split('T')[1] || '08:00' : '08:00';
                      setFinishedAtInput(`${newDate}T${currentTime}`);
                    }}
                    disabled={loading}
                    max={new Date().toISOString().split('T')[0]}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                    title="Selecionar data do atendimento real"
                  />
                  <select
                    required
                    value={finishedAtInput ? finishedAtInput.split('T')[1] || '' : ''}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      const currentDate = finishedAtInput ? finishedAtInput.split('T')[0] || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                      setFinishedAtInput(`${currentDate}T${newTime}`);
                    }}
                    disabled={loading}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', backgroundColor: '#fff' }}
                    title="Selecionar hora comercial do atendimento real (08:00 às 18:00)"
                  >
                    <option value="">-- Hora --</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="finalObservacao">Observações de Encerramento / Laudo Técnico</label>
                <textarea
                  id="finalObservacao"
                  rows={4}
                  placeholder="Descreva brevemente o serviço realizado e peças trocadas (se houver)..."
                  value={finalObservacao}
                  onChange={(e) => setFinalObservacao(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={handleCloseFinalize} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? 'Finalizando...' : '🏁 Confirmar Encerramento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- VIEW LISTA DE ACOMPANHAMENTO ----
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Acompanhamento de chamado</h1>
          <p>Acompanhe em tempo real o status operacional e de atendimento de todos os chamados.</p>
        </div>
        <div className={styles.countersRow}>
          <div className={styles.counterCard} style={{ borderColor: '#f59e0b', background: '#fef3c7' }}>
            <span className={styles.counterNumber} style={{ color: '#d97706' }}>{totalAbertos}</span>
            <span className={styles.counterLabel} style={{ color: '#92400e' }}>Abertos</span>
          </div>
          <div className={styles.counterCard} style={{ borderColor: '#22c55e', background: '#dcfce7' }}>
            <span className={styles.counterNumber} style={{ color: '#15803d' }}>{totalFechados}</span>
            <span className={styles.counterLabel} style={{ color: '#166534' }}>Fechados</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersRow}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar por número, cliente, técnico, status..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.selectFilterGroup} style={{ alignItems: 'center' }}>
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
        <div className={styles.statusFilterGroup}>
          {(['todos', 'abertos', 'fechados'] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filterStatus === f ? styles.filterBtnActive : ''}`}
              onClick={() => handleFilterChange(() => setFilterStatus(f))}
            >
              {f === 'todos' ? '📋 Todos' : f === 'abertos' ? '🟡 Abertos' : '✅ Fechados'}
            </button>
          ))}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>📭</span>
          <h3>Nenhum chamado encontrado</h3>
          <p>Tente ajustar os filtros ou termos da pesquisa.</p>
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
                  {canFinalize && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req) => {
                  const ticketSt = getTicketStatus(req);
                  const serviceSt = getAtendimentoStatus(req);
                  const isScheduled = ticketSt.label === 'Agendado';
                  const nivel = req.nivelCriticidade ? NIVEL_LABELS[req.nivelCriticidade] : null;
                  const prazoFinal = req.prazoSla;

                  return (
                    <tr key={req.id} className={styles.rowHover}>
                      <td>
                        <div className={styles.idBox}>
                          #{String(req.id).padStart(3, '0')}
                        </div>
                        <div className={styles.descTooltip} title={req.description}>
                          {req.description}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                          {req.openedBy || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>}
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
                        {req.subItem && <span className={styles.subItemLabel}>{req.subItem}</span>}
                      </td>
                      <td>
                        <span className={styles.dateText}>{formatDateTime(req.createdAt)}</span>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span className={`${styles.statusLabel} ${ticketSt.class}`}>
                            {ticketSt.label}
                          </span>
                          <span className={`${styles.statusLabel} ${serviceSt.class}`}>
                            {serviceSt.label}
                          </span>
                        </div>
                      </td>
                      {canFinalize && (
                        <td>
                          {isScheduled ? (
                            <button
                              className={styles.btnFinalize}
                              onClick={() => handleFinalizeClick(req)}
                            >
                              🏁 Finalizar
                            </button>
                          ) : req.status === 'CONCLUIDO' ? (
                            <div className={styles.closedInfoBox}>
                              <span className={styles.closedBy} title={`Finalizado por: ${req.finishedBy || '—'}`}>
                                Concluído
                              </span>
                              <div className={styles.closedDate}>
                                {formatDateTime(req.finishedAt)}
                              </div>
                              {req.finalObservacao && (
                                <div className={styles.closedNotes} title={req.finalObservacao}>
                                  📝 Laudo técnico
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={styles.actionBlock}>—</span>
                          )}
                        </td>
                      )}
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
