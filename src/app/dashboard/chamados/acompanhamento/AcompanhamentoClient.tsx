'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { updateRequestStatusAction, getAllRequestsAction } from '@/app/actions/requests';

interface SerializedClient { id: string; name: string; }
interface SerializedTechnician { id: string; name: string; }

interface SerializedSchedulingHistory {
  id: string;
  requestId: number;
  scheduledDate: string;
  technicianId: string;
  technicianName: string;
  changedBy: string;
  createdAt: string;
}

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
  schedulings?: SerializedSchedulingHistory[];
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
  const [filterClient, setFilterClient] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const PAGE_SIZE = 4;
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRequest, setEditingRequest] = useState<SerializedRequest | null>(null);
  const [historyRequest, setHistoryRequest] = useState<SerializedRequest | null>(null);

  // Form state
  const [formStatus, setFormStatus] = useState('');
  const [formDataAtendimento, setFormDataAtendimento] = useState('');
  const [formTechnicianId, setFormTechnicianId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    const matchClient = filterClient === '' || r.client.id === filterClient;
    const matchTechnician = filterTechnician === '' ||
      (filterTechnician === '__none__' ? !r.technician : r.technician?.id === filterTechnician);
    const matchDate = filterDate === '' || (r.dataAtendimento && getLocalDateString(r.dataAtendimento) === filterDate);

    const isClassified = r.nivelCriticidade !== null;

    return isClassified && matchQuery && matchStatus && matchClient && matchTechnician && matchDate;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setCurrentPage(1);
  };

  // Counters
  const totalAbertos = requests.filter((r) => r.nivelCriticidade !== null && !isClosed(r.status)).length;
  const totalFechados = requests.filter((r) => r.nivelCriticidade !== null && isClosed(r.status)).length;

  const handleEditClick = (req: SerializedRequest) => {
    if (isClosed(req.status)) return;
    setEditingRequest(req);
    setFormStatus(req.status);
    setFormDataAtendimento(req.dataAtendimento ? req.dataAtendimento.slice(0, 16) : '');
    setFormTechnicianId(req.technician?.id || '');
    setError(null);
    setSuccess(null);
    setLoading(false);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setEditingRequest(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validação de técnico e data obrigatórios para qualquer status diferente de CANCELADO
    if (formStatus !== 'CANCELADO') {
      if (!formDataAtendimento) {
        setError('Por favor, informe a data e hora do agendamento.');
        setLoading(false);
        return;
      }
      if (!formTechnicianId) {
        setError('Por favor, selecione um técnico responsável. O técnico é obrigatório.');
        setLoading(false);
        return;
      }

      // Validar horário comercial diretamente a partir do texto do input (das 08:00 às 18:00)
      const hourPart = formDataAtendimento.split('T')[1];
      if (hourPart) {
        const hour = parseInt(hourPart.split(':')[0], 10);
        if (hour < 8 || hour >= 18) {
          setError('O horário do agendamento deve ser comercial, das 08:00 às 18:00.');
          setLoading(false);
          return;
        }
      }
    }

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
        setLoading(false); // Reseta loading imediatamente no sucesso
        
        // Recarregar lista
        try {
          const updated = await getAllRequestsAction();
          if (updated?.requests) {
            setRequests(updated.requests as unknown as SerializedRequest[]);
          }
        } catch (fetchErr) {
          console.error(fetchErr);
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

        {/* Histórico de Agendamentos */}
        {editingRequest.schedulings && editingRequest.schedulings.length > 0 && (
          <div className={styles.requestInfoPanel} style={{ marginTop: '-12px', marginBottom: '24px', borderTop: 'none' }}>
            <div className={styles.requestInfoHeader} style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <span className={styles.requestInfoTitle} style={{ color: '#d97706' }}>⏳ Histórico de Agendamentos ({editingRequest.schedulings.length})</span>
            </div>
            <div style={{ padding: '16px 24px', maxHeight: '200px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    <th style={{ padding: '6px 0' }}>Data Agendada</th>
                    <th style={{ padding: '6px 0' }}>Técnico Atribuído</th>
                    <th style={{ padding: '6px 0' }}>Alterado por</th>
                    <th style={{ padding: '6px 0' }}>Data de Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {editingRequest.schedulings.map((hist) => (
                    <tr key={hist.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--primary-color)' }}>{formatDateTime(hist.scheduledDate)}</td>
                      <td style={{ padding: '8px 0', fontWeight: 500 }}>{hist.technicianName}</td>
                      <td style={{ padding: '8px 0', color: '#475569' }}>{hist.changedBy}</td>
                      <td style={{ padding: '8px 0', color: '#64748b' }}>{formatDateTime(hist.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                <label htmlFor="dataAtendimento">Data e Hora de Agendamento {formStatus !== 'CANCELADO' && <span className={styles.required}>*</span>}</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="date"
                    value={formDataAtendimento ? formDataAtendimento.split('T')[0] || '' : ''}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const currentTime = formDataAtendimento ? formDataAtendimento.split('T')[1] || '08:00' : '08:00';
                      setFormDataAtendimento(`${newDate}T${currentTime}`);
                    }}
                    disabled={loading}
                    required={formStatus !== 'CANCELADO'}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                    title="Selecionar data do agendamento"
                  />
                  <input
                    type="time"
                    min="08:00"
                    max="18:00"
                    value={formDataAtendimento ? formDataAtendimento.split('T')[1] || '' : ''}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      const currentDate = formDataAtendimento ? formDataAtendimento.split('T')[0] || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                      setFormDataAtendimento(`${currentDate}T${newTime}`);
                    }}
                    disabled={loading}
                    required={formStatus !== 'CANCELADO'}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                    title="Selecionar hora comercial do agendamento (08:00 às 18:00)"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="technicianId">Técnico Responsável {formStatus !== 'CANCELADO' && <span className={styles.required}>*</span>}</label>
                <select
                  id="technicianId"
                  value={formTechnicianId}
                  onChange={(e) => setFormTechnicianId(e.target.value)}
                  disabled={loading}
                  required={formStatus !== 'CANCELADO'}
                >
                  <option value="" disabled>-- Selecione o Técnico --</option>
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
                  {isAdmin && <th>Ações</th>}
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => handleEditClick(req)}
                              disabled={isClosed(req.status)}
                              title={isClosed(req.status) ? "Chamados concluídos ou cancelados não podem ser agendados/reagendados" : undefined}
                            >
                              {req.dataAtendimento ? '🔄 Reagendar' : '📅 Agendar'}
                            </button>
                            <button
                              className={styles.btnHistory}
                              onClick={() => setHistoryRequest(req)}
                              disabled={!req.schedulings || req.schedulings.length === 0}
                              title={(!req.schedulings || req.schedulings.length === 0)
                                ? "Não há histórico de agendamentos para este chamado"
                                : "Visualizar histórico de reagendamentos"
                              }
                            >
                              ⏳ Histórico ({req.schedulings?.length || 0})
                            </button>
                          </div>
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
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  title="Primeira página"
                >«</button>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >‹ Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >{p}</button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >Próximo ›</button>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  title="Última página"
                >»</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Janela Modal de Histórico de Reagendamentos */}
      {historyRequest && (
        <div className={styles.historyModalOverlay} onClick={() => setHistoryRequest(null)}>
          <div className={styles.historyModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyModalHeader}>
              <div>
                <h3>⏳ Histórico de Agendamento – Chamado #{String(historyRequest.id).padStart(3, '0')}</h3>
                <p>Todos os registros de agendamento e reagendamento salvos.</p>
              </div>
              <button className={styles.closeModalBtn} onClick={() => setHistoryRequest(null)} title="Fechar Modal">
                &times;
              </button>
            </div>
            <div className={styles.historyModalBody}>
              <div className={styles.historyTableContainer}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Data Agendada</th>
                      <th>Técnico Atribuído</th>
                      <th>Alterado por</th>
                      <th>Data de Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRequest.schedulings?.map((hist) => (
                      <tr key={hist.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                          {formatDateTime(hist.scheduledDate)}
                        </td>
                        <td>{hist.technicianName}</td>
                        <td style={{ color: '#475569' }}>{hist.changedBy}</td>
                        <td style={{ color: '#64748b' }}>{formatDateTime(hist.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.historyModalFooter}>
              <button className={styles.btnHistoryClose} onClick={() => setHistoryRequest(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
