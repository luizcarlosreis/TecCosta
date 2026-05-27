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

  // Campos do formulário de classificação
  const [nivelCriticidade, setNivelCriticidade] = useState('');
  const [dataAtendimentoManual, setDataAtendimentoManual] = useState('');

  // Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lista local (remove chamado classificado sem reload)
  const [requests, setRequests] = useState<SerializedRequest[]>(pendingRequests);

  const isAdmin = sessionUser.role === 'ADMINISTRADOR' || sessionUser.role === 'TECCOSTA_GESTAO';

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      String(r.id).includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.client.name.toLowerCase().includes(q) ||
      r.tipoChamado.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q) ||
      (r.openedBy && r.openedBy.toLowerCase().includes(q))
    );
  });

  const handleClassificarClick = (req: SerializedRequest) => {
    setSelectedRequest(req);
    // Pré-selecionar o primeiro nível disponível para o tipo
    const niveisDisponiveis = getNiveisDisponiveis(req.tipoChamado);
    setNivelCriticidade(niveisDisponiveis[0] || '');
    setDataAtendimentoManual('');
    setError(null);
    setSuccess(null);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setSelectedRequest(null);
    setError(null);
    setSuccess(null);
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

      const result = await classifyRequestAction(selectedRequest.id, formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(`Chamado #${String(selectedRequest.id).padStart(3, '0')} classificado com sucesso como ${NIVEIS[nivelCriticidade as keyof typeof NIVEIS]?.label}!`);
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
                    setDataAtendimentoManual('');
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
              {nivelCriticidade && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Prazo Final de Atendimento (SLA)</label>
                  <input
                    type="text"
                    value={nivelCriticidade === '4' ? 'A definir (definido durante o agendamento)' : dataCalculada ? formatDateTimeCalc(dataCalculada) : '—'}
                    className={`${styles.readonlyField} ${nivelCriticidade !== '4' ? styles.dataAtendimentoCalc : ''}`}
                    readOnly
                    disabled
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
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
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
              {filteredRequests.map((req) => {
                const nivel = req.nivelCriticidade ? NIVEL_LABELS[req.nivelCriticidade] : null;
                const prazoFinal = getPrazoFinal(req);
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
      )}
    </div>
  );
}
