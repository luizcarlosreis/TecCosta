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

    return matchQuery && matchStatus;
  });

  // Contadores
  const totalAbertos = requests.filter((r) => r.status !== 'CONCLUIDO' && r.status !== 'CANCELADO').length;
  const totalFechados = requests.filter((r) => r.status === 'CONCLUIDO' || r.status === 'CANCELADO').length;

  const handleFinalizeClick = (req: SerializedRequest) => {
    setSelectedRequest(req);
    setFinishedAtInput(getCurrentDateTimeLocal());
    setFinalObservacao('');
    setError(null);
    setSuccess(null);
    setView('finalize');
  };

  const handleCloseFinalize = () => {
    setView('list');
    setSelectedRequest(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmitFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

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
                <input
                  type="datetime-local"
                  id="finishedAt"
                  value={finishedAtInput}
                  onChange={(e) => setFinishedAtInput(e.target.value)}
                  required
                  disabled={loading}
                />
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.statusFilterGroup}>
          {(['todos', 'abertos', 'fechados'] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filterStatus === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus(f)}
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
        <div className={`${styles.tableContainer} glass`}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Cliente</th>
                <th>Tipo / Categoria</th>
                <th>Abertura</th>
                <th>Técnico</th>
                <th>Status Chamado</th>
                <th>Status Atendimento</th>
                {canFinalize && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const ticketSt = getTicketStatus(req);
                const serviceSt = getAtendimentoStatus(req);
                const isScheduled = ticketSt.label === 'Agendado';

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
                      <span className={styles.clientText}>{req.client.name}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${req.tipoChamado === 'Emergenciais' ? styles.typeBadgeEmergencial : styles.typeBadge}`}>
                        {req.tipoChamado}
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <span className={styles.categoryLabel}>{req.categoria}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.dateText}>{formatDateTime(req.createdAt)}</span>
                    </td>
                    <td>
                      {req.technician ? (
                        <span className={styles.technicianName}>{req.technician.name}</span>
                      ) : (
                        <span className={styles.unassigned}>Não atribuído</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusLabel} ${ticketSt.class}`}>
                        {ticketSt.label}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusLabel} ${serviceSt.class}`}>
                        {serviceSt.label}
                      </span>
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
      )}
    </div>
  );
}
