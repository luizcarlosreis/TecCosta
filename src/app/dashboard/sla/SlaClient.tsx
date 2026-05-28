'use client';

import { useState } from 'react';
import styles from './page.module.css';
import {
  createSlaConfigAction,
  updateSlaConfigAction,
  deleteSlaConfigAction,
} from '@/app/actions/sla';

interface SlaConfig {
  id: string;
  nivel: number;
  horasSla: number;
  horasSomadas: number;
  createdAt: string;
  updatedAt: string;
}

interface SlaClientProps {
  initialConfigs: SlaConfig[];
}

export default function SlaClient({ initialConfigs }: SlaClientProps) {
  const [configs, setConfigs] = useState<SlaConfig[]>(initialConfigs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View state: 'list' | 'form'
  const [view, setView] = useState<'list' | 'form'>('list');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedConfig, setSelectedConfig] = useState<SlaConfig | null>(null);

  // Form inputs
  const [nivelInput, setNivelInput] = useState('1');
  const [horasSlaInput, setHorasSlaInput] = useState('');
  const [horasSomadasInput, setHorasSomadasInput] = useState('');

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedConfig(null);
    setNivelInput('1');
    setHorasSlaInput('');
    setHorasSomadasInput('');
    setError(null);
    setSuccess(null);
    setView('form');
  };

  const handleOpenEdit = (config: SlaConfig) => {
    setModalMode('edit');
    setSelectedConfig(config);
    setNivelInput(String(config.nivel));
    setHorasSlaInput(String(config.horasSla));
    setHorasSomadasInput(String(config.horasSomadas));
    setError(null);
    setSuccess(null);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setSelectedConfig(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('nivel', nivelInput);
    formData.append('horasSla', horasSlaInput);
    formData.append('horasSomadas', horasSomadasInput);

    try {
      let result;
      if (modalMode === 'create') {
        result = await createSlaConfigAction(formData);
      } else if (selectedConfig) {
        result = await updateSlaConfigAction(selectedConfig.id, formData);
      }

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(
          modalMode === 'create'
            ? 'Regra de SLA cadastrada com sucesso!'
            : 'Regra de SLA atualizada com sucesso!'
        );
        
        // Atualizar estado local instantaneamente para evitar recarregamento
        const nivelNum = parseInt(nivelInput, 10);
        const horasSlaNum = parseInt(horasSlaInput, 10);
        const horasSomadasNum = parseInt(horasSomadasInput, 10);
        
        if (modalMode === 'create') {
          const newConfig: SlaConfig = {
            id: Math.random().toString(), // provisório
            nivel: nivelNum,
            horasSla: horasSlaNum,
            horasSomadas: horasSomadasNum,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setConfigs([...configs, newConfig].sort((a, b) => a.nivel - b.nivel));
        } else if (selectedConfig) {
          setConfigs(
            configs.map((c) =>
              c.id === selectedConfig.id
                ? { ...c, nivel: nivelNum, horasSla: horasSlaNum, horasSomadas: horasSomadasNum, updatedAt: new Date().toISOString() }
                : c
            ).sort((a, b) => a.nivel - b.nivel)
          );
        }

        setTimeout(() => {
          handleCloseForm();
        }, 1200);
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar a requisição.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nivel: number) => {
    if (!confirm(`Deseja realmente excluir a regra de SLA para o Nível ${nivel}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteSlaConfigAction(id);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(`Regra de SLA do Nível ${nivel} excluída com sucesso!`);
        setConfigs(configs.filter((c) => c.id !== id));
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Erro ao tentar excluir a regra de SLA.');
    } finally {
      setLoading(false);
    }
  };

  const getNivelLabel = (nivel: number) => {
    switch (nivel) {
      case 1: return { label: 'Nível 1 (Operacional)', class: styles.nivel1 };
      case 2: return { label: 'Nível 2 (Intermediário)', class: styles.nivel2 };
      case 3: return { label: 'Nível 3 (Programado)', class: styles.nivel3 };
      default: return { label: `Nível ${nivel}`, class: '' };
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
            <h1>{modalMode === 'create' ? 'Nova Regra de SLA' : `Editar Regra — Nível ${nivelInput}`}</h1>
            <p>
              {modalMode === 'create'
                ? 'Defina os critérios de prazos comerciais e corridos para o novo nível.'
                : 'Altere as horas do SLA contratual e do cálculo comercial.'}
            </p>
          </div>
        </div>

        {error && <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>⚠️ {error}</div>}
        {success && <div className={`${styles.feedbackMessage} ${styles.feedbackSuccess}`}>✓ {success}</div>}

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="nivel">Nível do Chamado <span className={styles.required}>*</span></label>
              <select
                id="nivel"
                value={nivelInput}
                onChange={(e) => setNivelInput(e.target.value)}
                disabled={modalMode === 'edit' || loading}
                required
              >
                <option value="1">Nível 1 (Operacional)</option>
                <option value="2">Nível 2 (Intermediário)</option>
                <option value="3">Nível 3 (Programado)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="horasSla">Prazo Corrido (SLA em Contrato - Horas) <span className={styles.required}>*</span></label>
              <input
                id="horasSla"
                type="number"
                placeholder="Ex: 4"
                value={horasSlaInput}
                onChange={(e) => setHorasSlaInput(e.target.value)}
                min="1"
                max="1000"
                disabled={loading}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="horasSomadas">Horas a serem somadas (Cálculo em Horário Comercial) <span className={styles.required}>*</span></label>
              <input
                id="horasSomadas"
                type="number"
                placeholder="Ex: 5"
                value={horasSomadasInput}
                onChange={(e) => setHorasSomadasInput(e.target.value)}
                min="1"
                max="1000"
                disabled={loading}
                required
              />
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
                {loading ? 'Processando...' : modalMode === 'create' ? 'Adicionar Regra' : 'Salvar Alterações'}
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
          <h1>⚙️ Regras de SLA</h1>
          <p>Gerencie o prazo corrido de contrato e as horas comerciais somadas no cálculo do SLA para cada nível.</p>
        </div>
        <button className={styles.btnAdd} onClick={handleOpenCreate}>
          ➕ Nova Regra SLA
        </button>
      </div>

      {error && <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>⚠️ {error}</div>}
      {success && <div className={`${styles.feedbackMessage} ${styles.feedbackSuccess}`}>✓ {success}</div>}

      <div className={styles.tableContainer}>
        {configs.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon}>⚙️</span>
            <h3>Nenhuma regra cadastrada</h3>
            <p>Adicione uma nova regra SLA clicando no botão acima.</p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Nível</th>
                <th>Prazo Corrido (SLA em Contrato)</th>
                <th>Horas a somar no Cálculo (Horário Comercial)</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const badge = getNivelLabel(config.nivel);
                return (
                  <tr key={config.id} className={styles.rowHover}>
                    <td>
                      <span className={`${styles.nivelBadge} ${badge.class}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <span className={styles.hoursText}>🕒 {config.horasSla} horas</span>
                    </td>
                    <td>
                      <span className={styles.hoursText} style={{ color: '#10b981' }}>📈 {config.horasSomadas} horas úteis</span>
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                        <button
                          className={styles.btnEdit}
                          onClick={() => handleOpenEdit(config)}
                          title="Editar regra"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(config.id, config.nivel)}
                          title="Excluir regra"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
