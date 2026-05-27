'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { updateRequestStatusAction, getAllRequestsAction } from '@/app/actions/requests';

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
  status: string;
  createdAt: string;
  client: SerializedClient;
  technician: SerializedTechnician | null;
}

interface AcompanhamentoClientProps {
  initialRequests: SerializedRequest[];
  technicians: { id: string; name: string }[];
  sessionUser: { id: string; name: string; role: string };
}

const NIVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'N1 – Emergencial', color: '#dc2626', bg: '#fee2e2' },
  '2': { label: 'N2 – Urgente',     color: '#d97706', bg: '#fef3c7' },
  '3': { label: 'N3 – Programado',  color: '#0369a1', bg: '#e0f2fe' },
  '4': { label: 'N4 – Agendado',    color: '#7c3aed', bg: '#ede9fe' },
};

const STATUS_OPTIONS = [
  { value: 'PENDENTE',     label: 'Aberto – Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Aberto – Em Andamento' },
  { value: 'CONCLUIDO',    label: 'Fechado – Concluído' },
  { value: 'CANCELADO',    label: 'Fechado – Cancelado' },
];

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

function getPrazoFinal(req: SerializedRequest): string | null {
  if (!req.classifiedAt || !req.nivelCriticidade) return null;
  const classifiedDate = new Date(req.classifiedAt);
  if (req.nivelCriticidade === '1') {
    return new Date(classifiedDate.getTime() + 4 * 60 * 60 * 1000).toISOString();
  }
  if (req.nivelCriticidade === '2') {
    return new Date(classifiedDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  if (req.nivelCriticidade === '3') {
    return new Date(classifiedDate.getTime() + 72 * 60 * 60 * 1000).toISOString();
  }
  if (req.nivelCriticidade === '4') {
    return req.dataAtendimento;
  }
  return null;
}

function toInputDateTimeValue(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isClosed(status: string) {
  return status === 'CONCLUIDO' || status === 'CANCELADO';
}

export default function AcompanhamentoClient({
  initialRequests,
  technicians,
  sessionUser,
}: AcompanhamentoClientProps) {
  const [requests, setRequests] = useState<SerializedRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'abertos' | 'fechados'>('todos');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRequest, setEditingRequest] = useState<SerializedRequest | null>(null);

  // Form state
  const [formStatus, setFormStatus] = useState('');
  const [formDataAtendimento, setFormDataAtendimento] = useState('');
  const [formTechnicianId, setFormTechnicianId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = sessionUser.role === 'ADMINISTRADOR' || sessionUser.role === 'TECCOSTA_GESTAO';

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

    const matchStatus =
      filterStatus === 'todos' ? true :
      filterStatus === 'abertos' ? !isClosed(r.status) :
      isClosed(r.status);

    return matchQuery && matchStatus;
  });

  // Counters
  const totalAbertos = requests.filter((r) => !isClosed(r.status)).length;
  const totalFechados = requests.filter((r) => isClosed(r.status)).length;

  const handleEditClick = (req: SerializedRequest) => {
    setEditingRequest(req);
    setFormStatus(req.status);
    setFormDataAtendimento(toInputDateTimeValue(req.dataAtendimento));
    setFormTechnicianId(req.technician?.id || '');
    setError(null);
    setSuccess(null);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setEditingRequest(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('status', formStatus);
      formData.append('dataAtendimento', formDataAtendimento);
      formData.append('technicianId', formTechnicianId);

      const result = await updateRequestStatusAction(editingRequest.id, formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess('Chamado atualizado com sucesso!');
        // Recarregar lista
        const updated = await getAllRequestsAction();
        if (updated.requests) {
          setRequests(updated.requests as unknown as SerializedRequest[]);
        }
        setTimeout(() => handleCloseForm(), 1500);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar o chamado.');
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE':     return 'Aberto – Pendente';
      case 'EM_ANDAMENTO': return 'Aberto – Em Andamento';
      case 'CONCLUIDO':    return 'Fechado – Concluído';
      case 'CANCELADO':    return 'Fechado – Cancelado';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDENTE':     return styles.statusPending;
      case 'EM_ANDAMENTO': return styles.statusInProgress;
      case 'CONCLUIDO':    return styles.statusCompleted;
      case 'CANCELADO':    return styles.statusCancelled;
      default: return '';
    }
  };

  // ---- FORM VIEW ----
  if (view === 'form' && editingRequest) {
    return (
      <div className={styles.pageContainer}>
        <button className={styles.backBtn} onClick={handleCloseForm}>
          ← Voltar para a lista
        </button>

        <div className={styles.pageHeader}>
          <div>
            <h1>Agendar Chamado #{String(editingRequest.id).padStart(3, '0')}</h1>
            <p>Atualize o status, data/hora de agendamento e técnico responsável.</p>
          </div>
        </div>

        {error && <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>⚠️ {error}</div>}
        {success && <div className={`${styles.feedbackMessage} ${styles.feedbackSuccess}`}>✓ {success}</div>}

        {/* Painel informativo */}
        <div className={styles.requestInfoPanel}>
          <div className={styles.requestInfoHeader}>
            <span className={styles.requestInfoTitle}>📋 Informações do Chamado</span>
            <span className={`${styles.tipoBadge} ${editingRequest.tipoChamado === 'Emergenciais' ? styles.tipoBadgeEmergencial : ''}`}>
              {editingRequest.tipoChamado}
            </span>
          </div>
          <div className={styles.requestInfoGrid}>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Chamado</span>
              <span className={styles.requestInfoValue} style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                #{String(editingRequest.id).padStart(3, '0')}
              </span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Cliente</span>
              <span className={styles.requestInfoValue}>{editingRequest.client.name}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Categoria</span>
              <span className={styles.requestInfoValue}>{editingRequest.categoria}{editingRequest.subItem ? ` – ${editingRequest.subItem}` : ''}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Solicitante</span>
              <span className={styles.requestInfoValue}>{editingRequest.openedBy || '—'}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Abertura</span>
              <span className={styles.requestInfoValue}>{formatDateTime(editingRequest.createdAt)}</span>
            </div>
            <div className={styles.requestInfoItem}>
              <span className={styles.requestInfoLabel}>Nível</span>
              <span className={styles.requestInfoValue}>
                {editingRequest.nivelCriticidade
                  ? NIVEL_LABELS[editingRequest.nivelCriticidade]?.label || `N${editingRequest.nivelCriticidade}`
                  : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Não classificado</span>}
              </span>
            </div>
            <div className={`${styles.requestInfoItem} ${styles.requestInfoFull}`}>
              <span className={styles.requestInfoLabel}>Descritivo</span>
              <span className={styles.requestInfoValue}>{editingRequest.description}</span>
            </div>
          </div>
        </div>

        {/* Formulário de atualização */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="status">Status do Chamado <span className={styles.required}>*</span></label>
                <select
                  id="status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  required
                  disabled={loading}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Prazo Final (SLA)</label>
                <input
                  type="text"
                  value={formatDateTime(editingRequest.prazoSla)}
                  className={styles.readonlyField}
                  readOnly
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dataAtendimento">Data e Hora de Agendamento</label>
                <input
                  type="datetime-local"
                  id="dataAtendimento"
                  value={formDataAtendimento}
                  onChange={(e) => setFormDataAtendimento(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="technicianId">Técnico Responsável</label>
                <select
                  id="technicianId"
                  value={formTechnicianId}
                  onChange={(e) => setFormTechnicianId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">— Sem técnico atribuído —</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={handleCloseForm} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? 'Salvando...' : '✓ Salvar Atualização'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Agendamento do chamado</h1>
          <p>Agende e gerencie os atendimentos dos chamados classificados.</p>
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
            placeholder="Pesquisar por número, cliente, categoria, técnico..."
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
                <th>Solicitante</th>
                <th>Cliente</th>
                <th>Tipo / Nível</th>
                <th>Categoria</th>
                <th>Data Abertura</th>
                <th>Prazo Final (SLA)</th>
                <th>Data Agendada</th>
                <th>Técnico</th>
                <th>Status</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const nivel = req.nivelCriticidade ? NIVEL_LABELS[req.nivelCriticidade] : null;
                const prazoFinal = req.prazoSla;
                return (
                  <tr key={req.id} className={styles.rowHover}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                        #{String(req.id).padStart(3, '0')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.description}>
                        {req.description}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                      {req.openedBy || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>}
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
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Não atribuído</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className={styles.btnEdit} onClick={() => handleEditClick(req)}>
                          ✏️ Atualizar
                        </button>
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
