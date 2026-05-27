'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { createUserAction, deleteUserAction, getUsersAction } from '@/app/actions/users';

interface SerializedUser {
  id: string;
  name: string;
  cpfCnpj: string;
  birthDate: string | null;
  phone: string | null;
  role: string;
  subRole: string | null;
  createdAt: string;
}

interface UsersClientProps {
  initialUsers: SerializedUser[];
}

// Helper functions for formatting and input masking
const formatCPF = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 11);
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9)}`;
};

const formatBirthDate = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 8);
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 4) return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`;
  return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}/${cleanValue.slice(4)}`;
};

const formatPhone = (value: string) => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 11);
  if (cleanValue.length <= 2) return cleanValue.length > 0 ? `(${cleanValue}` : '';
  if (cleanValue.length <= 7) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMINISTRADOR': return 'Administrador';
    case 'CONDOMINIO_EMPRESA': return 'Condomínio/Empresa';
    case 'TECNICO': return 'Técnico';
    case 'TECCOSTA_GESTAO': return 'TecCosta (Gestão)';
    case 'ADMINISTRADORA_CONDOMINIO': return 'Administradora do Condomínio';
    default: return role;
  }
};

const getAvatarBg = (role: string) => {
  switch (role) {
    case 'ADMINISTRADOR': return 'linear-gradient(135deg, #0284c7, #0369a1)';
    case 'CONDOMINIO_EMPRESA': return 'linear-gradient(135deg, #0f172a, var(--primary-color))';
    case 'TECNICO': return 'linear-gradient(135deg, #22c55e, #15803d)';
    case 'TECCOSTA_GESTAO': return 'linear-gradient(135deg, #a855f7, #7e22ce)';
    case 'ADMINISTRADORA_CONDOMINIO': return 'linear-gradient(135deg, #f59e0b, #d97706)';
    default: return 'var(--primary-color)';
  }
};

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<SerializedUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CONDOMINIO_EMPRESA');
  const [subRole, setSubRole] = useState('Síndico');

  // Request feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.cpfCnpj.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.subRole && user.subRole.toLowerCase().includes(query))
    );
  });

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfCnpj(formatCPF(e.target.value));
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDate(formatBirthDate(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validações simples
    if (cpfCnpj.length < 14) {
      setError('CPF inválido. Preencha completamente.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('cpfCnpj', cpfCnpj);
      formData.append('birthDate', birthDate);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('role', role);
      formData.append('subRole', role === 'CONDOMINIO_EMPRESA' ? subRole : '');

      const result = await createUserAction(formData);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess('Usuário cadastrado com sucesso!');
        
        // Obter lista atualizada do banco de dados
        const updated = await getUsersAction();
        if (updated.users) {
          setUsers(updated.users as unknown as SerializedUser[]);
        }

        // Limpar form
        setName('');
        setCpfCnpj('');
        setBirthDate('');
        setPhone('');
        setPassword('');
        setRole('CONDOMINIO_EMPRESA');
        setSubRole('Síndico');

        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess(null);
        }, 1500);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Erro de conexão ao enviar o formulário.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza de que deseja excluir o usuário "${name}"?`)) {
      try {
        const result = await deleteUserAction(id);
        if (result?.error) {
          alert(result.error);
        } else {
          // Remover do state local
          setUsers(users.filter((user) => user.id !== id));
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const getBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMINISTRADOR': return styles.roleAdmin;
      case 'CONDOMINIO_EMPRESA': return styles.roleCondo;
      case 'TECNICO': return styles.roleTecnico;
      case 'TECCOSTA_GESTAO': return styles.roleGestao;
      case 'ADMINISTRADORA_CONDOMINIO': return styles.roleAdminCondo;
      default: return '';
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Gestão de Usuários</h1>
          <p>Cadastre e administre as contas de acesso ao portal TecCosta.</p>
        </div>
        <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
          <span>➕</span> Novo Usuário
        </button>
      </div>

      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar por nome, CPF ou perfil..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>👥</span>
          <h3>Nenhum usuário encontrado</h3>
          <p>{searchQuery ? 'Tente ajustar os termos da pesquisa.' : 'Cadastre um novo usuário para iniciar.'}</p>
        </div>
      ) : (
        <div className={styles.tableContainer + ' glass'}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Data de Nascimento</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={styles.userRow}>
                  <td>
                    <div className={styles.userInfo}>
                      <div
                        className={styles.userAvatar}
                        style={{ background: getAvatarBg(user.role) }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userCpf}>CPF: {user.cpfCnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                    {user.role === 'CONDOMINIO_EMPRESA' && user.subRole && (
                      <span className={styles.subRoleBadge}>{user.subRole}</span>
                    )}
                  </td>
                  <td>
                    {user.birthDate ? (
                      <span className={styles.dateText}>{user.birthDate}</span>
                    ) : (
                      <span className={styles.emptyValue}>Não informado</span>
                    )}
                  </td>
                  <td>
                    {user.phone ? (
                      <span className={styles.phoneText}>{user.phone}</span>
                    ) : (
                      <span className={styles.emptyValue}>Não informado</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        className={styles.btnDelete}
                        onClick={() => handleDelete(user.id, user.name)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent + ' glass'}>
            <h2>Cadastrar Novo Usuário</h2>
            <p className={styles.modalSubtitle}>Preencha os campos abaixo para registrar um usuário no sistema.</p>

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
                  <label htmlFor="name">
                    Nome Completo <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Ex: Luiz Carlos Reis"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cpfCnpj">
                    CPF <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="cpfCnpj"
                    placeholder="000.000.000-00"
                    value={cpfCnpj}
                    onChange={handleCpfChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">
                    Senha de Acesso <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="birthDate">Data de Nascimento</label>
                  <input
                    type="text"
                    id="birthDate"
                    placeholder="DD/MM/AAAA"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Telefone</label>
                  <input
                    type="text"
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="role">
                    Perfil de Acesso <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="CONDOMINIO_EMPRESA">Condomínio/Empresa</option>
                    <option value="TECNICO">Técnico</option>
                    <option value="TECCOSTA_GESTAO">TecCosta (Gestão)</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="ADMINISTRADORA_CONDOMINIO">Administradora do Condomínio</option>
                  </select>
                </div>

                {role === 'CONDOMINIO_EMPRESA' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="subRole">
                      Função no Condomínio <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="subRole"
                      value={subRole}
                      onChange={(e) => setSubRole(e.target.value)}
                      required
                      disabled={loading}
                    >
                      <option value="Síndico">Síndico</option>
                      <option value="Zelador">Zelador</option>
                      <option value="Conselheiro">Conselheiro</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
