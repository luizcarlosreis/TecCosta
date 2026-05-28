import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientesClient from './ClientesClient';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('teccosta-session');
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/');
  }

  let sessionUser: { id: string; name: string; role: string };
  try {
    sessionUser = JSON.parse(sessionCookie.value) as { id: string; name: string; role: string };
  } catch (e) {
    redirect('/');
  }

  if (
    sessionUser.role !== 'ADMINISTRADOR' &&
    sessionUser.role !== 'TECCOSTA_GESTAO'
  ) {
    redirect('/dashboard');
  }
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
