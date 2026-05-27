import { prisma } from '@/app/lib/prisma';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function TecnicosPage() {
  // Buscar usuários cujo perfil seja técnico no banco de dados
  const tecnicos = await prisma.user.findMany({
    where: {
      role: 'TECNICO',
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Equipe Técnica</h1>
          <p>
            Esta é a listagem oficial dos técnicos credenciados da TecCosta cadastrados no sistema.
          </p>
        </div>
      </div>

      {tecnicos.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>🛠️</span>
          <h3>Nenhum técnico encontrado</h3>
          <p>Cadastre um usuário com o perfil de "Técnico" no módulo de Gestão de Usuários.</p>
        </div>
      ) : (
        <div className={styles.tableContainer + ' glass'}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>Telefone</th>
                <th>Data de Nascimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map((tecnico) => (
                <tr key={tecnico.id} className={styles.userRow}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {tecnico.name.charAt(0)}
                      </div>
                      <div>
                        <div className={styles.userName}>{tecnico.name}</div>
                        <div className={styles.userCpf}>CPF: {tecnico.cpfCnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {tecnico.phone ? (
                      <span className={styles.phoneText}>{tecnico.phone}</span>
                    ) : (
                      <span className={styles.emptyValue}>Não informado</span>
                    )}
                  </td>
                  <td>
                    {tecnico.birthDate ? (
                      <span className={styles.dateText}>{tecnico.birthDate}</span>
                    ) : (
                      <span className={styles.emptyValue}>Não informado</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.statusCell}>
                      <span className={styles.statusDot}></span>
                      Ativo
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
