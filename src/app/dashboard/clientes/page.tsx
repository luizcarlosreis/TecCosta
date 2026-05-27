import { prisma } from '@/app/lib/prisma';
import ClientesClient from './ClientesClient';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  // Buscar clientes do banco de dados com seus gestores vinculados
  const clients = await prisma.client.findMany({
    include: {
      managers: {
        select: {
          id: true,
          name: true,
          cpfCnpj: true,
          role: true,
          subRole: true,
        },
      },
    },
    orderBy: {
      clientCode: 'asc',
    },
  });

  // Buscar usuários com perfil de Condomínio/Empresa ou Administradora disponíveis para vinculação
  const eligibleManagers = await prisma.user.findMany({
    where: {
      role: {
        in: ['CONDOMINIO_EMPRESA', 'ADMINISTRADORA_CONDOMINIO'],
      },
    },
    select: {
      id: true,
      name: true,
      cpfCnpj: true,
      role: true,
      subRole: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Serializar objetos para trafegar com segurança pela fronteira de Server/Client Component
  const serializedClients = JSON.parse(JSON.stringify(clients));
  const serializedManagers = JSON.parse(JSON.stringify(eligibleManagers));

  return (
    <ClientesClient
      initialClients={serializedClients}
      eligibleManagers={serializedManagers}
    />
  );
}
