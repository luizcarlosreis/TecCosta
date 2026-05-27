import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SolicitacaoClient from './SolicitacaoClient';

export const dynamic = 'force-dynamic';

export default async function SolicitacaoPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('teccosta-session');
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/');
  }

  let sessionUser;
  try {
    sessionUser = JSON.parse(sessionCookie.value) as { id: string; name: string; role: string };
  } catch (e) {
    redirect('/');
  }

  // 1. Carregar chamados/solicitações correspondentes
  let requests: any[] = [];
  if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
    // Filtrar chamados vinculados ao gestor logado
    const managedClients = await prisma.client.findMany({
      where: { managers: { some: { id: sessionUser.id } } },
      select: { id: true }
    });
    const clientIds = managedClients.map(c => c.id);

    requests = await prisma.maintenanceRequest.findMany({
      where: { clientId: { in: clientIds } },
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    // Admins e Gestão veem tudo
    requests = await prisma.maintenanceRequest.findMany({
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 2. Carregar a lista de todos os clientes (para Administradores abrirem chamado)
  const allClients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, cnpj: true }
  });

  // 3. Carregar o condomínio/empresa específico do gestor logado
  let userClients: { id: string; name: string }[] = [];
  if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
    userClients = await prisma.client.findMany({
      where: { managers: { some: { id: sessionUser.id } } },
      select: { id: true, name: true }
    });
  }

  // Serialização de dados
  const serializedRequests = JSON.parse(JSON.stringify(requests));
  const serializedClients = JSON.parse(JSON.stringify(allClients));
  const serializedUserClients = JSON.parse(JSON.stringify(userClients));

  return (
    <SolicitacaoClient
      initialRequests={serializedRequests}
      allClients={serializedClients}
      userClients={serializedUserClients}
      sessionUser={sessionUser}
    />
  );
}
